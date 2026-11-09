// Guided tour of one morning at Cellexia. The reader goes at their own pace (Back / Next).
// Every "Try it" control runs the same rules the hub uses, so what they see is the real logic.
import { POLICY, LANE, NON_EU } from '../data/policy.js';
import { DUTY_MARKETS, DEFAULT_VALUE } from '../data/duties.js';
import { triage, guaranteeCheck } from '../lib/triage.js';
import { parcelStatus } from '../lib/lanes.js';
import { isSpike, spikeRatio, roas, suggestedCap, SPIKE_THRESHOLD } from '../lib/ads.js';
import { landedCost } from '../lib/duties.js';
import { tagTheme } from '../lib/voice.js';
import { createTour } from '../lib/tour.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const D = 864e5, H = 36e5;

/* ---------------- tiny line icons for the flow diagrams ---------------- */
const P = {
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  hub: '<path d="M12 2.5 20.5 7v10L12 21.5 3.5 17V7z"/><circle cx="12" cy="12" r="3"/>',
  store: '<path d="M5 8h14l-1.2 12H6.2z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="m8 12.5 2.8 2.8L16.5 9"/>',
  pen: '<path d="M4 20h4L19.5 8.5l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  person: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3.2 3.2 3.2 14.8 0 18M12 3c-3.2 3.2-3.2 14.8 0 18"/>',
  truck: '<path d="M2 6h11v10H2zM13 9.5h4.5L21 13v3h-8z"/><circle cx="6" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
  chart: '<path d="M3 20h18M6 20v-6M11 20V6M16 20v-9"/>',
  bell: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  star: '<path d="m12 3 2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.8l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z"/>',
};
const icon = k => `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${P[k]}</svg>`;

