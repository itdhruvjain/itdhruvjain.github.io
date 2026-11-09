// Guided tour of one morning at Cellexia. The reader goes at their own pace (Back / Next).
// Every "Try it" control runs the same rules the hub uses, so what they see is the real logic.
import { POLICY, LANE, NON_EU } from '../data/policy.js';
import { DUTY_MARKETS, DEFAULT_VALUE } from '../data/duties.js';
import { triage, guaranteeCheck } from '../lib/triage.js';
import { parcelStatus } from '../lib/lanes.js';
import { isSpike, spikeRatio, roas, suggestedCap, SPIKE_THRESHOLD } from '../lib/ads.js';
import { landedCost } from '../lib/duties.js';
import { tagTheme } from '../lib/voice.js';
import { createTour } from '../lib/tour.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const D = 864e5, H = 36e5;

/* ---------------- tiny line icons for the flow diagrams ---------------- */
const P = {
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  hub: '<path d="M12 2.5 20.5 7v10L12 21.5 3.5 17V7z"/><circle cx="12" cy="12" r="3"/>',
  store: '<path d="M5 8h14l-1.2 12H6.2z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="m8 12.5 2.8 2.8L16.5 9"/>',
  pen: '<path d="M4 20h4L19.5 8.5l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  person: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3.2 3.2 3.2 14.8 0 18M12 3c-3.2 3.2-3.2 14.8 0 18"/>',
  truck: '<path d="M2 6h11v10H2zM13 9.5h4.5L21 13v3h-8z"/><circle cx="6" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
  chart: '<path d="M3 20h18M6 20v-6M11 20V6M16 20v-9"/>',
  bell: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  star: '<path d="m12 3 2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.8l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z"/>',
};
const icon = k => `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${P[k]}</svg>`;

