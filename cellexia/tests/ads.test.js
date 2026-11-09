import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isSpike, spikeRatio, followsConvention, adFlags, merByMarket, weeklySummary, roas, SPIKE_THRESHOLD } from '../lib/ads.js';
import { buildSample } from '../data/sample.js';

const ad = o => ({ n: 'WFG_US_UGC_MorningRoutine_V3', ch: 'Meta', m: 'US', spend: 1000, rev: 3000, today: 100, avg7: 100, status: 'Active', ...o });

test('spend spike threshold: 2.1× flags, 1.7× does not, exactly at threshold flags', () => {
  assert.equal(isSpike(ad({ today: 210 })), true);
  assert.equal(isSpike(ad({ today: 170 })), false);
  assert.equal(isSpike(ad({ today: SPIKE_THRESHOLD * 100 })), true);
  assert.equal(spikeRatio(ad({ today: 210 })).toFixed(1), '2.1');
  assert.ok(adFlags(ad({ today: 210 })).some(f => f.kind === 'spike'));
});

test('campaign names that break the convention are flagged', () => {
  assert.equal(followsConvention('WFG_US_UGC_MorningRoutine_V3'), true);
  assert.equal(followsConvention('wrinkle gel new test FINAL'), false);
  assert.equal(followsConvention('WFG_US_UGC_MorningRoutine'), false, 'missing version');
  assert.equal(followsConvention('XYZ_US_UGC_Test_V1'), false, 'unknown product code');
  assert.ok(adFlags(ad({ n: 'wrinkle gel new test FINAL' })).some(f => f.kind === 'name'));
});

test('ROAS and MER maths', () => {
  assert.equal(roas(ad()), 3);
  const mer = merByMarket([{ m: 'A', spend: 100, revenue: 200 }, { m: 'B', spend: 100, revenue: 400 }]);
  assert.deepEqual(mer.map(x => x.m), ['B', 'A']);
  assert.equal(mer[0].mer, 4);
});

test('weekly summary lists totals, MER and the flagged ads', () => {
  const s = buildSample(new Date('2026-11-09T09:00:00Z'));
  const txt = weeklySummary(s.ads, s.markets, { weekOf: '2 Nov' });
  assert.match(txt, /Weekly ads summary — week of 2 Nov/);
  assert.match(txt, /MER by market/);
  assert.match(txt, /ELS_US_Video_60Day_V4: spend 2\.1× the 7-day average/);
  assert.match(txt, /wrinkle gel new test FINAL: name breaks convention/);
  assert.match(txt, /AU {2}1\.89 {2}← below target/);
});