export function mountTour(el, { S, now, ctx, onResult, track = () => {}, toast = () => {} }) {
  /* ---------------- story data (invented, built through the real libs) ---------------- */
  const helenOrder = S.orders.find(o => o.id === 'CX-DEMO-10612') || { id: 'CX-DEMO-10612', email: 'helen.w@example.com', country: 'UK', items: 'Neck Tightening Cream ×1', total: '£58.00', shippedAt: new Date(now - 15 * D), deliveredAt: new Date(now - 12 * D), carrier: 'DPD', site: '3PL-EU-1' };
  const spikeAd = S.ads.find(a => a.n === 'ELS_US_Video_60Day_V4');
  const themeOf = k => S.themes.find(t => t.key === k);
  const weekCount = t => t.trend.at(-1);

  // Values the reader changes with the "Try it" controls.
  const st = {
    refundDay: 12, country: 'US', shipDays: 8, scanDays: 2, spend: spikeAd.today,
    review: 'Burned around my eyes, I had to stop using it.',
  };

  const helenMail = day => ({ id: 9, from: 'Helen W.', email: 'helen.w@example.com', receivedAt: now, subj: 'Return the neck cream?', body: 'Hi, the neck cream isn’t for me. Can I send it back for a refund? Order CX-DEMO-10612.' });
  const helenTriage = day => triage(helenMail(day), { ...ctx, orders: [{ ...helenOrder, deliveredAt: new Date(now - day * D - H) }] });
  const caParcel = () => ({ o: 'CX-DEMO-10399', m: 'CA', carrier: 'FedEx', last: 'Arrived at sort facility', shippedAt: new Date(now - st.shipDays * D - H), lastScanAt: new Date(now - st.scanDays * D - H) });

  /* ---------------- reusable bits ---------------- */
  const card = (who, sub, body) => `<div class="cx-t-mail"><div class="cx-t-mail-h"><span class="cx-t-av" aria-hidden="true">${esc(who[0])}</span><div><b>${esc(who)}</b><span class="cx-small">${esc(sub)}</span></div></div><p>${body}</p></div>`;
  const compare = (before, after) => `<div class="cx-t-cmp"><div class="cx-t-before"><span class="cx-t-cmp-h">Today, by hand</span><p>${before}</p></div><div class="cx-t-arrow" aria-hidden="true">→</div><div class="cx-t-after"><span class="cx-t-cmp-h">With the hub</span><p>${after}</p></div></div>`;
  const facts = rows => `<dl class="cx-t-facts">${rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${v}</dd></div>`).join('')}</dl>`;
  const verdict = (tone, big, small) => `<div class="cx-t-verdict cx-${tone}"><b>${big}</b>${small ? `<span>${small}</span>` : ''}</div>`;

  /* ---------------- chapters ---------------- */
  const CHAPTERS = [
    {
      key: 'refund', short: 'Refund request', tab: 'support', tabName: 'Support inbox',
      nodes: [['mail', 'Customer email'], ['hub', 'Hub reads it'], ['store', 'Finds the order'], ['check', '60-day rule'], ['pen', 'Drafts reply'], ['person', 'You approve']],
      how: { trigger: 'New email or helpdesk ticket (helpdesk webhook; tool to confirm)', system: 'Ops service: intent detection, Shopify order lookup, 60-day rule from config', api: 'Shopify Admin GraphQL orders(query: "name:CX-…") · helpdesk API: create draft', approve: 'A support agent approves, edits or escalates every reply' },
      steps: [
        { at: 0, title: 'A customer asks for her money back',
          text: 'It’s 7:40 in the morning. Helen in the UK writes in to say the neck cream isn’t for her.',
          body: () => card('Helen W.', 'helen.w@example.com · just now', 'Hi, the neck cream isn’t for me. Can I send it back for a refund? Order CX-DEMO-10612.') },
        { at: 2, title: 'The hub finds her order by itself',
          text: 'It reads the email, spots the order number and pulls the order from Shopify. Nobody has to copy and paste between tabs.',
          body: () => facts([['Order', `<span class="cx-mono">${helenOrder.id}</span>`], ['Product', esc(helenOrder.items)], ['Paid', esc(helenOrder.total)], ['Delivered', '12 days ago']]) },
        { at: 3, title: 'It checks your 60-day guarantee', try: true,
          text: 'This is the rule your team checks by hand today. Drag the slider to see what happens on different days.',
          body: () => `<label class="cx-t-lab" for="cx-t-day">Days since the parcel was delivered: <output id="cx-t-day-o">${st.refundDay}</output></label>
            <input type="range" id="cx-t-day" min="1" max="90" value="${st.refundDay}" data-k="refundDay">
            <div class="cx-t-zone" aria-hidden="true"><i style="width:${POLICY.guaranteeDays / 90 * 100}%"></i><span>Guarantee: ${POLICY.guaranteeDays} days</span><b data-out="mark"></b></div>
            <div data-out="main" aria-live="polite"></div>`,
          out: { main: () => { const g = guaranteeCheck({ deliveredAt: new Date(now - st.refundDay * D - H) }, now, POLICY); return g.ok
              ? verdict('good', `✓ Day ${g.day} of ${POLICY.guaranteeDays}: refund approved`, `A return number is created and a reply is drafted.`)
              : verdict('bad', `✗ Day ${g.day}: outside the ${POLICY.guaranteeDays}-day guarantee`, 'The hub drafts a kind “sorry, but here’s an offer” reply and flags it for a person to decide.'); },
            mark: m => { m.style.left = `calc(${st.refundDay / 90 * 100}% - 1px)`; return ''; } } },
        { at: 5, title: 'It writes the reply. A person approves it',
          text: 'The draft uses only facts from the order and your policy. Nothing is sent until someone on your team clicks Approve.',
          body: () => `<label class="cx-vh" for="cx-t-draft">Drafted reply</label><textarea id="cx-t-draft" rows="7" readonly>${esc(helenTriage(st.refundDay).draft)}</textarea>
            <div class="cx-acts"><button type="button" class="cx-btn" data-demo="Approved. In real life this sends from your helpdesk.">Approve &amp; send</button><span class="cx-small">Demo button. Nothing is sent.</span></div>
            ${compare('Open the email, find the order in Shopify, count the days, write a reply. About 6–8 minutes each (my estimate).', 'Read the draft and click Approve. About a minute.')}` },
      ],
    },
    {
      key: 'order', short: 'Order to the US', tab: 'delivery', tabName: 'Delivery',
      nodes: [['store', 'New order'], ['hub', 'Hub checks it'], ['globe', 'Where is it going?'], ['mail', 'Heads-up email'], ['person', 'Customer']],
      how: { trigger: 'Shopify orders/create webhook', system: 'Ops service checks the shipping country against the duty table', api: 'Email tool event, e.g. Klaviyo POST /api/events "Duties notice" (tool to confirm)', approve: 'Ops approves the email template once; then it sends per order' },
      steps: [
        { at: 0, title: 'A new order comes in from the US',
          text: 'Shopify tells the hub the moment an order is placed, at any hour.',
          body: () => facts([['Order', '<span class="cx-mono">CX-DEMO-10650</span>'], ['Product', 'Deep Wrinkle Filler Gel ×1'], ['Paid', '$89.00'], ['Ship to', 'United States']]) },
        { at: 2, title: 'Will the courier ask for import fees?', try: true,
          text: 'Inside the EU, parcels arrive with nothing more to pay. Outside it, the courier may ask for duties at the door (my assumption, based on reviews). Pick a country.',
          body: () => `<div class="cx-t-pills" role="group" aria-label="Ship to">${['DE', 'FR', 'IE', 'UK', 'US', 'CA', 'AU'].map(c => `<button type="button" class="cx-t-pill" data-country="${c}" aria-pressed="${st.country === c}">${esc(LANE[c].name)}</button>`).join('')}</div><div data-out="main" aria-live="polite"></div>`,
          out: { main: () => {
            if (!NON_EU.has(st.country)) return verdict('good', `✓ ${esc(LANE[st.country].name)} is in the EU`, 'No import fees expected. Nothing to do.');
            const m = DUTY_MARKETS[st.country], v = DEFAULT_VALUE[st.country], c = landedCost(m, v);
            return verdict('warn', `! The courier may ask for about ${m.cur}${Math.round(c.atDoor)} at the door`, `On a ${m.cur}${v} order, that’s ${c.surprise}% more than they paid. Illustrative rates. The hub sends a heads-up.`);
          } } },
        { at: 3, title: 'The customer hears it from you first',
          text: 'A short, friendly email goes out before the parcel arrives, so the charge isn’t a surprise.',
          body: () => { const c = NON_EU.has(st.country) ? st.country : 'US'; const m = DUTY_MARKETS[c]; const est = Math.round(landedCost(m, DEFAULT_VALUE[c]).atDoor);
            return (NON_EU.has(st.country) ? '' : '<p class="cx-small">You picked an EU country, so no email is needed. Here’s the US version.</p>') +
              card('The Cellexia team', `to the customer · ${esc(LANE[c].name)}`, `Your order is on its way! One thing to know: for deliveries to ${esc(LANE[c].name)}, the courier may ask for local import fees of around ${m.cur}${est} before handing over your parcel. We wanted you to hear it from us first.`); } },
        { at: 4, title: 'Why it matters',
          text: 'Surprise fees are the number one complaint in public reviews. Telling people up front turns an angry 1-star review into a cost they expected.',
          body: () => compare('The customer finds out at the door, then writes a review or a ticket.', 'A heads-up email the same day. Later, show fees at checkout or prepay them (see <a href="#duties">the duties section</a>).') },
      ],
    },
    {
      key: 'parcel', short: 'Late parcel', tab: 'delivery', tabName: 'Delivery',
      nodes: [['truck', 'Carrier scan'], ['hub', 'Morning check'], ['clock', 'Promise check'], ['mail', 'Delay email'], ['person', 'Customer']],
      how: { trigger: 'AfterShip tracking webhook, plus a scheduled morning check', system: 'Promise and stuck-scan rules per lane (lib/lanes.js)', api: 'AfterShip Tracking API: GET /trackings · webhook tracking_update', approve: 'Ops approves the delay email' },
      steps: [
        { at: 0, title: 'Every morning, the hub checks every parcel',
          text: 'It reads the carrier’s tracking for every parcel still on its way. This one is going to Canada, where you promise 5–7 days (my reading of the shipping page).',
          body: () => `<div data-out="line"></div>`, out: { line: () => timeline() } },
        { at: 2, title: 'Is it late, or stuck?', try: true,
          text: 'Two simple rules. Has it gone past the promised days? Has the carrier gone quiet for too long? Try both sliders.',
          body: () => `<label class="cx-t-lab" for="cx-t-ship">Days since it shipped: <output id="cx-t-ship-o">${st.shipDays}</output></label>
            <input type="range" id="cx-t-ship" min="1" max="12" value="${st.shipDays}" data-k="shipDays">
            <label class="cx-t-lab" for="cx-t-scan">Days since the carrier last scanned it: <output id="cx-t-scan-o">${st.scanDays}</output></label>
            <input type="range" id="cx-t-scan" min="0" max="6" value="${st.scanDays}" data-k="scanDays">
            <div data-out="line"></div><div data-out="main" aria-live="polite"></div>`,
          out: { line: () => timeline(), main: () => { const p = parcelStatus(caParcel(), LANE.CA, now);
            if (p.stuck) return verdict('bad', `✗ Stuck: no scan for ${p.sinceScan} days (limit ${p.limit})`, 'The hub drafts a delay email and suggests opening a carrier claim.');
            if (p.pastPromise) return verdict('warn', `! Late: day ${p.sinceShip}, the promise was ${LANE.CA.min}–${LANE.CA.max} days`, 'The hub drafts a delay email before the customer writes in.');
            return verdict('good', '✓ On track', 'Nothing to do. The hub checks again tomorrow.'); } } },
        { at: 3, title: 'It writes before the customer does',
          text: 'If either rule trips, the hub drafts an honest delay email for a person to approve.',
          body: () => card('The Cellexia team', 'to the customer · Canada', 'Quick update on your order: it’s taking longer than the 5–7 days we aim for, and we’re sorry. We’ve asked the courier to check on it today. If it hasn’t moved in 2 working days, we’ll send a replacement at no cost.') },
        { at: 4, title: 'Fewer “where is my order?” emails',
          text: 'Customers who hear from you first rarely need to chase.',
          body: () => compare('The customer emails “where is my order?”, an agent checks tracking and replies. Often a day later.', 'The apology arrives first. Agents only handle the parcels that need a decision.') },
      ],
    },
    {
      key: 'ad', short: 'Ad overspend', tab: 'ads', tabName: 'Ads',
      nodes: [['chart', 'Ad spend'], ['hub', 'Morning check'], ['check', 'Spike rule'], ['store', 'Real sales'], ['bell', 'Slack alert']],
      how: { trigger: 'Scheduler, every morning at 07:00 Dublin time', system: `Spike rule (≥${SPIKE_THRESHOLD}× the 7-day average) and ROAS on UTM-matched Shopify sales`, api: 'Meta Marketing API /insights · Google Ads API · Slack chat.postMessage', approve: 'The media buyer decides. Budgets are never changed automatically.' },
      steps: [
        { at: 0, title: 'Every morning, the hub reads the ad spend',
          text: `From Meta and YouTube, for every ad. Here’s one YouTube ad: its last 7 days, and today.`,
          body: () => `<div data-out="bars"></div>`, out: { bars: () => bars() } },
        { at: 2, title: 'Is this ad suddenly spending too much?', try: true,
          text: `The rule: flag any ad spending ${SPIKE_THRESHOLD}× (or more) its usual day. Drag today’s spend.`,
          body: () => `<label class="cx-t-lab" for="cx-t-spend">Spend today: €<output id="cx-t-spend-o">${st.spend}</output></label>
            <input type="range" id="cx-t-spend" min="60" max="500" value="${st.spend}" data-k="spend">
            <div data-out="bars"></div><div data-out="main" aria-live="polite"></div>`,
          out: { bars: () => bars(), main: () => { const a = { ...spikeAd, today: st.spend }; const r = spikeRatio(a).toFixed(1);
            return isSpike(a) ? verdict('warn', `! ${r}× the usual day: alert the media buyer`, `Suggested cap: €${suggestedCap(a)} a day.`) : verdict('good', `✓ ${r}× the usual day: normal`, 'No alert. Nobody is disturbed.'); } } },
        { at: 3, title: 'Then it checks real sales',
          text: 'Ad platforms estimate their own results. The hub counts actual Shopify orders that came from the ad, so the numbers match the money in the bank.',
          body: () => `<div class="cx-t-eq"><div><span>Spend, 7 days</span><b>€${spikeAd.spend.toLocaleString('en-GB')}</b></div><i aria-hidden="true">→</i><div><span>Shopify sales from it</span><b>€${spikeAd.rev.toLocaleString('en-GB')}</b></div><i aria-hidden="true">=</i><div class="cx-t-eq-r"><span>Return per €1</span><b>€${roas(spikeAd).toFixed(2)}</b></div></div>
            <p class="cx-small">Below an illustrative €2.50 target, so the alert says so.</p>` },
        { at: 4, title: 'The media buyer gets a short message',
          text: 'One Slack note with the facts and a suggestion. The hub never changes budgets by itself.',
          body: () => { const a = { ...spikeAd, today: Math.max(st.spend, Math.ceil(spikeAd.avg7 * SPIKE_THRESHOLD)) };
            return `<div class="cx-slack" role="img" aria-label="Example Slack message"><span class="cx-slack-a" aria-hidden="true">OB</span><div><b>Ops bot</b> <span class="cx-small">#ads · 07:02</span><p>⚠️ <span class="cx-mono">${esc(spikeAd.n)}</span> spent <b>€${a.today}</b> today, ${spikeRatio(a).toFixed(1)}× its usual day. Return on Shopify sales is <b>€${roas(spikeAd).toFixed(1)} per €1</b>. Suggested cap: <b>€${suggestedCap(a)}/day</b>. Nothing has been changed.</p></div></div>
            ${compare('A VA builds the ads report in a spreadsheet each week, so a spike can run for days before anyone sees it.', 'An alert the same morning, and the weekly report in one click (see the Ads tab).')}`; } },
      ],
    },
    {
      key: 'review', short: '1-star review', tab: 'voice', tabName: 'Customer voice',
      nodes: [['star', 'New review'], ['hub', 'Hub reads it'], ['check', 'Tags the theme'], ['pen', 'Drafts reply'], ['person', 'You approve']],
      how: { trigger: 'Trustpilot poll every 15 minutes (or webhook, depending on plan)', system: 'An LLM picks one theme from a fixed list (keywords in this demo); weekly counts stored', api: 'Trustpilot Business API: reply to a service review (API module, to confirm)', approve: 'The support lead approves each public reply' },
      steps: [
        { at: 0, title: 'A 1-star review appears',
          text: 'Reviews come in all day. Right now, the negative ones go unanswered.',
          body: () => card('D. Demo · US · ★☆☆☆☆', 'Invented review for this demo', 'Burned around my eyes, I had to stop using it.') },
        { at: 2, title: 'What is it really about?', try: true,
          text: 'The hub sorts every review into one of a few themes. Pick a review, or type your own and watch it get tagged.',
          body: () => `<div class="cx-t-pills" role="group" aria-label="Sample reviews">${['Burned around my eyes, I had to stop using it.', 'FedEx made me pay $40 extra at the door!', 'Such a tiny tube for the price.', 'Six weeks in and still no difference.'].map(r => `<button type="button" class="cx-t-pill" data-review="${esc(r)}" aria-pressed="${st.review === r}">“${esc(r)}”</button>`).join('')}</div>
            <label class="cx-t-lab" for="cx-t-rev">Or type a review</label><input type="text" id="cx-t-rev" class="cx-t-input" value="${esc(st.review)}" maxlength="200" autocomplete="off">
            <div data-out="main" aria-live="polite"></div>`,
          out: { main: () => { const t = tagTheme(st.review), th = themeOf(t.key);
            return th ? verdict(th.kind === 'bad' ? 'bad' : 'warn', `Theme: ${esc(th.t)}`, `This week’s count goes ${weekCount(th)} → ${weekCount(th) + 1}.`) : verdict('info', 'No theme matched', 'It goes to a person to file by hand. No guessing.'); } } },
        { at: 3, title: 'A reply, ready to approve',
          text: 'Each theme has an approved reply that a person can edit before it’s posted.',
          body: () => { const th = themeOf(tagTheme(st.review).key);
            return th ? `<label class="cx-vh" for="cx-t-reply">Drafted public reply</label><textarea id="cx-t-reply" rows="5">${esc(th.reply)}</textarea><div class="cx-acts"><button type="button" class="cx-btn" data-demo="Approved. In real life this posts to Trustpilot.">Approve reply</button><span class="cx-small">Demo button. Nothing is posted.</span></div>`
              : '<p>No theme matched this review, so no reply is drafted. A person writes this one.</p>'; } },
        { at: 4, title: 'Patterns reach the product team',
          text: 'Counting themes each week shows what to fix, not just what to reply to.',
          body: () => { const key = tagTheme(st.review).key, mx = Math.max(...S.themes.map(t => weekCount(t) + 1));
            return `<ul class="cx-t-hbars">${S.themes.map(t => { const n = weekCount(t) + (t.key === key ? 1 : 0); return `<li class="${t.key === key ? 'is-hit' : ''}"><span>${esc(t.t)}</span><i style="width:${n / mx * 100}%"></i><b>${n}</b></li>`; }).join('')}</ul>
              <p class="cx-small">Mentions this week (invented).${themeOf(key) ? ` Note for product: ${esc(themeOf(key).product)}` : ''}</p>
              ${compare('No replies to negative reviews, and no one counting why.', 'Every review answered within a day, and a weekly theme note for the product team.')}`; } },
      ],
    },
  ];

  /* ---------------- small diagrams ---------------- */
  function timeline() {
    const max = 12, lane = LANE.CA, p = parcelStatus(caParcel(), lane, now);
    const x = d => `${d / max * 100}%`;
    return `<div class="cx-t-tl" role="img" aria-label="Timeline: shipped ${p.sinceShip} days ago, promise ${lane.min} to ${lane.max} days, last scan ${p.sinceScan} days ago">
      <div class="cx-t-tl-bar"><span class="cx-t-tl-win" style="left:${x(lane.min)};width:${x(lane.max - lane.min)}"></span>
        <span class="cx-t-tl-scan" style="left:${x(Math.max(0, p.sinceShip - p.sinceScan))}" title="Last scan"></span>
        <span class="cx-t-tl-now ${p.flagged ? 'is-bad' : ''}" style="left:${x(Math.min(max, p.sinceShip))}"></span></div>
      <div class="cx-t-tl-axis"><span>Shipped</span><span style="left:${x(lane.min)}">Day ${lane.min}</span><span style="left:${x(lane.max)}">Day ${lane.max}</span><span class="cx-t-tl-today" style="left:${x(Math.min(max, p.sinceShip))}">Today</span></div>
      <div class="cx-t-tl-key cx-small"><span><i class="k-win"></i>Promised window</span><span><i class="k-scan"></i>Last carrier scan</span><span><i class="k-now"></i>Today</span></div></div>`;
  }
  function bars() {
    const hist = [0.9, 1.05, 0.95, 1.1, 0.92, 1.0, 1.08].map(f => Math.round(spikeAd.avg7 * f));
    const mx = Math.max(500, ...hist), lim = spikeAd.avg7 * SPIKE_THRESHOLD, hot = isSpike({ ...spikeAd, today: st.spend });
    return `<div class="cx-t-bars" role="img" aria-label="Daily spend for the last 7 days around €${spikeAd.avg7}; today €${st.spend}">
      ${hist.map((v, i) => `<span style="height:${v / mx * 100}%"><em>${['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}</em></span>`).join('')}
      <span class="is-today ${hot ? 'is-hot' : ''}" style="height:${st.spend / mx * 100}%"><em>Today</em></span>
      <b class="cx-t-lim" style="bottom:${lim / mx * 100}%"><small>Alert line ${SPIKE_THRESHOLD}× (€${Math.round(lim)})</small></b></div>`;
  }

  /* ---------------- rendering ---------------- */
  const tour = createTour(CHAPTERS);
  let finale = false;
  const applied = new Set();

  function render(focus = false) {
    const ch = CHAPTERS[tour.chapter], step = tour.current;
    const pct = finale ? 100 : Math.round(tour.position / tour.total * 100);
    el.innerHTML = `
      <div class="cx-t-head">
        <div><p class="cx-eyebrow">Guided tour · one morning at Cellexia</p><h3 class="cx-t-h">Five jobs the hub takes off your team’s plate</h3></div>
        <div class="cx-t-prog" role="progressbar" aria-label="Tour progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><i style="width:${pct}%"></i></div>
      </div>
      <ol class="cx-t-rail" aria-label="Chapters">${CHAPTERS.map((c, i) => `<li><button type="button" data-ch="${i}" aria-current="${!finale && i === tour.chapter ? 'step' : 'false'}" class="${tour.isFinished(c.key) ? 'is-done' : ''}"><span class="cx-t-rail-n" aria-hidden="true">${tour.isFinished(c.key) ? '✓' : i + 1}</span>${esc(c.short)}${tour.isFinished(c.key) ? '<span class="cx-vh"> (seen)</span>' : ''}</button></li>`).join('')}</ol>
      ${finale ? renderFinale() : `
      <div class="cx-t-stage">
        <ol class="cx-flow" aria-label="How it flows">${ch.nodes.map(([ic, label], i) => `<li class="${i < step.at ? 'is-done' : i === step.at ? 'is-now' : ''}"${i === step.at ? ' aria-current="step"' : ''}><span class="cx-flow-ic">${icon(ic)}</span><span class="cx-flow-l">${esc(label)}</span>${i ? '<span class="cx-flow-dot" aria-hidden="true"></span>' : ''}</li>`).join('')}</ol>
        <div class="cx-t-body">
          <p class="cx-t-count">Chapter ${tour.chapter + 1} of ${CHAPTERS.length} · step ${tour.step + 1} of ${ch.steps.length}${step.try ? ' · <span class="cx-chip cx-info">Try it</span>' : ''}</p>
          <h4 class="cx-t-title" id="cx-t-title" tabindex="-1">${esc(step.title)}</h4>
          <p class="cx-t-text">${esc(step.text)}</p>
          <div class="cx-t-try ${step.try ? 'is-try' : ''}">${step.body()}</div>
          <details class="cx-how"><summary>For the technical team</summary><ol class="cx-how-flow">
            <li><b>Trigger</b><span>${esc(ch.how.trigger)}</span></li><li><b>System</b><span>${esc(ch.how.system)}</span></li>
            <li><b>API</b><code>${esc(ch.how.api)}</code></li><li><b>A person approves</b><span>${esc(ch.how.approve)}</span></li></ol></details>
        </div>
      </div>
      <div class="cx-t-nav">
        <button type="button" class="cx-btn" data-nav="back" ${tour.isFirst ? 'disabled' : ''}>← Back</button>
        <span class="cx-small cx-t-pos" aria-hidden="true">${tour.position} / ${tour.total}</span>
        ${tour.isChapterEnd ? `<button type="button" class="cx-btn" data-result="${ch.key}">See it in ${esc(ch.tabName)} ↗</button>` : ''}
        <button type="button" class="cx-btn cx-pri" data-nav="next">${tour.isEnd ? 'Finish the tour' : tour.isChapterEnd ? 'Next chapter →' : 'Next →'}</button>
      </div>`}`;
    refreshOut();
    bind();
    if (focus) el.querySelector('#cx-t-title, #cx-t-fin')?.focus({ preventScroll: true });
  }

  function renderFinale() {
    return `<div class="cx-t-fin">
      <h4 id="cx-t-fin" tabindex="-1">That was one morning.</h4>
      <p>A refund, a heads-up about import fees, a late parcel, an overspending ad and a 1-star review. Five jobs that today mean opening five tools and doing it by hand. With the hub, each one becomes a short read and one click from a person.</p>
      <ul class="cx-t-fin-list">${CHAPTERS.map(c => `<li><span aria-hidden="true">✓</span>${esc(c.short)} <button type="button" class="cx-link" data-result="${c.key}">see it in ${esc(c.tabName)}</button></li>`).join('')}</ul>
      <div class="cx-acts"><a class="cx-btn cx-pri" href="#plan">Read the 30-day plan</a><button type="button" class="cx-btn" data-nav="restart">Take the tour again</button></div>
    </div>`;
  }

  function refreshOut() {
    if (finale) return;
    const step = tour.current;
    if (!step.out) return;
    el.querySelectorAll('[data-out]').forEach(o => { const f = step.out[o.dataset.out]; if (f) { const h = f(o); if (h !== '' || o.dataset.out !== 'mark') o.innerHTML = h; } });
  }

  function bind() {
    el.querySelectorAll('input[type=range][data-k]').forEach(r => r.addEventListener('input', () => {
      st[r.dataset.k] = +r.value;
      const o = el.querySelector('#' + r.id + '-o'); if (o) o.textContent = r.value;
      refreshOut();
    }));
    el.querySelectorAll('[data-country]').forEach(b => b.addEventListener('click', () => {
      st.country = b.dataset.country;
      el.querySelectorAll('[data-country]').forEach(x => x.setAttribute('aria-pressed', x === b));
      refreshOut();
    }));
    const rev = el.querySelector('#cx-t-rev');
    el.querySelectorAll('[data-review]').forEach(b => b.addEventListener('click', () => {
      st.review = b.dataset.review; if (rev) rev.value = st.review;
      el.querySelectorAll('[data-review]').forEach(x => x.setAttribute('aria-pressed', x === b));
      refreshOut();
    }));
    rev?.addEventListener('input', () => { st.review = rev.value; el.querySelectorAll('[data-review]').forEach(x => x.setAttribute('aria-pressed', x.dataset.review === st.review)); refreshOut(); });
    el.querySelectorAll('[data-demo]').forEach(b => b.addEventListener('click', () => { toast(b.dataset.demo); b.disabled = true; b.textContent = 'Approved'; }));
  }

  el.addEventListener('click', e => {
    const n = e.target.closest('[data-nav]'), c = e.target.closest('[data-ch]'), r = e.target.closest('[data-result]');
    if (n) {
      const k = n.dataset.nav;
      if (k === 'next') { if (tour.isEnd) { finale = true; track('tour_done'); } else { const was = tour.chapter; tour.next(); if (tour.chapter !== was) track('tour_chapter_' + CHAPTERS[tour.chapter].key); } }
      if (k === 'back') { if (!finale) tour.back(); }
      if (k === 'restart') { finale = false; tour.goto(0); track('tour_restart'); }
      render(true);
    } else if (c) { finale = false; tour.goto(+c.dataset.ch); render(true); }
    else if (r) {
      const ch = CHAPTERS.find(x => x.key === r.dataset.result);
      if (!applied.has(ch.key)) { applied.add(ch.key); onResult(ch.key, true); } else onResult(ch.key, false);
      track('tour_result_' + ch.key);
    }
  });
  el.addEventListener('keydown', e => {
    if (e.target.matches('input, textarea, select') || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === 'ArrowRight' && !finale) { el.querySelector('[data-nav=next]')?.click(); e.preventDefault(); }
    if (e.key === 'ArrowLeft' && !finale) { el.querySelector('[data-nav=back]:not(:disabled)')?.click(); e.preventDefault(); }
  });

  render();
  return {
    start() { finale = false; if (tour.position !== 1) tour.goto(0); render(true); track('tour_start'); },
  };
}
