import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPlayer } from '../lib/scenario.js';

function fakeClock() {
  let q = [], id = 0;
  return {
    schedule: fn => { q.push({ id: ++id, fn }); return id; },
    cancel: i => { q = q.filter(x => x.id !== i); },
    flush() { let n = 0; while (q.length && n++ < 1000) q.shift().fn(); },
  };
}
const SC = [{ key: 'a', steps: ['1', '2', '3'] }, { key: 'b', steps: ['1', '2'] }];

test('plays every step of every scenario then ends', () => {
  const c = fakeClock(), ev = [];
  const p = createPlayer(SC, { ...c, onEvent: e => ev.push(e.type) });
  p.play(); c.flush();
  assert.equal(p.state, 'ended');
  assert.equal(ev.filter(x => x === 'step').length, 5);
  assert.equal(ev.filter(x => x === 'done').length, 2);
});

test('pause stops progress and play resumes', () => {
  const c = fakeClock(), steps = [];
  const p = createPlayer(SC, { ...c, onEvent: e => e.type === 'step' && steps.push(e.step) });
  p.play(); p.pause();
  const before = steps.length; c.flush();
  assert.equal(steps.length, before, 'no steps while paused');
  p.play(); c.flush();
  assert.equal(p.state, 'ended');
  assert.equal(steps.length, 5);
});

test('skip completes the current scenario immediately', () => {
  const c = fakeClock(), done = [];
  const p = createPlayer(SC, { ...c, onEvent: e => e.type === 'done' && done.push(e.scenario.key) });
  p.play(); p.skip();
  assert.deepEqual(done, ['a']);
  assert.equal(p.index, 1);
});

test('replay starts again from the first scenario', () => {
  const c = fakeClock(), starts = [];
  const p = createPlayer(SC, { ...c, onEvent: e => e.type === 'start' && starts.push(e.scenario.key) });
  p.play(); c.flush(); p.replay(); c.flush();
  assert.deepEqual(starts, ['a', 'b', 'a', 'b']);
});
