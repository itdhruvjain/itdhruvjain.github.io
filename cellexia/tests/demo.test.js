// The five demo steps on the page take their checks from lib/. These tests pin the exact
// inputs the page uses, so the story on screen and the rules can't drift apart.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { POLICY, LANE, NON_EU } from '../data/policy.js';
import { guaranteeCheck } from '../lib/triage.js';
import { parcelStatus } from '../lib/lanes.js';
import { spikeRatio, roas, suggestedCap, isSpike } from '../lib/ads.js';
import { tagTheme } from '../lib/voice.js';

const D = 864e5, H = 36e5, NOW = new Date('2026-11-09T07:00:00Z');
const ago = d => new Date(+NOW - d * D - H);

test('step 1: refund on day 21 is inside the 60-day guarantee', () => {
  const g = guaranteeCheck({ deliveredAt: ago(21) }, NOW, POLICY);
  assert.equal(g.ok, true);
  assert.equal(g.day, 21);
});

test('step 2: a US order is outside the EU, so it gets the import-fee notice', () => {
  assert.equal(NON_EU.has('US'), true);
  assert.equal(NON_EU.has('DE'), false);
});

test('step 3: Canada parcel on day 9 with no scan for 4 days is late and stuck', () => {
  const p = parcelStatus({ o: 'CX-DEMO-10455', m: 'CA', shippedAt: ago(9), lastScanAt: ago(4) }, LANE.CA, NOW);
  assert.equal(p.pastPromise, true);
  assert.equal(p.sinceShip - LANE.CA.max, 2);
  assert.equal(p.stuck, true);
});

test('step 4: €1,520 against a €724 average is a 2.1× spike with ROAS 2.0', () => {
  const ad = { spend: 1520, rev: 3040, today: 1520, avg7: 724 };
  assert.equal(isSpike(ad), true);
  assert.equal(spikeRatio(ad).toFixed(1), '2.1');
  assert.equal(roas(ad), 2);
  assert.equal(suggestedCap(ad), 720);
});

test('step 5: the review is tagged as menthol irritation', () => {
  assert.equal(tagTheme('The cream feels lovely, but the cooling feeling makes my eyes water.').key, 'menthol');
});

test('review themes are tagged from the text', () => {
  assert.equal(tagTheme('FedEx made me pay customs at the door').key, 'duties');
  assert.equal(tagTheme('Such a tiny tube for the price').key, 'size');
  assert.equal(tagTheme('Six weeks in and no difference').key, 'patience');
  assert.equal(tagTheme('Can I buy it in a pharmacy near me?').key, 'local');
  assert.equal(tagTheme('Lovely packaging').key, 'other');
});
