// Ads checks and the weekly report. Pure functions, no DOM.
// Revenue per ad is assumed to come from Shopify orders carrying the ad's UTM tags.

export const SPIKE_THRESHOLD = 1.8; // flag when today's spend is >= 1.8× the 7-day daily average

// PROPOSED naming convention (mine, not Cellexia's): PRODUCT_MARKET_FORMAT_Angle_V#
// e.g. WFG_US_UGC_MorningRoutine_V3. Lets reports group by product and market automatically.
export const PRODUCT_CODES = { WFG: 'Deep Wrinkle Filler Gel', CRC: 'Cellular Renewal Cream', ELS: 'Eye Lifting Serum', NTC: 'Neck Tightening Cream', ACC: 'Anti-Cellulite Cream', DSC: 'Dark Spot Corrector', BWC: 'Body Wrinkle Cream' };
export const NAME_RULE = new RegExp(`^(${Object.keys(PRODUCT_CODES).join('|')})_(US|UK|CA|AU|DE|FR|ES|IE|NL|EU)_(UGC|Static|Video|Carousel)_[A-Za-z0-9]+_V\\d+$`);

export const roas = a => (a.spend ? a.rev / a.spend : 0);
export const followsConvention = name => NAME_RULE.test(name);
export const spikeRatio = a => (a.avg7 ? a.today / a.avg7 : 0);
export const isSpike = (a, threshold = SPIKE_THRESHOLD) => spikeRatio(a) >= threshold;

/** Suggest a daily cap: back to the 7-day average, rounded to €10. */
export const suggestedCap = a => Math.max(10, Math.round(a.avg7 / 10) * 10);

/** All flags for one ad. */
export function adFlags(a, { threshold = SPIKE_THRESHOLD, target = 2.5 } = {}) {
  const f = [];
  if (isSpike(a, threshold)) f.push({ kind: 'spike', tone: 'warn', label: `Spend ${spikeRatio(a).toFixed(1)}× the 7-day average`, detail: `ROAS ${roas(a).toFixed(1)}. Suggest a daily cap of €${suggestedCap(a)} until the media buyer reviews.` });
  if (a.status === 'Disapproved') f.push({ kind: 'disapproved', tone: 'bad', label: 'Disapproved', detail: `Was returning ${roas(a).toFixed(1)} ROAS. Check the claim wording against the ad policy reason.` });
  if (!followsConvention(a.n)) f.push({ kind: 'name', tone: 'warn', label: 'Name breaks convention', detail: 'Can’t be grouped by product or market in reports. Rename to PRODUCT_MARKET_FORMAT_Angle_V#.' });
  if (a.status === 'Active' && roas(a) < target) f.push({ kind: 'low', tone: 'warn', label: `ROAS below ${target}`, detail: 'Check before adding budget.' });
  return f;
}

/** Marketing efficiency ratio (all revenue ÷ all ad spend) per market, best first. */
export const merByMarket = markets => markets.map(x => ({ m: x.m, mer: Math.round(x.revenue / x.spend * 100) / 100 })).sort((a, z) => z.mer - a.mer);

export function totals(ads) {
  const spend = ads.reduce((a, x) => a + x.spend, 0), rev = ads.reduce((a, x) => a + x.rev, 0);
  return { spend, rev, roas: spend ? rev / spend : 0 };
}

const eur = n => '€' + Math.round(n).toLocaleString('en-GB');

/** The weekly summary a VA builds by hand today, as plain text ready to paste. */
export function weeklySummary(ads, markets, { weekOf = '', merTarget = 3 } = {}) {
  const t = totals(ads);
  const mer = merByMarket(markets);
  const top = [...ads].filter(a => a.status === 'Active').sort((a, z) => roas(z) - roas(a)).slice(0, 3);
  const flagged = ads.map(a => ({ a, f: adFlags(a).filter(x => x.kind !== 'low') })).filter(x => x.f.length);
  const lines = [
    `Weekly ads summary${weekOf ? ' — week of ' + weekOf : ''}`,
    '',
    `Spend ${eur(t.spend)} · Attributed revenue ${eur(t.rev)} · ROAS ${t.roas.toFixed(2)}`,
    '',
    `MER by market (target ${merTarget.toFixed(1)}):`,
    ...mer.map(x => `  ${x.m}  ${x.mer.toFixed(2)}${x.mer < merTarget ? '  ← below target' : ''}`),
    '',
    'Top ads by ROAS:',
    ...top.map((a, i) => `  ${i + 1}. ${a.n} (${a.ch}) — ${roas(a).toFixed(1)} on ${eur(a.spend)}`),
    '',
    `Needs attention (${flagged.length}):`,
    ...flagged.map(({ a, f }) => `  • ${a.n}: ${f.map(x => x.label.toLowerCase()).join('; ')}`),
    '',
    'Suggested next steps:',
    ...mer.filter(x => x.mer >= merTarget).slice(0, 2).map(x => `  • ${x.m}: room to scale the top ads`),
    ...mer.filter(x => x.mer < merTarget).map(x => `  • ${x.m}: review spend before scaling`),
  ];
  return lines.join('\n');
}
