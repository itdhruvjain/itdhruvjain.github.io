// Public policy values used by the triage rules.
// Each value notes where it came from. "VERIFY" means: confirm with Cellexia before relying on it.

export const POLICY = {
  // Source: cellexialabs.com, 60-day money-back guarantee (stated publicly). VERIFY exact wording:
  // is it 60 days from delivery or from purchase? The rules below assume from delivery.
  guaranteeDays: 60,

  // ASSUMPTION: a 48-hour window to report damaged items, read from the public returns page
  // during research. VERIFY. Not stated in my research notes as a confirmed policy.
  damageHours: 48,

  // ASSUMPTION: refund timing quoted in replies. VERIFY with the support lead.
  refundTiming: '5–7 business days',

  // Below this triage confidence an email is never auto-drafted; a person picks it up.
  minConfidence: 0.6,
};

// Delivery promise per lane, in days from dispatch.
// ASSUMPTION: my reading of the public shipping page during research. VERIFY every number.
// stuckLimit = days with no carrier scan before a parcel counts as "stuck" (my proposed rule).
export const LANES = [
  { m: 'DE', name: 'Germany',        group: 'Europe', min: 1, max: 3, stuckLimit: 2 },
  { m: 'FR', name: 'France',         group: 'Europe', min: 2, max: 3, stuckLimit: 2 },
  { m: 'IE', name: 'Ireland',        group: 'Europe', min: 2, max: 4, stuckLimit: 2 },
  { m: 'NL', name: 'Netherlands',    group: 'Europe', min: 1, max: 2, stuckLimit: 2 },
  { m: 'ES', name: 'Spain',          group: 'Europe', min: 1, max: 3, stuckLimit: 2 },
  { m: 'UK', name: 'United Kingdom', group: 'UK',     min: 3, max: 5, stuckLimit: 3 },
  { m: 'US', name: 'United States',  group: 'US',     min: 5, max: 7, stuckLimit: 3 },
  { m: 'CA', name: 'Canada',         group: 'Canada', min: 5, max: 7, stuckLimit: 3 },
  { m: 'AU', name: 'Australia',      group: 'Australia', min: 6, max: 8, stuckLimit: 3 },
];

export const LANE = Object.fromEntries(LANES.map(l => [l.m, l]));

// Markets outside the EU, where (ASSUMPTION) parcels currently ship duties-unpaid
// and the courier collects import fees on delivery.
export const NON_EU = new Set(['UK', 'US', 'CA', 'AU']);
