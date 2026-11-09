import { test } from 'node:test';
import assert from 'node:assert/strict';
import { triage, detectIntent, guaranteeCheck, damageCheck, findOrder } from '../lib/triage.js';
import { POLICY, LANE, NON_EU } from '../data/policy.js';
import { buildSample } from '../data/sample.js';

const H = 36e5, D = 864e5;
const T = new Date('2026-11-09T09:00:00Z');
const at = ms => new Date(+T + ms);
const order = (over = {}) => ({ id: 'CX-DEMO-1', email: 'a@example.com', country: 'DE', items: 'Eye Lifting Serum ×1', total: '€67.00', shippedAt: at(-3 * D), deliveredAt: T, carrier: 'DHL', site: '3PL-EU-1', ...over });
const ctx = orders => ({ orders, policy: POLICY, lanes: LANE, nonEu: NON_EU });

test('guarantee: day 59 is inside, day 61 is outside', () => {
  const o = order();
  const d59 = guaranteeCheck(o, at(59 * D + 2 * H), POLICY);
  const d61 = guaranteeCheck(o, at(61 * D + 2 * H), POLICY);
  assert.equal(d59.ok, true); assert.equal(d59.day, 59);
  assert.match(d59.label, /Within 60-day guarantee: day 59/);
  assert.equal(d61.ok, false); assert.equal(d61.day, 61);
});

test('refund email on day 59 gets a return number; day 61 does not', () => {
  const o = order();
  const mail = recv => ({ id: 3, from: 'Test User', email: 'a@example.com', subj: 'Refund please', body: 'I want my money back for CX-DEMO-1, no results.', receivedAt: recv });
  const in59 = triage(mail(at(59 * D)), ctx([o]));
  const out61 = triage(mail(at(61 * D)), ctx([o]));
  assert.equal(in59.intent.key, 'refund');
  assert.equal(in59.route, 'draft');
  assert.ok(in59.actions.some(a => /^Issue RAN-/.test(a.label)));
  assert.match(in59.draft, /within our 60-day guarantee/);
  assert.equal(out61.checks.find(c => /guarantee/.test(c.label)).ok, false);
  assert.ok(!out61.actions.some(a => /RAN-/.test(a.label)));
});

test('damage report: 47h is inside the 48h window, 49h is outside', () => {
  const o = order();
  assert.equal(damageCheck(o, at(47 * H), POLICY).ok, true);
  assert.equal(damageCheck(o, at(49 * H), POLICY).ok, false);
  const mail = recv => ({ id: 4, from: 'Test User', email: 'a@example.com', subj: 'Arrived broken', body: 'The pump is broken, nothing comes out. Photo attached. CX-DEMO-1', receivedAt: recv });
  const r47 = triage(mail(at(47 * H)), ctx([o]));
  const r49 = triage(mail(at(49 * H)), ctx([o]));
  assert.equal(r47.intent.key, 'damaged');
  assert.ok(r47.actions.some(a => a.label === 'Send replacement'));
  assert.ok(!r49.actions.some(a => a.label === 'Send replacement'));
});

test('wrong-item email is detected and logs a pick error', () => {
  const o = order({ items: 'Neck Tightening Cream ×1', receivedItem: 'Dark Spot Corrector' });
  const r = triage({ id: 6, from: 'Peter K.', email: 'a@example.com', subj: 'Wrong product', body: 'I ordered the Neck Tightening Cream but received a Dark Spot Corrector instead. CX-DEMO-1', receivedAt: at(D) }, ctx([o]));
  assert.equal(r.intent.key, 'wrong_item');
  assert.ok(r.confidence >= POLICY.minConfidence);
  assert.ok(r.checks.some(c => /Pick error/.test(c.label)));
  assert.match(r.draft, /Neck Tightening Cream/);
});

test('low-confidence email goes to a person with no draft', () => {
  const r = triage({ id: 8, from: 'Ann D.', email: 'nobody@example.com', subj: 'Following up', body: 'Just following up on what we discussed. Can someone call me?', receivedAt: T }, ctx([order()]));
  assert.ok(r.confidence < POLICY.minConfidence);
  assert.equal(r.route, 'person');
  assert.equal(r.draft, '');
});

test('order is found by number first, then by sender email', () => {
  const a = order({ id: 'CX-DEMO-5', email: 'x@example.com' });
  assert.equal(findOrder({ subj: '', body: 'about cx-demo-5', email: 'other@example.com' }, [a]).via, 'order number');
  assert.equal(findOrder({ subj: '', body: 'no number', email: 'x@example.com' }, [a]).via, 'sender’s email');
});

test('every sample email triages, and only the vague one goes to a person', () => {
  const s = buildSample(T);
  const routes = s.emails.map(e => {
    const r = triage(e, ctx(s.orders));
    assert.ok(r.confidence >= 0 && r.confidence <= 1);
    if (r.route === 'draft') assert.ok(r.draft.length > 40);
    return [e.id, r.intent.key, r.route];
  });
  assert.deepEqual(routes.filter(r => r[2] === 'person').map(r => r[0]), [8]);
  assert.deepEqual(routes.map(r => r[1]), ['wismo', 'refund', 'damaged', 'duties', 'product_q', 'wrong_item', 'refund', 'unknown']);
  assert.equal(detectIntent('Where is my order? tracking hasn’t moved').key, 'wismo');
});
