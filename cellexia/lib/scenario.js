// Scenario player: runs scenarios one step at a time, with pause, skip and replay.
// No DOM. Timers are injected so it can be tested without waiting.
//
// Events sent to onEvent:
//   {type:'start', index, scenario}  {type:'step', index, scenario, step}
//   {type:'done', index, scenario}   {type:'end'}   {type:'state', state}

export function createPlayer(scenarios, {
  onEvent = () => {},
  stepMs = 650,
  gapMs = 900,
  schedule = (fn, ms) => setTimeout(fn, ms),
  cancel = id => clearTimeout(id),
} = {}) {
  let state = 'idle';          // idle | playing | paused | ended
  let si = 0, step = -1, timer = null, pending = null;

  const emit = e => onEvent(e);
  const setState = s => { state = s; emit({ type: 'state', state: s }); };
  const later = (fn, ms) => { pending = fn; timer = schedule(() => { timer = null; pending = null; fn(); }, ms); };
  const clear = () => { if (timer !== null) cancel(timer); timer = null; };

  function tick() {
    if (state !== 'playing') return;
    const s = scenarios[si];
    if (step === -1) { emit({ type: 'start', index: si, scenario: s }); step = 0; emit({ type: 'step', index: si, scenario: s, step: 0 }); }
    else if (step < s.steps.length - 1) { step++; emit({ type: 'step', index: si, scenario: s, step }); }
    if (step >= s.steps.length - 1) return finishScenario();
    later(tick, stepMs);
  }

  function finishScenario() {
    const s = scenarios[si];
    emit({ type: 'done', index: si, scenario: s });
    si++; step = -1;
    if (si >= scenarios.length) { clear(); pending = null; setState('ended'); emit({ type: 'end' }); return; }
    later(tick, gapMs);
  }

  return {
    get state() { return state; },
    get index() { return si; },
    get step() { return step; },
    play() {
      if (state === 'playing') return;
      if (state === 'ended' || state === 'idle') { si = 0; step = -1; }
      setState('playing');
      const resume = pending; clear(); pending = null;
      if (resume) resume(); else tick();
    },
    pause() {
      if (state !== 'playing') return;
      const resume = pending; clear(); pending = resume; setState('paused');
    },
    /** Finish the current scenario at once and move on to the next. */
    skip() {
      if (state !== 'playing' && state !== 'paused') return;
      clear(); pending = null;
      const s = scenarios[si];
      if (step === -1) emit({ type: 'start', index: si, scenario: s });
      for (let k = Math.max(step + 1, 0); k < s.steps.length; k++) emit({ type: 'step', index: si, scenario: s, step: k });
      step = s.steps.length - 1;
      const wasPaused = state === 'paused';
      state = 'playing';
      finishScenario();
      if (wasPaused && state === 'playing') this.pause();
    },
    /** Start again from the first scenario. */
    replay() { clear(); pending = null; si = 0; step = -1; state = 'idle'; emit({ type: 'reset' }); this.play(); },
    stop() { clear(); pending = null; setState('idle'); si = 0; step = -1; },
  };
}
