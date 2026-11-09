// ILLUSTRATIVE import-fee settings for the landed-cost explainer.
//
// !!! These are NOT real, current thresholds or rates. !!!
// They are round numbers chosen to show the shape of the problem. Before using anything like
// this with customers, check the real rules for each market (they change, and they depend on
// the product's HS code, country of origin and the carrier's own fees), e.g. via the carrier,
// Shopify Markets / Managed Markets, Zonos or Global-e.
//
// threshold: order value (local currency) below which no duty is charged in this illustration
// duty:      duty as a % of order value, applied when value >= threshold
// tax:       import VAT / GST as a % of (order value + duty)
// taxFrom:   order value from which tax is collected at the door in this illustration
// fee:       the courier's flat clearance / brokerage fee when it collects at the door
// ddpFee:    a smaller flat fee if duties are prepaid at checkout instead (illustrative)

export const DUTY_MARKETS = {
  US: { name: 'United States',  cur: '$',   code: 'USD', threshold: 0,   duty: 15, tax: 0,  taxFrom: 0,   fee: 25, ddpFee: 6 },
  UK: { name: 'United Kingdom', cur: '£',   code: 'GBP', threshold: 135, duty: 4,  tax: 20, taxFrom: 0,   fee: 14, ddpFee: 4 },
  CA: { name: 'Canada',         cur: 'CA$', code: 'CAD', threshold: 20,  duty: 6.5,tax: 13, taxFrom: 20,  fee: 18, ddpFee: 5 },
  AU: { name: 'Australia',      cur: 'A$',  code: 'AUD', threshold: 1000,duty: 5,  tax: 10, taxFrom: 0,   fee: 20, ddpFee: 5 },
};

// Rough order values per market for the slider default (about €67 in each currency).
export const DEFAULT_VALUE = { US: 89, UK: 58, CA: 98, AU: 115 };
