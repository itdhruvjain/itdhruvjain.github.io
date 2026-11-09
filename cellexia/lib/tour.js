// Guided tour: which chapter and step the reader is on. Pure state, no DOM, no timers.
// The reader moves at their own pace with next/back; nothing advances on its own.
//
// chapters: [{ key, steps: [...] }]

export function createTour(chapters) {
  let c = 0, s = 0;
  const seen = new Set();          // "c:s" keys the reader has viewed
  const finished = new Set();      // chapter keys the reader reached the end of
  const total = chapters.reduce((a, ch) => a + ch.steps.length, 0);
  const mark = () => {
    seen.add(c + ':' + s);
    if (s === chapters[c].steps.length - 1) finished.add(chapters[c].key);
  };
  mark();

  return {
    get chapter() { return c; },
    get step() { return s; },
    get current() { return chapters[c].steps[s]; },
    get total() { return total; },
    /** 1-based position across the whole tour. */
    get position() { return chapters.slice(0, c).reduce((a, ch) => a + ch.steps.length, 0) + s + 1; },
    get isFirst() { return c === 0 && s === 0; },
    get isChapterEnd() { return s === chapters[c].steps.length - 1; },
    get isEnd() { return c === chapters.length - 1 && s === chapters[c].steps.length - 1; },
    isFinished: key => finished.has(key),
    get finishedCount() { return finished.size; },
    get seenCount() { return seen.size; },
    next() {
      if (s < chapters[c].steps.length - 1) s++;
      else if (c < chapters.length - 1) { c++; s = 0; }
      else return false;
      mark(); return true;
    },
    back() {
      if (s > 0) s--;
      else if (c > 0) { c--; s = chapters[c].steps.length - 1; }
      else return false;
      mark(); return true;
    },
    goto(chapter, step = 0) {
      if (chapter < 0 || chapter >= chapters.length) return false;
      c = chapter; s = Math.max(0, Math.min(step, chapters[c].steps.length - 1));
      mark(); return true;
    },
  };
}
