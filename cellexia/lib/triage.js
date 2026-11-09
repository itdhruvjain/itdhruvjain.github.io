// Support triage: detect intent, find the order, check policy, draft a reply.
// Pure functions, no DOM. Ported from the Ops Hub demo's engine.js and made testable:
// time windows are measured from the order's delivery to when the email arrived.

const H = 36e5, D = 864e5;

/** Keyword signals per intent. Each pattern that matches counts as one hit. */
export const INTENTS = {
  wismo: { label: 'Where is my order', patterns: [/where is/, /tracking/, /hasn.t moved|not moved|stopped moving/, /not (arrived|received)|still waiting/] },
  damaged: { label: 'Damaged item', patterns: [/broken|damaged|cracked|crushed/, /leak/, /nothing comes out|doesn.t work|does not work/, /photo/] },
  wrong_item: { label: 'Wrong item', patterns: [/wrong (item|product|one)/, /instead/, /ordered .* but (received|got)/, /not what i ordered/] },
  duties: { label: 'Import fees', patterns: [/fedex|dhl|ups|courier/, /charged|pa(y|id) extra/, /customs|dut(y|ies)|import (fee|tax)/] },
  refund: { label: 'Return / refund', patterns: [/refund/, /money back|return (it|this)|send it back/, /no (results|change|difference)|(don.t|didn.t) see (a|any) (difference|change|results)/] },
  product_q: { label: 'Product question', patterns: [/can i use|is it safe|how (often|do i|to)/, /retinol|sensitive|pregnan|ingredient|spf/] },
};

/** Score every intent and return the best one with a confidence between 0 and 1. */
export function detectIntent(text) {
  const b = text.toLowerCase();
  const scored = Object.entries(INTENTS)
    .map(([key, def]) => ({ key, label: def.label, hits: def.patterns.filter(p => p.test(b)).length }))
    .sort((a, z) => z.hits - a.hits);
  const [top, second] = scored;
  if (!top.hits) return { key: 'unknown', label: 'Unclear', hits: 0, confidence: 0.15 };
  const confidence = Math.min(0.97, 0.45 + 0.17 * top.hits - 0.12 * second.hits);
  return { key: top.key, label: top.label, hits: top.hits, confidence: Math.round(confidence * 100) / 100 };
}

/** Find the order by number in the email, otherwise by the sender's address. */
export function findOrder(email, orders) {
  const m = (email.subj + ' ' + email.body).match(/CX-DEMO-\d+/i);
  if (m) {
    const o = orders.find(x => x.id.toLowerCase() === m[0].toLowerCase());
    if (o) return { order: o, via: 'order number' };
  }
  const byEmail = orders.filter(x => x.email === email.email).sort((a, z) => (z.shippedAt || 0) - (a.shippedAt || 0))[0];
  return byEmail ? { order: byEmail, via: 'sender’s email' } : { order: null, via: null };
}

/** Whole days between delivery and the email (day 1 = the day after delivery). */
export const daysSinceDelivery = (order, at) => order.deliveredAt ? Math.floor((at - order.deliveredAt) / D) : null;
export const hoursSinceDelivery = (order, at) => order.deliveredAt ? Math.floor((at - order.deliveredAt) / H) : null;

export function guaranteeCheck(order, at, policy) {
  const day = daysSinceDelivery(order, at);
  if (day === null) return { ok: false, label: 'Not delivered yet, so the guarantee clock hasn’t started', rule: `Money-back guarantee: ${policy.guaranteeDays} days from delivery` };
  const ok = day <= policy.guaranteeDays;
  return { ok, day, label: `${ok ? 'Within' : 'Outside'} ${policy.guaranteeDays}-day guarantee: day ${day}`, rule: `Money-back guarantee: ${policy.guaranteeDays} days from delivery` };
}

export function damageCheck(order, at, policy) {
  const hrs = hoursSinceDelivery(order, at);
  if (hrs === null) return { ok: false, label: 'No delivery scan on record', rule: `Damage reported within ${policy.damageHours} hours of delivery (assumed rule, to confirm)` };
  const ok = hrs <= policy.damageHours;
  return { ok, hours: hrs, label: `Reported ${hrs}h after delivery: ${ok ? 'within' : 'outside'} the ${policy.damageHours}-hour window`, rule: `Damage reported within ${policy.damageHours} hours of delivery (assumed rule, to confirm)` };
}

const SIG = '\n\nWarm wishes,\nThe Cellexia team';
const firstName = s => s.split(' ')[0];
const product = o => o.items.replace(/ ×\d+.*$/, '');
const returnNumber = (o, emailId) => 'RAN-' + o.id.replace(/\D/g, '') + '-' + (1000 + emailId * 37);

