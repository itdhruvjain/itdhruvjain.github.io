import { test } from 'node:test';
import assert from 'node:assert/strict';
import { landedCost, importCharges } from '../lib/duties.js';
import { DUTY_MARKETS } from '../data/duties.js';

const cfg = { threshold: 100, duty: 10, tax: 20, taxFrom: 0, fee: 15, ddpFee: 5 };

test('below the duty threshold only tax applies', () => {
  const c = importCharges(cfg, 50);
  assert.equal(c.duty, 0);
  assert.equal(c.tax, 10);
});

test('at or above the threshold duty applies and tax includes it', () => {
  const c = importCharges(cfg, 100);
  assert.equal(c.duty, 10);
  assert.equal(c.tax, 22);
});

test('today: courier fee is added at the door; prepaid: nothing at the door', () => {
  const today = landedCost(cfg, 100, 'today');
  assert.equal(today.checkout, 100);
  assert.equal(today.atDoor, 47);
  assert.equal(today.total, 147);
  const pre = landedCost(cfg, 100, 'prepaid');
  assert.equal(pre.atDoor, 0);
  assert.equal(pre.checkout, 137);
  assert.ok(pre.total < today.total);
});

test('no charges means no courier fee at the door', () => {
  const free = { threshold: 1000, duty: 5, tax: 0, taxFrom: 0, fee: 20, ddpFee: 5 };
  assert.equal(landedCost(free, 100).atDoor, 0);
});

test('every configured market produces a positive door charge for a typical order', () => {
  for (const [k, m] of Object.entries(DUTY_MARKETS)) assert.ok(landedCost(m, 90).atDoor > 0, k);
});