export function mountTour(el, { S, now, ctx, onResult, track = () => {}, toast = () => {} }) {
  /* ---------------- story data (invented, built through the real libs) ---------------- */
  const helenOrder = S.orders.find(o => o.id === 'CX-DEMO-10612') || { id: 'CX-DEMO-10612', email: 'helen.w@example.com', country: 'UK', items: 'Neck Tightening Cream ×1', total: '£58.00', shippedAt: new Date(now - 15 * D), deliveredAt: new Date(now - 12 * D), carrier: 'DPD', site: '3PL-EU-1' };
  const spikeAd = S.ads.find(a => a.n === 'ELS_US_Video_60Day_V4');
  const themeOf = k => S.themes.find(t => t.key === k);
  const weekCount = t => t.trend.at(-1);

  // Values the reader changes with the "Try it" controls.
  const st = {
    refundDay: 12, country: 'US', shipDays: 8, scanDays: 2, spend: spikeAd.today,
    review: 'Burned around my eyes, I had to stop using it.',
  };

  const helenMail = day => ({ id: 9, from: 'Helen W.', email: 'helen.w@example.com', receivedAt: now, subj: 'Return the neck cream?', body: 'Hi, the neck cream isn’t for me. Can I send it back for a refund? Order CX-DEMO-10612.' });
  const helenTriage = day => triage(helenMail(day), { ...ctx, orders: [{ ...helenOrder, deliveredAt: new Date(now - day * D - H) }] });
  const caParcel = () => ({ o: 'CX-DEMO-10399', m: 'CA', carrier: 'FedEx', last: 'Arrived at sort facility', shippedAt: new Date(now - st.shipDays * D - H), lastScanAt: new Date(now - st.scanDays * D - H) });

  /* ---------------- reusable bits ---------------- */
  const card = (who, sub, body) => `<div class="cx-t-mail"><div class="cx-t-mail-h"><span class="cx-t-av" aria-hidden="true">${esc(who[0])}</span><div><b>${esc(who)}</b><span class="cx-small">${esc(sub)}</span></div></div><p>${body}</p></div>`;
  const compare = (before, after) => `<div class="cx-t-cmp"><div class="cx-t-before"><span class="cx-t-cmp-h">Today, by hand</span><p>${before}</p></div><div class="cx-t-arrow" aria-hidden="true">→</div><div class="cx-t-after"><span class="cx-t-cmp-h">With the hub</span><p>${after}</p></div></div>`;
  const facts = rows => `<dl class="cx-t-facts">${rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${v}</dd></div>`).join('')}</dl>`;
  const verdict = (tone, big, small) => `<div class="cx-t-verdict cx-${tone}"><b>${big}</b>${small ? `<span>${small}</span>` : ''}</div>`;

  /* ---------------- chapters ---------------- */
  const CHAPTERS = [
    {
      key: 'refund', short: 'Refund request', tab: 'support', tabName: 'Support',
      nodes: [['mail', 'Email'], ['hub', 'Hub reads it'], ['store', 'Finds order'], ['check', '60-day rule'], ['pen', 'Drafts reply'], ['person', 'You approve']],
      steps: [
        { at: 2, title: 'A customer asks for a refund',
          text: 'The hub reads her email and finds her order on its own.',
          body: () => card('Helen W.', 'just now', 'Hi, the neck cream isn’t for me. Can I send it back for a refund? Order CX-DEMO-10612.') +
            facts([['Order', `<span class="cx-mono">${helenOrder.id}</span>`], ['Product', esc(helenOrder.items)], ['Paid', esc(helenOrder.total)], ['Delivered', '12 days ago']]) },
        { at: 3, title: 'It checks your 60-day guarantee', try: true,
          text: 'Drag the slider.',
          body: () => `<label class="cx-t-lab" for="cx-t-day">Days since delivery: <output id="cx-t-day-o">${st.refundDay}</output></label>
            <input type="range" id="cx-t-day" min="1" max="90" value="${st.refundDay}" data-k="refundDay">
            <div class="cx-t-zone" aria-hidden="true"><i style="width:${POLICY.guaranteeDays / 90 * 100}%"></i><span>Guarantee: ${POLICY.guaranteeDays} days</span><b data-out="mark"></b></div>
            <div data-out="main" aria-live="polite"></div>`,
          out: { main: () => { const g = guaranteeCheck({ deliveredAt: new Date(now - st.refundDay * D - H) }, now, POLICY); return g.ok
              ? verdict('good', `✓ Day ${g.day}: refund approved`, 'Return number created, reply drafted.')
              : verdict('bad', `✗ Day ${g.day}: outside the guarantee`, 'A kind offer is drafted, and a person decides.'); },
            mark: m => { m.style.left = `calc(${st.refundDay / 90 * 100}% - 1px)`; return ''; } } },
        { at: 5, title: 'A person approves the reply',
          text: 'Nothing is sent until someone clicks Approve.',
          body: () => `<label class="cx-vh" for="cx-t-draft">Drafted reply</label><textarea id="cx-t-draft" rows="6" readonly>${esc(helenTriage(st.refundDay).draft)}</textarea>
            <div class="cx-acts"><button type="button" class="cx-btn" data-demo="Approved (demo, nothing sent).">Approve &amp; send</button></div>
            ${compare('Find the order, count the days, write a reply.', 'Read it, click Approve.')}` },
      ],
    },
    {
      key: 'order', short: 'Order to the US', tab: 'delivery', tabName: 'Delivery',
      nodes: [['store', 'New order'], ['hub', 'Hub checks it'], ['globe', 'Which country?'], ['mail', 'Heads-up'], ['person', 'Customer']],
      steps: [
        { at: 1, title: 'A new order from the US',
          text: 'Shopify tells the hub the moment it’s placed.',
          body: () => facts([['Order', '<span class="cx-mono">CX-DEMO-10650</span>'], ['Product', 'Deep Wrinkle Filler Gel'], ['Paid', '$89.00'], ['Ship to', 'United States']]) },
        { at: 2, title: 'Will the courier charge import fees?', try: true,
          text: 'Pick a country.',
          body: () => `<div class="cx-t-pills" role="group" aria-label="Ship to">${['DE', 'FR', 'IE', 'UK', 'US', 'CA', 'AU'].map(c => `<button type="button" class="cx-t-pill" data-country="${c}" aria-pressed="${st.country === c}">${esc(LANE[c].name)}</button>`).join('')}</div><div data-out="main" aria-live="polite"></div>`,
          out: { main: () => {
            if (!NON_EU.has(st.country)) return verdict('good', `✓ ${esc(LANE[st.country].name)}: no fees expected`, 'Nothing to do.');
            const m = DUTY_MARKETS[st.country], v = DEFAULT_VALUE[st.country], c = landedCost(m, v);
            return verdict('warn', `! About ${m.cur}${Math.round(c.atDoor)} at the door`, `On a ${m.cur}${v} order (illustrative). The hub sends a heads-up.`);
          } } },
        { at: 4, title: 'The customer hears it from you first',
          text: 'No surprise at the door, so no angry review.',
          body: () => { const c = NON_EU.has(st.country) ? st.country : 'US'; const m = DUTY_MARKETS[c]; const est = Math.round(landedCost(m, DEFAULT_VALUE[c]).atDoor);
            return card('The Cellexia team', `to the customer · ${esc(LANE[c].name)}`, `Your order is on its way! For deliveries to ${esc(LANE[c].name)}, the courier may ask for import fees of around ${m.cur}${est}. We wanted you to hear it from us first.`) +
              compare('The customer finds out at the door.', 'A heads-up email the same day.'); } },
      ],
    },
    {
      key: 'parcel', short: 'Late parcel', tab: 'delivery', tabName: 'Delivery',
      nodes: [['truck', 'Carrier scan'], ['hub', 'Morning check'], ['clock', 'On time?'], ['mail', 'Delay email'], ['person', 'Customer']],
      steps: [
        { at: 1, title: 'Every morning, every parcel is checked',
          text: 'This one is going to Canada.',
          body: () => `<div data-out="line"></div>`, out: { line: () => timeline() } },
        { at: 2, title: 'Late, or stuck?', try: true,
          text: 'Move the sliders.',
          body: () => `<label class="cx-t-lab" for="cx-t-ship">Days since it shipped: <output id="cx-t-ship-o">${st.shipDays}</output></label>
            <input type="range" id="cx-t-ship" min="1" max="12" value="${st.shipDays}" data-k="shipDays">
            <label class="cx-t-lab" for="cx-t-scan">Days since the last carrier scan: <output id="cx-t-scan-o">${st.scanDays}</output></label>
            <input type="range" id="cx-t-scan" min="0" max="6" value="${st.scanDays}" data-k="scanDays">
            <div data-out="line"></div><div data-out="main" aria-live="polite"></div>`,
          out: { line: () => timeline(), main: () => { const p = parcelStatus(caParcel(), LANE.CA, now);
            if (p.stuck) return verdict('bad', `✗ Stuck: no scan for ${p.sinceScan} days`, 'Delay email drafted, carrier claim suggested.');
            if (p.pastPromise) return verdict('warn', `! Late: day ${p.sinceShip} of ${LANE.CA.min}–${LANE.CA.max}`, 'Delay email drafted before they ask.');
            return verdict('good', '✓ On track', 'Nothing to do.'); } } },
        { at: 4, title: 'You write before they do',
          text: 'Fewer “where is my order?” emails.',
          body: () => card('The Cellexia team', 'to the customer · Canada', 'Quick update: your order is taking longer than we aim for, and we’re sorry. We’ve asked the courier to check today. If it hasn’t moved in 2 working days, we’ll send a replacement.') +
            compare('The customer chases you.', 'The apology arrives first.') },
      ],
    },
    {
      key: 'ad', short: 'Ad overspend', tab: 'ads', tabName: 'Ads',
      nodes: [['chart', 'Ad spend'], ['hub', 'Morning check'], ['check', 'Spike rule'], ['store', 'Real sales'], ['bell', 'Slack alert']],
      steps: [
        { at: 1, title: 'Every morning, ad spend is read',
          text: 'Here is one ad: its last 7 days, and today.',
          body: () => `<div data-out="bars"></div>`, out: { bars: () => bars() } },
        { at: 2, title: 'Is it suddenly overspending?', try: true,
          text: 'Drag today’s spend.',
          body: () => `<label class="cx-t-lab" for="cx-t-spend">Spend today: €<output id="cx-t-spend-o">${st.spend}</output></label>
            <input type="range" id="cx-t-spend" min="60" max="500" value="${st.spend}" data-k="spend">
            <div data-out="bars"></div><div data-out="main" aria-live="polite"></div>`,
          out: { bars: () => bars(), main: () => { const a = { ...spikeAd, today: st.spend }; const r = spikeRatio(a).toFixed(1);
            return isSpike(a) ? verdict('warn', `! ${r}× a normal day`, `Alert the media buyer. Suggested cap €${suggestedCap(a)}/day.`) : verdict('good', `✓ ${r}× a normal day`, 'No alert.'); } } },
        { at: 4, title: 'The media buyer gets one message',
          text: 'The hub suggests. A person decides.',
          body: () => { const a = { ...spikeAd, today: Math.max(st.spend, Math.ceil(spikeAd.avg7 * SPIKE_THRESHOLD)) };
            return `<div class="cx-slack" role="img" aria-label="Example Slack message"><span class="cx-slack-a" aria-hidden="true">OB</span><div><b>Ops bot</b> <span class="cx-small">#ads · 07:02</span><p>⚠️ <span class="cx-mono">${esc(spikeAd.n)}</span> spent <b>€${a.today}</b> today, ${spikeRatio(a).toFixed(1)}× normal. Real sales return <b>€${roas(spikeAd).toFixed(1)} per €1</b>. Suggested cap: <b>€${suggestedCap(a)}/day</b>.</p></div></div>
            ${compare('A weekly spreadsheet spots it days later.', 'An alert the same morning.')}`; } },
      ],
    },
    {
      key: 'review', short: '1-star review', tab: 'voice', tabName: 'Customer voice',
      nodes: [['star', 'New review'], ['hub', 'Hub reads it'], ['check', 'Finds the theme'], ['pen', 'Drafts reply'], ['person', 'You approve']],
      steps: [
        { at: 1, title: 'A 1-star review appears',
          text: 'Today, negative reviews go unanswered.',
          body: () => card('D. Demo · US · ★☆☆☆☆', 'invented review', 'Burned around my eyes, I had to stop using it.') },
        { at: 2, title: 'What is it really about?', try: true,
          text: 'Pick one, or type your own.',
          body: () => `<div class="cx-t-pills" role="group" aria-label="Sample reviews">${['Burned around my eyes, I had to stop using it.', 'FedEx made me pay $40 extra at the door!', 'Such a tiny tube for the price.', 'Six weeks in and still no difference.'].map(r => `<button type="button" class="cx-t-pill" data-review="${esc(r)}" aria-pressed="${st.review === r}">“${esc(r)}”</button>`).join('')}</div>
            <label class="cx-vh" for="cx-t-rev">Type a review</label><input type="text" id="cx-t-rev" class="cx-t-input" value="${esc(st.review)}" maxlength="200" autocomplete="off" placeholder="Type a review…">
            <div data-out="main" aria-live="polite"></div>`,
          out: { main: () => { const t = tagTheme(st.review), th = themeOf(t.key);
            return th ? verdict(th.kind === 'bad' ? 'bad' : 'warn', `Theme: ${esc(th.t)}`, `This week: ${weekCount(th)} → ${weekCount(th) + 1}`) : verdict('info', 'No theme matched', 'A person files it.'); } } },
        { at: 4, title: 'A reply, ready to approve',
          text: 'And the product team sees the pattern.',
          body: () => { const th = themeOf(tagTheme(st.review).key);
            return (th ? `<label class="cx-vh" for="cx-t-reply">Drafted public reply</label><textarea id="cx-t-reply" rows="4">${esc(th.reply)}</textarea><div class="cx-acts"><button type="button" class="cx-btn" data-demo="Approved (demo, nothing posted).">Approve reply</button></div>`
              : '<p>No theme matched, so a person writes this one.</p>') + compare('No replies to bad reviews.', 'Every review answered within a day.'); } },
      ],
    },
  ];

  /* ---------------- small diagrams ---------------- */
  function timeline() {
    const max = 12, lane = LANE.CA, p = parcelStatus(caParcel(), lane, now);
    const x = d => `${d / max * 100}%`;
    return `<div class="cx-t-tl" role="img" aria-label="Timeline: shipped ${p.sinceShip} days ago, promise ${lane.min} to ${lane.max} days, last scan ${p.sinceScan} days ago">
      <div class="cx-t-tl-bar"><span class="cx-t-tl-win" style="left:${x(lane.min)};width:${x(lane.max - lane.min)}"></span>
        <span class="cx-t-tl-scan" style="left:${x(Math.max(0, p.sinceShip - p.sinceScan))}" title="Last scan"></span>
        <span class="cx-t-tl-now ${p.flagged ? 'is-bad' : ''}" style="left:${x(Math.min(max, p.sinceShip))}"></span></div>
      <div class="cx-t-tl-axis"><span>Shipped</span><span style="left:${x(lane.min)}">Day ${lane.min}</span><span style="left:${x(lane.max)}">Day ${lane.max}</span><span class="cx-t-tl-today" style="left:${x(Math.min(max, p.sinceShip))}">Today</span></div>
      <div class="cx-t-tl-key cx-small"><span><i class="k-win"></i>Promised window</span><span><i class="k-scan"></i>Last carrier scan</span><span><i class="k-now"></i>Today</span></div></div>`;
  }
  function bars() {
    const hist = [0.9, 1.05, 0.95, 1.1, 0.92, 1.0, 1.08].map(f => Math.round(spikeAd.avg7 * f));
    const mx = Math.max(500, ...hist), lim = spikeAd.avg7 * SPIKE_THRESHOLD, hot = isSpike({ ...spikeAd, today: st.spend });
    return `<div class="cx-t-bars" role="img" aria-label="Daily spend for the last 7 days around €${spikeAd.avg7}; today €${st.spend}">
      ${hist.map((v, i) => `<span style="height:${v / mx * 100}%"><em>${['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}</em></span>`).join('')}
      <span class="is-today ${hot ? 'is-hot' : ''}" style="height:${st.spend / mx * 100}%"><em>Today</em></span>
      <b class="cx-t-lim" style="bottom:${lim / mx * 100}%"><small>Alert line ${SPIKE_THRESHOLD}× (€${Math.round(lim)})</small></b></div>`;
  }

  /* ---------------- rendering ---------------- */
  const tour = createTour(CHAPTERS);
  let finale = false;
  const applied = new Set();

  function render(focus = false) {
    const ch = CHAPTERS[tour.chapter], step = tour.current;
    const pct = finale ? 100 : Math.round(tour.position / tour.total * 100);
    el.innerHTML = `
      <div class="cx-t-head">
        <div><p class="cx-eyebrow">Guided tour</p><h3 class="cx-t-h">Five jobs, taken off your team’s plate</h3></div>
        <div class="cx-t-prog" role="progressbar" aria-label="Tour progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><i style="width:${pct}%"></i></div>
      </div>
      <ol class="cx-t-rail" aria-label="Chapters">${CHAPTERS.map((c, i) => `<li><button type="button" data-ch="${i}" aria-current="${!finale && i === tour.chapter ? 'step' : 'false'}" class="${tour.isFinished(c.key) ? 'is-done' : ''}"><span class="cx-t-rail-n" aria-hidden="true">${tour.isFinished(c.key) ? '✓' : i + 1}</span>${esc(c.short)}${tour.isFinished(c.key) ? '<span class="cx-vh"> (seen)</span>' : ''}</button></li>`).join('')}</ol>
      ${finale ? renderFinale() : `
      <div class="cx-t-stage">
        <ol class="cx-flow" aria-label="How it flows">${ch.nodes.map(([ic, label], i) => `<li class="${i < step.at ? 'is-done' : i === step.at ? 'is-now' : ''}"${i === step.at ? ' aria-current="step"' : ''}><span class="cx-flow-ic">${icon(ic)}</span><span class="cx-flow-l">${esc(label)}</span>${i ? '<span class="cx-flow-dot" aria-hidden="true"></span>' : ''}</li>`).join('')}</ol>
        <div class="cx-t-body">
          <p class="cx-t-count">${tour.chapter + 1}.${tour.step + 1}${step.try ? ' <span class="cx-chip cx-info">Try it</span>' : ''}</p>
          <h4 class="cx-t-title" id="cx-t-title" tabindex="-1">${esc(step.title)}</h4>
          <p class="cx-t-text">${esc(step.text)}</p>
          <div class="cx-t-try ${step.try ? 'is-try' : ''}">${step.body()}</div>

        </div>
      </div>
      <div class="cx-t-nav">
        <button type="button" class="cx-btn" data-nav="back" ${tour.isFirst ? 'disabled' : ''}>← Back</button>
        <span class="cx-small cx-t-pos" aria-hidden="true">${tour.position} / ${tour.total}</span>
        ${tour.isChapterEnd ? `<button type="button" class="cx-btn" data-result="${ch.key}">See it in ${esc(ch.tabName)} ↗</button>` : ''}
        <button type="button" class="cx-btn cx-pri" data-nav="next">${tour.isEnd ? 'Finish the tour' : tour.isChapterEnd ? 'Next chapter →' : 'Next →'}</button>
      </div>`}`;
    refreshOut();
    bind();
    if (focus) el.querySelector('#cx-t-title, #cx-t-fin')?.focus({ preventScroll: true });
  }

  function renderFinale() {
    return `<div class="cx-t-fin">
      <h4 id="cx-t-fin" tabindex="-1">That was one morning.</h4>
      <p>Five jobs that today mean five tools and a lot of copy-paste. Connected, each one is a short read and one click from the right person.</p>
      <ul class="cx-t-fin-list">${CHAPTERS.map(c => `<li><span aria-hidden="true">✓</span>${esc(c.short)} <button type="button" class="cx-link" data-result="${c.key}">see it in ${esc(c.tabName)}</button></li>`).join('')}</ul>
      <div class="cx-acts"><a class="cx-btn cx-pri" href="#plan">How I’d work with you</a><button type="button" class="cx-btn" data-nav="restart">Take the tour again</button></div>
    </div>`;
  }

  function refreshOut() {
    if (finale) return;
    const step = tour.current;
    if (!step.out) return;
    el.querySelectorAll('[data-out]').forEach(o => { const f = step.out[o.dataset.out]; if (f) { const h = f(o); if (h !== '' || o.dataset.out !== 'mark') o.innerHTML = h; } });
  }

  function bind() {
    el.querySelectorAll('input[type=range][data-k]').forEach(r => r.addEventListener('input', () => {
      st[r.dataset.k] = +r.value;
      const o = el.querySelector('#' + r.id + '-o'); if (o) o.textContent = r.value;
      refreshOut();
    }));
    el.querySelectorAll('[data-country]').forEach(b => b.addEventListener('click', () => {
      st.country = b.dataset.country;
      el.querySelectorAll('[data-country]').forEach(x => x.setAttribute('aria-pressed', x === b));
      refreshOut();
    }));
    const rev = el.querySelector('#cx-t-rev');
    el.querySelectorAll('[data-review]').forEach(b => b.addEventListener('click', () => {
      st.review = b.dataset.review; if (rev) rev.value = st.review;
      el.querySelectorAll('[data-review]').forEach(x => x.setAttribute('aria-pressed', x === b));
      refreshOut();
    }));
    rev?.addEventListener('input', () => { st.review = rev.value; el.querySelectorAll('[data-review]').forEach(x => x.setAttribute('aria-pressed', x.dataset.review === st.review)); refreshOut(); });
    el.querySelectorAll('[data-demo]').forEach(b => b.addEventListener('click', () => { toast(b.dataset.demo); b.disabled = true; b.textContent = 'Approved'; }));
  }

  el.addEventListener('click', e => {
    const n = e.target.closest('[data-nav]'), c = e.target.closest('[data-ch]'), r = e.target.closest('[data-result]');
    if (n) {
      const k = n.dataset.nav;
      if (k === 'next') { if (tour.isEnd) { finale = true; track('tour_done'); } else { const was = tour.chapter; tour.next(); if (tour.chapter !== was) track('tour_chapter_' + CHAPTERS[tour.chapter].key); } }
      if (k === 'back') { if (!finale) tour.back(); }
      if (k === 'restart') { finale = false; tour.goto(0); track('tour_restart'); }
      render(true);
    } else if (c) { finale = false; tour.goto(+c.dataset.ch); render(true); }
    else if (r) {
      const ch = CHAPTERS.find(x => x.key === r.dataset.result);
      if (!applied.has(ch.key)) { applied.add(ch.key); onResult(ch.key, true); } else onResult(ch.key, false);
      track('tour_result_' + ch.key);
    }
  });
  el.addEventListener('keydown', e => {
    if (e.target.matches('input, textarea, select') || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === 'ArrowRight' && !finale) { el.querySelector('[data-nav=next]')?.click(); e.preventDefault(); }
    if (e.key === 'ArrowLeft' && !finale) { el.querySelector('[data-nav=back]:not(:disabled)')?.click(); e.preventDefault(); }
  });

  render();
  return {
    start() { finale = false; if (tour.position !== 1) tour.goto(0); render(true); track('tour_start'); },
  };
}
