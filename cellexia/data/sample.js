// INVENTED SAMPLE DATA. None of these orders, customers, emails, ads or reviews are real.
// Names are made up, emails use example.com, order numbers use the CX-DEMO- prefix.
// Edit freely: every number on the page is computed from what is here.
//
// Dates are built relative to `now`, so the demo always looks like "this morning".

const H = 36e5, D = 864e5;

export function buildSample(now = new Date()) {
  const t = +now;
  const hAgo = h => new Date(t - h * H);
  const dAgo = d => new Date(t - d * D);

  /* ---------------- orders ---------------- */
  const orders = [
    { id: 'CX-DEMO-10482', email: 'jane.p@example.com',  country: 'US', items: 'Deep Wrinkle Filler Gel ×2', total: '$138.00', shippedAt: dAgo(9),  deliveredAt: null,     lastScanAt: dAgo(4.5), carrier: 'FedEx', tracking: 'DEMO-FX-7731', site: '3PL-EU-1' },
    { id: 'CX-DEMO-10391', email: 'marta.g@example.com', country: 'ES', items: 'Eye Lifting Serum ×1',       total: '€67.00',  shippedAt: dAgo(24), deliveredAt: dAgo(21), carrier: 'GLS',   tracking: 'DEMO-GL-5520', site: '3PL-EU-1' },
    { id: 'CX-DEMO-10566', email: 'sophie.l@example.com',country: 'FR', items: 'Cellular Renewal Cream ×1',  total: '€67.00',  shippedAt: dAgo(3),  deliveredAt: hAgo(30), carrier: 'Colissimo', tracking: 'DEMO-CO-8812', site: '3PL-EU-2' },
    { id: 'CX-DEMO-10277', email: 'linda.r@example.com', country: 'AU', items: 'Deep Wrinkle Filler Gel ×1, Neck Tightening Cream ×1', total: 'A$228.00', shippedAt: dAgo(16), deliveredAt: dAgo(8), carrier: 'FedEx', tracking: 'DEMO-FX-7730', site: '3PL-EU-1' },
    { id: 'CX-DEMO-10601', email: 'karen.t@example.com', country: 'UK', items: 'Eye Lifting Serum ×1',       total: '£58.00',  shippedAt: dAgo(2),  deliveredAt: null,     lastScanAt: dAgo(1), carrier: 'DPD',   tracking: 'DEMO-DP-1550', site: '3PL-EU-1' },
    { id: 'CX-DEMO-10530', email: 'peter.k@example.com', country: 'DE', items: 'Neck Tightening Cream ×1',   total: '€67.00',  shippedAt: dAgo(4),  deliveredAt: dAgo(2),  carrier: 'DHL',   tracking: 'DEMO-DH-0034', site: '3PL-EU-2', receivedItem: 'Dark Spot Corrector' },
    { id: 'CX-DEMO-09874', email: 'ruth.m@example.com',  country: 'CA', items: 'Anti-Cellulite Cream ×1',    total: 'CA$98.00', shippedAt: dAgo(80), deliveredAt: dAgo(74), carrier: 'FedEx', tracking: 'DEMO-FX-7729', site: '3PL-EU-1' },
  ];

  /* ---------------- support inbox ---------------- */
  const emails = [
    { id: 1, from: 'Jane P.',   email: 'jane.p@example.com',   receivedAt: hAgo(2),  subj: 'Where is my order??',          body: 'Hi, I ordered 9 days ago (CX-DEMO-10482) and the tracking hasn’t moved since Thursday. Your site said 5–7 days to the US. Can you check please?' },
    { id: 2, from: 'Marta G.',  email: 'marta.g@example.com',  receivedAt: hAgo(2.3),subj: 'Refund please',                body: 'Hola, I used the eye serum for three weeks. It stings every time and I don’t see a difference. I would like my money back as your guarantee says. Order CX-DEMO-10391.' },
    { id: 3, from: 'Sophie L.', email: 'sophie.l@example.com', receivedAt: hAgo(2.6),subj: 'Pump broken on arrival',       body: 'Bonjour, my cream arrived yesterday and the pump is broken, nothing comes out. Photo attached. Order CX-DEMO-10566.' },
    { id: 4, from: 'Linda R.',  email: 'linda.r@example.com',  receivedAt: hAgo(4),  subj: 'Why did I pay extra to FedEx?', body: 'I was charged A$41 by FedEx before they would hand over my parcel. Nobody told me about this when I ordered. Not happy.' },
    { id: 5, from: 'Karen T.',  email: 'karen.t@example.com',  receivedAt: hAgo(5),  subj: 'Using the serum with retinol',  body: 'Hello, my order CX-DEMO-10601 is on its way. Can I use the Eye Lifting Serum at the same time as my retinol cream at night?' },
    { id: 6, from: 'Peter K.',  email: 'peter.k@example.com',  receivedAt: hAgo(20), subj: 'Wrong product',                 body: 'I ordered the Neck Tightening Cream but received a Dark Spot Corrector instead. Please send the right one. CX-DEMO-10530' },
    { id: 7, from: 'Ruth M.',   email: 'ruth.m@example.com',   receivedAt: hAgo(22), subj: 'No results, refund?',           body: 'I have used the anti-cellulite cream for over two months and honestly see no change. Can I get a refund? Order CX-DEMO-09874.' },
    { id: 8, from: 'Ann D.',    email: 'ann.d@example.com',    receivedAt: hAgo(23), subj: 'Following up',                  body: 'Hi, just following up on what we discussed before. Can someone call me back when you get a moment? Thanks.' },
  ];

  /* ---------------- delivery ---------------- */
  // 30 days of delivered shipments per lane, generated with a fixed seed so the numbers don't jump.
  // [lane, count, mean days, spread]
  const LANE_SHAPE = [
    ['DE', 60, 2.0, 1.4], ['FR', 40, 2.6, 1.4], ['IE', 30, 3.0, 1.6], ['NL', 25, 1.6, 1.0], ['ES', 30, 2.7, 1.8],
    ['UK', 70, 4.2, 2.0], ['US', 90, 7.6, 3.4], ['CA', 25, 7.0, 3.0], ['AU', 30, 8.2, 3.0],
  ];
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const shipments = [];
  for (const [m, n, mean, spread] of LANE_SHAPE) {
    for (let i = 0; i < n; i++) {
      const days = Math.max(1, Math.round(mean + (rnd() + rnd() - 1) * spread));
      shipments.push({ m, days });
    }
  }

  // Parcels still in transit, with the last carrier scan.
  const parcels = [
    { o: 'CX-DEMO-10482', m: 'US', carrier: 'FedEx', last: 'Departed hub',          shippedAt: dAgo(9), lastScanAt: dAgo(4) },
    { o: 'CX-DEMO-10455', m: 'US', carrier: 'FedEx', last: 'Clearance delay',       shippedAt: dAgo(8), lastScanAt: dAgo(5) },
    { o: 'CX-DEMO-10419', m: 'AU', carrier: 'FedEx', last: 'At local facility',     shippedAt: dAgo(7), lastScanAt: dAgo(3) },
    { o: 'CX-DEMO-10503', m: 'ES', carrier: 'GLS',   last: 'Delivery attempt failed', shippedAt: dAgo(4), lastScanAt: dAgo(3) },
    { o: 'CX-DEMO-10601', m: 'UK', carrier: 'DPD',   last: 'In transit',            shippedAt: dAgo(2), lastScanAt: dAgo(1) },
    { o: 'CX-DEMO-10611', m: 'DE', carrier: 'DHL',   last: 'Out for delivery',      shippedAt: dAgo(1), lastScanAt: hAgo(3) },
  ];

  /* ---------------- ads (last 7 days, revenue = Shopify orders with the ad's UTM tags) ---------------- */
  const ads = [
    { n: 'WFG_US_UGC_MorningRoutine_V3', ch: 'Meta',    m: 'US', spend: 1840, rev: 6120, today: 270, avg7: 262, status: 'Active' },
    { n: 'WFG_UK_UGC_DermQuote_V2',      ch: 'Meta',    m: 'UK', spend: 1210, rev: 4470, today: 180, avg7: 173, status: 'Active' },
    { n: 'CRC_DE_Static_BeforeAfter_V1', ch: 'Meta',    m: 'DE', spend: 960,  rev: 3360, today: 141, avg7: 137, status: 'Active' },
    { n: 'ELS_US_Video_60Day_V4',        ch: 'YouTube', m: 'US', spend: 1520, rev: 3040, today: 372, avg7: 177, status: 'Active' },
    { n: 'NTC_AU_UGC_Jawline_V1',        ch: 'Meta',    m: 'AU', spend: 640,  rev: 1150, today: 98,  avg7: 91,  status: 'Active' },
    { n: 'wrinkle gel new test FINAL',   ch: 'Meta',    m: 'US', spend: 310,  rev: 620,  today: 52,  avg7: 44,  status: 'Active' },
    { n: 'WFG_FR_Static_Science_V2',     ch: 'Meta',    m: 'FR', spend: 540,  rev: 2050, today: 0,   avg7: 77,  status: 'Disapproved' },
    { n: 'DSC_UK_Video_Hook_V1',         ch: 'YouTube', m: 'UK', spend: 420,  rev: 880,  today: 66,  avg7: 60,  status: 'Active' },
    { n: 'WFG_CA_UGC_MorningRoutine_V1', ch: 'Meta',    m: 'CA', spend: 380,  rev: 1290, today: 57,  avg7: 54,  status: 'Active' },
    { n: 'CRC_ES_Static_Results_V2',     ch: 'Meta',    m: 'ES', spend: 460,  rev: 1610, today: 68,  avg7: 66,  status: 'Active' },
  ];
  // All store revenue and all ad spend per market, last 7 days (for MER).
  const markets = [
    { m: 'DE', spend: 1500, revenue: 5600 }, { m: 'UK', spend: 1900, revenue: 6500 }, { m: 'FR', spend: 800, revenue: 2700 },
    { m: 'ES', spend: 650, revenue: 2150 }, { m: 'CA', spend: 520, revenue: 1600 }, { m: 'US', spend: 4100, revenue: 10700 },
    { m: 'AU', spend: 900, revenue: 1700 },
  ];

  /* ---------------- customer voice ---------------- */
  // Theme labels follow public complaint themes; counts and trends are invented.
  // trend = mentions per week, oldest first.
  const themes = [
    { key: 'duties',   t: 'Surprise import fees at the door', kind: 'bad',  trend: [3, 3, 4, 4, 5, 6, 7],
      reply: 'Thank you for telling us, and we’re sorry. You should have known about import fees before you ordered. We’ve emailed you about a goodwill credit, and we’re adding a fee estimate to checkout so it doesn’t catch anyone else out. — The Cellexia team',
      product: 'Show estimated import fees on product, cart and confirmation pages for UK, US, CA and AU. Price up duties-paid shipping for the US.' },
    { key: 'menthol',  t: 'Tingling or irritation (menthol)', kind: 'warn', trend: [2, 2, 3, 2, 3, 3, 4],
      reply: 'We’re sorry it didn’t agree with your skin. The cooling feeling comes from menthol, and it should be kept away from the eye itself. You’re covered by our 60-day guarantee, so reply to your order email and we’ll sort a refund. — The Cellexia team',
      product: 'Add a clear “contains menthol, keep away from eyes” line to the product page and box insert. Consider a patch-test tip in the welcome email.' },
    { key: 'size',     t: 'Small tube for the price',         kind: 'warn', trend: [2, 1, 2, 2, 2, 3, 3],
      reply: 'Thanks for the honest feedback. A little goes a long way, and one tube is meant to last about a month with daily use. We’ve passed this to our product team. — The Cellexia team',
      product: 'Consider a clear tube or a fill-level window, and state “lasts about X weeks” on the product page.' },
    { key: 'patience', t: 'Results take weeks',               kind: 'warn', trend: [3, 3, 2, 3, 2, 2, 2],
      reply: 'Thank you for sticking with it. Most people notice changes after a few weeks of daily use, and you have 60 days to decide. If it isn’t for you, reply to your order email and we’ll refund you. — The Cellexia team',
      product: 'Day-21 email: “most people start to notice changes around now”. Lead ads with a realistic timeline.' },
    { key: 'local',    t: 'Hard to buy locally',              kind: 'info', trend: [1, 1, 1, 2, 1, 1, 2],
      reply: 'Thanks for asking. Right now we sell online and through selected pharmacies in Germany. We’ll share any news about local stockists by email. — The Cellexia team',
      product: 'Track which countries ask most, to inform where to look for stockists next.' },
  ];
  // Invented reviews, written for this demo (not quoted from any real review).
  const reviews = [
    { who: 'A. Demo · US · 1★', theme: 'duties',  text: 'Paid a big courier fee on delivery that I wasn’t warned about.' },
    { who: 'B. Demo · UK · 2★', theme: 'menthol', text: 'Made my eyes water the first few times.' },
    { who: 'C. Demo · AU · 2★', theme: 'size',    text: 'Tiny tube for what it costs.' },
  ];

  return { now: new Date(t), orders, emails, shipments, parcels, ads, markets, themes, reviews, ordersYesterday: 412 };
}