/**
 * Full triage of one email.
 * ctx = { orders, policy, lanes (code → lane), nonEu (Set) }
 * Returns intent, confidence, order, checks [{ok: true|false|null, label, rule}], route, actions, draft.
 */
export function triage(email, ctx) {
  const { orders, policy, lanes, nonEu } = ctx;
  const at = email.receivedAt;
  const intent = detectIntent(email.subj + ' ' + email.body);
  const { order: o, via } = findOrder(email, orders);
  const lane = o ? lanes[o.country] : null;
  const first = firstName(email.from);
  const checks = [];
  let actions = [], draft = '', tone = 'info';

  let confidence = intent.confidence;
  if (!o) confidence = Math.round(confidence * 0.75 * 100) / 100;
  if (o) checks.push({ ok: true, label: `Order ${o.id} found by ${via}`, rule: 'Shopify order lookup' });
  else checks.push({ ok: false, label: 'No matching order for this sender', rule: 'Shopify order lookup by number, then by email' });

  const lowConfidence = confidence < policy.minConfidence;
  if (lowConfidence || intent.key === 'unknown') {
    return {
      intent, confidence, order: o, lane, tone: 'mute', route: 'person',
      reason: `Confidence ${Math.round(confidence * 100)}% is below the ${Math.round(policy.minConfidence * 100)}% threshold, so no reply is drafted. A person picks this up.`,
      checks, actions: [{ label: 'Assign to a person', done: 'Assigned to the support queue' }], draft: '',
    };
  }

  const needsOrder = intent.key !== 'product_q';
  if (needsOrder && !o) {
    return { intent, confidence, order: null, lane: null, tone: 'mute', route: 'person',
      reason: 'The request needs an order, and none matches the sender. A person asks for the order number.',
      checks, actions: [{ label: 'Assign to a person', done: 'Assigned to the support queue' }], draft: '' };
  }

  switch (intent.key) {
    case 'wismo': {
      const shipped = Math.floor((at - o.shippedAt) / D);
      const late = shipped > lane.max;
      const scan = o.lastScanAt ? Math.floor((at - o.lastScanAt) / D) : null;
      tone = late ? 'bad' : 'info';
      checks.push({ ok: !late, label: `Shipped ${shipped} days ago; promise to ${lane.name} is ${lane.min}–${lane.max} days`, rule: `Delivery promise ${lane.name}: ${lane.min}–${lane.max} days (assumed from shipping page)` });
      if (scan !== null) checks.push({ ok: scan <= lane.stuckLimit, label: `Last carrier scan ${scan} days ago (limit ${lane.stuckLimit})`, rule: 'Stuck-parcel rule: no scan for more than the lane limit' });
      actions = [{ label: 'Open carrier claim', done: `Carrier claim opened for ${o.id}` }, { label: 'Reship now', done: 'Replacement order queued' }];
      draft = `Hi ${first},\n\nThank you for your patience, and I’m sorry your order is taking longer than the ${lane.min}–${lane.max} days we aim for to ${lane.name}. Your parcel hasn’t had a tracking update for a few days, so we’ve asked the carrier to look into it today.\n\nIf it hasn’t moved within 2 working days, we’ll send a replacement at no cost. You don’t need to do anything; we’ll email you either way.${SIG}`;
      break;
    }
    case 'damaged': {
      const c = damageCheck(o, at, policy);
      checks.push(c);
      tone = c.ok ? 'warn' : 'bad';
      if (c.ok) {
        actions = [{ label: 'Send replacement', done: 'Replacement queued, no charge' }, { label: 'Refund instead', done: `Refund of ${o.total} queued for approval` }];
        draft = `Hi ${first},\n\nI’m so sorry your ${product(o)} arrived damaged, and thank you for the photo. We’re sending a replacement today at no cost, and you’ll get a tracking link by email shortly. There’s no need to return the damaged one.${SIG}`;
      } else {
        actions = [{ label: 'Escalate to lead', done: 'Sent to the support lead' }];
        draft = `Hi ${first},\n\nI’m sorry your ${product(o)} isn’t working as it should. Could you send a photo of the product and the outer box? Once I have it, I’ll check what we can do. Your order is still covered by our ${policy.guaranteeDays}-day money-back guarantee.${SIG}`;
      }
      break;
    }
    case 'wrong_item': {
      tone = 'warn';
      checks.push({ ok: true, label: `Ordered: ${o.items}${o.receivedItem ? `; customer received ${o.receivedItem}` : ''}`, rule: 'Order line items vs customer report' });
      checks.push({ ok: null, label: `Pick error logged against ${o.site}`, rule: 'Every pick error is counted per 3PL site' });
      checks.push(guaranteeCheck(o, at, policy));
      actions = [{ label: 'Send correct item', done: 'Correct item queued with priority shipping' }, { label: 'Open 3PL ticket', done: `Pick-error ticket opened with ${o.site}` }];
      draft = `Hi ${first},\n\nI’m sorry, that’s our mistake. We’re sending the ${product(o)} you ordered today with priority shipping, and you’ll get the tracking link by email.${o.receivedItem ? ` Please keep the ${o.receivedItem} with our compliments.` : ''}${SIG}`;
      break;
    }
    case 'duties': {
      tone = 'warn';
      const outside = nonEu.has(o.country);
      checks.push({ ok: null, label: outside ? `${lane.name} is outside the EU: the courier collects import fees on delivery` : `${lane.name} is in the EU: no import fees expected`, rule: 'Assumption: non-EU orders ship duties-unpaid' });
      checks.push({ ok: false, label: 'No fee notice was shown at checkout or in the shipping email', rule: 'Duties notice (planned in week 2)' });
      actions = [{ label: 'Offer goodwill credit', done: 'Goodwill credit queued for approval' }, { label: 'Tag for duties report', done: 'Added to the weekly duties report' }];
      draft = `Hi ${first},\n\nI’m really sorry about the surprise. For orders to ${lane.name}, the courier collects local import fees on delivery, and we should have told you clearly before you ordered. That’s on us.\n\nWe’d like to put a credit toward the fee on your account. We’re also adding a fee estimate to our checkout so no one else is caught out.${SIG}`;
      break;
    }
    case 'refund': {
      const g = guaranteeCheck(o, at, policy);
      checks.push(g);
      const sting = /sting|burn|irritat|tingl/.test(email.body.toLowerCase());
      if (sting) checks.push({ ok: null, label: 'Mentions stinging: menthol theme, add application tip', rule: 'Customer-voice theme: menthol irritation' });
      tone = g.ok ? 'info' : 'bad';
      if (g.ok) {
        const ran = returnNumber(o, email.id);
        actions = [{ label: `Issue ${ran}`, done: `Return number ${ran} created` }, { label: 'Refund without return', done: `Refund of ${o.total} queued for approval` }];
        draft = `Hi ${first},\n\nI’m sorry the ${product(o)} wasn’t right for you, and thank you for giving it a try. It was delivered ${g.day} days ago, so you’re within our ${policy.guaranteeDays}-day guarantee and a full refund is no problem.\n\nYour return number is ${ran}. Please send the product back with this number inside, using a tracked service. We’ll refund ${o.total} to your original payment method within ${policy.refundTiming} of receiving it.` + (sting ? `\n\nAbout the stinging: the cooling feeling comes from menthol. If you try it again, apply it to the outer eye area only and keep it away from the eye itself.` : '') + SIG;
      } else {
        actions = [{ label: 'Offer 20% off next order', done: 'One-time 20% code created for approval' }, { label: 'Escalate to lead', done: 'Sent to the support lead for a decision' }];
        draft = `Hi ${first},\n\nThank you for using it so consistently, and I’m sorry it didn’t give you the results you hoped for. Our money-back guarantee covers ${policy.guaranteeDays} days from delivery, and your order arrived ${g.day} days ago, so it’s just outside that window.\n\nI’d still like to help. I can offer you 20% off your next order, or suggest a product that may suit you better if you tell me what you were hoping to improve.${SIG}`;
      }
      break;
    }
    default: { // product_q
      tone = 'good';
      if (o) checks.push({ ok: true, label: `Order ${o.id} is ${o.deliveredAt ? 'delivered' : 'in transit'}; no order action needed`, rule: 'Order status' });
      checks.push({ ok: null, label: 'Answer comes from the approved product FAQ; skin questions get a specialist check', rule: 'No medical advice in drafts' });
      actions = [{ label: 'Send to skincare specialist', done: 'Forwarded to the specialist queue' }];
      draft = `Hi ${first},\n\nGreat question. Many people use the serum alongside a retinol. We suggest retinol at night and the serum in the morning at first, so you can see how your skin responds, and keeping both away from the eye itself.\n\nIf your skin is sensitive, start every other day.${SIG}`;
    }
  }
  return { intent, confidence, order: o, lane, tone, route: 'draft', reason: 'Draft ready. Nothing is sent until a person approves it.', checks, actions, draft };
}
