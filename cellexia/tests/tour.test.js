import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTour } from '../lib/tour.js';
import { tagTheme } from '../lib/voice.js';

const CH = [{ key: 'a', steps: [1, 2, 3] }, { key: 'b', steps: [1, 2] }];

test('tour starts at the first step and never moves on its own', () => {
  const t = createTour(CH);
  assert.equal(t.chapter, 0); assert.equal(t.step, 0);
  assert.equal(t.isFirst, true); assert.equal(t.position, 1); assert.equal(t.total, 5);
});

test('next walks through chapters; back returns across the chapter boundary', () => {
  const t = createTour(CH);
  t.next(); t.next();
  assert.equal(t.isChapterEnd, true);
  assert.equal(t.isFinished('a'), true);
  t.next();
  assert.deepEqual([t.chapter, t.step], [1, 0]);
  t.back();
  assert.deepEqual([t.chapter, t.step], [0, 2]);
});

test('next at the very end and back at the very start do nothing', () => {
  const t = createTour(CH);
  assert.equal(t.back(), false);
  t.goto(1, 1);
  assert.equal(t.isEnd, true);
  assert.equal(t.next(), false);
  assert.equal(t.position, 5);
});

test('goto clamps the step and ignores unknown chapters', () => {
  const t = createTour(CH);
  assert.equal(t.goto(5), false);
  t.goto(1, 99);
  assert.deepEqual([t.chapter, t.step], [1, 1]);
  assert.equal(t.finishedCount, 1);
});

test('review themes are tagged from the text', () => {
  assert.equal(tagTheme('FedEx made me pay customs at the door').key, 'duties');
  assert.equal(tagTheme('It stings and my eyes water').key, 'menthol');
  assert.equal(tagTheme('Such a tiny tube for the price').key, 'size');
  assert.equal(tagTheme('Six weeks in and no difference').key, 'patience');
  assert.equal(tagTheme('Can I buy it in a pharmacy near me?').key, 'local');
  assert.equal(tagTheme('Lovely packaging').key, 'other');
});
