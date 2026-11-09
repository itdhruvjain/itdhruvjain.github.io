// Review theme tagging. Pure functions, no DOM.
// In production an LLM would choose from the same fixed list; this keyword version shows the idea
// and is what the demo uses, so anyone can type a review and see how it's tagged.

export const THEME_WORDS = {
  duties:   [/customs?|dut(y|ies)|import|fedex|courier|extra (fee|charge)|pa(y|id) (more|extra)|charged? (on|at) (the )?(door|delivery)/],
  menthol:  [/menthol|sting|burn|tingl|irritat|itch|red(ness)?\b|eyes? water|rash/],
  size:     [/tiny|small|size|tube|amount|ran out|lasts?|for the price|expensive|overpriced/],
  patience: [/no (results?|change|difference)|didn.t (work|see)|weeks?|months?|patien|takes? (a )?(long|time)/],
  local:    [/shop|store|local|pharmac|stock(ist)?|near me|buy (it )?in/],
};

/**
 * Pick the best-matching theme for a review. Returns { key, hits } with key 'other'
 * when nothing matches, so a person can file it by hand.
 */
export function tagTheme(text) {
  const b = String(text || '').toLowerCase();
  let best = { key: 'other', hits: 0 };
  for (const [key, patterns] of Object.entries(THEME_WORDS)) {
    const hits = patterns.reduce((n, p) => n + (b.match(new RegExp(p.source, 'g')) || []).length, 0);
    if (hits > best.hits) best = { key, hits };
  }
  return best;
}
