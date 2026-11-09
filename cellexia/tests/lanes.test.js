import { test } from 'node:test';
import assert from 'node:assert/strict';
import { laneSummary, parcelStatus, findStuck, overallOnTime } from '../lib/lanes.js';
import { LANES, LANE } from '../data/policy.js';

const D = 864e5, T = new Date('2026-11-09T09:00:00Z');
const ago = d => new Date(+T - d * D);

test('parcel with no scan past the lane limit is stuck', () => {
  const us = LANE.US; // stuckLimit 3
  const p = parcelStatus({ o: 'CX-DEMO-1', m: 'US', shippedAt: ago(5), lastScanAt: ago(4) }, us, T);
  assert.equal(p.stuck, true);
  assert.equal(p.sinceScan, 4);
  const ok = parcelStatus({ o: 'CX-DEMO-2', m: 'US', shippedAt: ago(5), lastScanAt: ago(3) }, us, T);
  assert.equal(ok.stuck, false, 'exactly at the limit is not yet stuck');
});

test('parcel shipped longer ago than the promise is flagged even with recent scans', () => {
  const p = parcelStatus({ o: 'CX-DEMO-3', m: 'CA', shippedAt: ago(8), lastScanAt: ago(1) }, LANE.CA, T);
  assert.equal(p.stuck, false);
  assert.equal(p.pastPromise, true);
  assert.equal(p.flagged, true);
});

test('findStuck sorts flagged parcels first', () => {
  const list = findStuck([
    { o: 'A', m: 'DE', shippedAt: ago(1), lastScanAt: ago(0) },
    { o: 'B', m: 'US', shippedAt: ago(9), lastScanAt: ago(5) },
  ], LANE, T);
  assert.equal(list[0].o, 'B');
});

test('lane summary computes average and on-time share', () => {
  const s = laneSummary([{ m: 'DE', days: 2 }, { m: 'DE', days: 3 }, { m: 'DE', days: 5 }, { m: 'DE', days: 2 }], LANES).find(l => l.m === 'DE');
  assert.equal(s.orders, 4);
  assert.equal(s.avg, 3);
  assert.equal(s.onTime, 75); // max 3 days: 3 of 4 on time
  assert.equal(overallOnTime([s]), 75);
});
