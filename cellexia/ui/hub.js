// Interactive Ops Hub: tabs, panels and the scenario player.
// Loaded lazily by page.js when the hub scrolls near the viewport.
import { POLICY, LANE, LANES, NON_EU } from '../data/policy.js';
import { buildSample } from '../data/sample.js';
import { triage } from '../lib/triage.js';
import { laneSummary, overallOnTime, findStuck, parcelStatus } from '../lib/lanes.js';
import { adFlags, roas, totals, merByMarket, weeklySummary, suggestedCap, spikeRatio } from '../lib/ads.js';
import { createPlayer } from '../lib/scenario.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const eur = n => '€' + Math.round(n).toLocaleString('en-GB');
const pct = n => Math.round(n * 100) + '%';
const D = 864e5, H = 36e5;
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const time = d => d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
const when = (d, now) => (now - d < 18 * H ? time(d) : 'Yesterday');

export function initHub(root, { track = () => {}, toast = () => {} } = {}) {
  const S = buildSample(new Date());
  const now = S.now;
  const ctx = { orders: S.orders, policy: POLICY, lanes: LANE, nonEu: NON_EU };
  const st = { sel: 1, sent: new Set(), escalated: new Set(), edits: {}, notices: [], alerts: [], runs: [], report: '', tab: 'today' };
  const $ = sel => root.querySelector(sel);

  /* ------------------------------------------------------------ shell + ARIA tabs */
  const TABS = [['today', 'Today'], ['support', 'Support'], ['delivery', 'Delivery'], ['ads', 'Ads'], ['voice', 'Customer voice']];
  root.innerHTML = `
    <div class="cx-hub-bar">
      <div role="tablist" aria-label="Ops Hub views" class="cx-tabs">
        ${TABS.map(([k, l], i) => `<button role="tab" type="button" id="cx-tab-${k}" aria-controls="cx-panel-${k}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}" data-tab="${k}">${l}<span class="cx-tab-n" data-count="${k}"></span></button>`).join('')}
      </div>
      <span class="cx-hub-date">${now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })} · sample data</span>
    </div>
    ${TABS.map(([k], i) => `<div role="tabpanel" id="cx-panel-${k}" aria-labelledby="cx-tab-${k}" tabindex="0" class="cx-panel" ${i ? 'hidden' : ''}></div>`).join('')}`;

  const tabs = [...root.querySelectorAll('[role=tab]')];
  function selectTab(k, { focus = false, silent = false } = {}) {
    st.tab = k;
    tabs.forEach(t => {
      const on = t.dataset.tab === k;
      t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1;
      if (on && focus) t.focus();
    });
    root.querySelectorAll('[role=tabpanel]').forEach(p => { p.hidden = p.id !== 'cx-panel-' + k; });
    if (!silent) track('tab_' + k);
  }
  root.querySelector('[role=tablist]').addEventListener('click', e => { const t = e.target.closest('[role=tab]'); if (t) selectTab(t.dataset.tab); });
  root.querySelector('[role=tablist]').addEventListener('keydown', e => {
    const i = tabs.indexOf(document.activeElement); if (i < 0) return;
    const go = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
    if (go === undefined) return;
    e.preventDefault();
    selectTab(tabs[(go + tabs.length) % tabs.length].dataset.tab, { focus: true });
  });

  /* ------------------------------------------------------------ shared bits */
  const chip = (tone, text) => `<span class="cx-chip cx-${tone}">${esc(text)}</span>`;
  const how = (title, h) => `<details class="cx-how"><summary>How this works${title ? ': ' + esc(title) : ''}</summary>
    <ol class="cx-how-flow">
      <li><b>Trigger</b><span>${esc(h.trigger)}</span></li>
      <li><b>System</b><span>${esc(h.system)}</span></li>
      <li><b>API</b><code>${esc(h.api)}</code></li>
      <li><b>A person approves</b><span>${esc(h.approve)}</span></li>
    </ol></details>`;
  const mark = ok => ok === true ? '<i class="cx-ok" aria-label="Passes">✓</i>' : ok === false ? '<i class="cx-no" aria-label="Fails">✗</i>' : '<i class="cx-nb" aria-label="Note">i</i>';

  const triaged = () => S.emails.map(e => ({ e, t: triage(e, ctx) }));
  const stuckList = () => findStuck(S.parcels, LANE, now);
  const themeCount = t => t.trend.reduce((a, x) => a + x, 0);

  /* ------------------------------------------------------------ TODAY */
  function todayData() {
    const tot = totals(S.ads);
    const open = S.emails.filter(e => !st.sent.has(e.id)).length;
    const flagged = stuckList().filter(p => p.flagged).length;
    const people = triaged().filter(x => x.t.route === 'person' && !st.sent.has(x.e.id)).length;
    const adIssues = S.ads.filter(a => adFlags(a).some(f => f.kind !== 'low')).length;
    const rising = S.themes.filter(t => t.kind !== 'good' && t.trend.at(-1) > t.trend.at(-2));
    const attention = [
      ...st.alerts,
      [flagged ? 'bad' : 'good', `${flagged} parcels need attention`, 'Past the delivery promise or no carrier scan for too long.', 'delivery'],
      ['warn', `${adIssues} ads flagged`, 'Spend spikes, a disapproval and names that break the convention.', 'ads'],
      ['info', `${open} open emails: ${open - people} drafted, ${people} for a person`, 'Every draft waits for approval.', 'support'],
      ...(rising.length ? [['warn', `Rising this week: ${rising.map(t => t.t.toLowerCase()).slice(0, 2).join(', ')}`, 'Replies drafted per theme.', 'voice']] : []),
    ];
    $('#cx-kpis').innerHTML = `
        <li><span class="cx-k-l">Orders yesterday</span><span class="cx-k-v">${S.ordersYesterday}</span><span class="cx-k-d">All markets</span></li>
        <li><span class="cx-k-l">Open tickets</span><span class="cx-k-v">${open}</span><span class="cx-k-d">${people} need a person</span></li>
        <li><span class="cx-k-l">Stuck parcels</span><span class="cx-k-v">${flagged}</span><span class="cx-k-d">${overallOnTime(laneSummary(S.shipments, LANES))}% on time (30 days)</span></li>
        <li><span class="cx-k-l">Ad spend → revenue</span><span class="cx-k-v">${eur(tot.spend)} → ${eur(tot.rev)}</span><span class="cx-k-d">${tot.roas.toFixed(1)}× ROAS, last 7 days</span></li>`;
    $('#cx-att').innerHTML = attention.map(([s, t, d, v, isNew]) => `<li class="${isNew ? 'cx-new' : ''}"><span class="cx-sev cx-${s}" aria-hidden="true"></span><div><b>${esc(t)}</b><p>${esc(d)}</p></div><button type="button" class="cx-link" data-go="${v}">Open <span class="cx-vh">${esc(TABS.find(x => x[0] === v)[1])}</span></button></li>`).join('');
  }
  function renderToday() {
    $('#cx-panel-today').innerHTML = `
      <ul class="cx-kpis" id="cx-kpis" aria-label="Key numbers"></ul>
      <div class="cx-today">
        <section class="cx-card cx-player" aria-labelledby="cx-player-h">
          <h3 id="cx-player-h">Scenario player</h3>
          <p class="cx-small">Five automations from a typical morning, one at a time. Watch each step land in the log.</p>
          <ol class="cx-scn">${SCENARIOS.map((s, i) => `<li data-scn="${i}"><span class="cx-scn-n" aria-hidden="true">${i + 1}</span><span><b>${esc(s.name)}</b><span class="cx-small">${esc(s.sub)}</span></span><span class="cx-vh" data-scn-state></span></li>`).join('')}</ol>
          <div class="cx-ctrls">
            <button type="button" class="cx-btn cx-pri" data-ctl="play"></button>
            <button type="button" class="cx-btn" data-ctl="pause">Pause</button>
            <button type="button" class="cx-btn" data-ctl="skip">Skip</button>
            <button type="button" class="cx-btn" data-ctl="replay">Replay</button>
          </div>
          <p class="cx-small cx-status" aria-live="polite" id="cx-pstatus"></p>
        </section>
        <section class="cx-card cx-logbox" aria-labelledby="cx-log-h">
          <h3 id="cx-log-h">Automation log</h3>
          <div id="cx-log"></div>
        </section>
      </div>
      <section class="cx-card" aria-labelledby="cx-att-h">
        <h3 id="cx-att-h">Needs attention</h3>
        <ul class="cx-alerts" id="cx-att"></ul>
      </section>`;
    todayData();
  }
  const scnClass = i => (player.index > i || player.state === 'ended') ? 'is-done' : (player.index === i && player.state !== 'idle') ? 'is-run' : '';
  const scnLabel = i => scnClass(i) === 'is-done' ? '(done)' : scnClass(i) === 'is-run' ? '(running)' : '(waiting)';
  const playLabel = () => player.state === 'paused' ? '▶ Resume' : player.state === 'ended' ? '▶ Play again' : '▶ Play the whole morning';
  const statusText = () => ({ idle: 'Ready.', playing: `Running ${Math.min(player.index + 1, SCENARIOS.length)} of ${SCENARIOS.length}…`, paused: 'Paused.', ended: 'Morning done. Open the other tabs to see where each result landed.' }[player.state]);

  function renderLog() {
    if (!st.runs.length) return '<p class="cx-empty">Nothing has run yet. Press “Play the whole morning”.</p>';
    return `<ol class="cx-runs">${st.runs.map(r => `<li class="cx-run">
      <div class="cx-run-h">${chip('info', r.s.src)}<b>${esc(r.s.title)}</b><span class="cx-small">${r.time}</span></div>
      <ol class="cx-steps">${r.s.steps.map((x, i) => `<li class="${i <= r.step ? (r.s.wait && i === r.s.steps.length - 1 ? 'is-wait' : 'is-on') : ''}">${esc(x)}</li>`).join('')}</ol>
      ${r.s.slack && r.step >= r.s.steps.length - 1 ? r.s.slack() : ''}
      ${how('', r.s.how)}</li>`).join('')}</ol>`;
  }

  /* ------------------------------------------------------------ SUPPORT */
  function renderSupport(focusSel = false) {
    const tr = triaged();
    const cur = tr.find(x => x.e.id === st.sel) || tr[0];
    const { e, t } = cur;
    const sent = st.sent.has(e.id), esc8 = st.escalated.has(e.id);
    const draft = st.edits[e.id] ?? t.draft;
    const conf = Math.round(t.confidence * 100);
    $('#cx-panel-support').innerHTML = `
      <div class="cx-support">
        <ul class="cx-inbox" aria-label="Inbox">${tr.map(({ e: m, t: x }) => `<li><button type="button" class="cx-mail ${m.isNew ? 'cx-new' : ''}" data-mail="${m.id}" aria-current="${m.id === e.id}">
          <span class="cx-mail-f"><span>${esc(m.from)}</span><span class="cx-small">${when(m.receivedAt, now)}</span></span>
          <span class="cx-mail-s">${esc(m.subj)}</span>
          ${st.sent.has(m.id) ? chip('mute', 'Sent') : st.escalated.has(m.id) ? chip('mute', 'Escalated') : x.route === 'person' ? chip('bad', 'Needs a person') : chip(x.tone, x.intent.label)}
        </button></li>`).join('')}</ul>
        <article class="cx-card cx-thread" aria-labelledby="cx-subj">
          <header class="cx-thread-h"><h3 id="cx-subj">${esc(e.subj)}</h3><span class="cx-small">${esc(e.from)} · ${esc(e.email)} · ${when(e.receivedAt, now)}</span></header>
          <blockquote class="cx-msg">${esc(e.body)}</blockquote>
          <dl class="cx-facts">
            <div><dt>Detected intent</dt><dd>${esc(t.intent.label)}</dd></div>
            <div><dt>Confidence</dt><dd><meter min="0" max="100" low="60" optimum="100" value="${conf}" aria-label="Confidence">${conf}%</meter> ${conf}%</dd></div>
            <div><dt>Order</dt><dd class="cx-mono">${t.order ? esc(t.order.id) : '—'}</dd></div>
            <div><dt>Items</dt><dd>${t.order ? esc(t.order.items) : '—'}</dd></div>
          </dl>
          <h4 class="cx-eyebrow">Policy and order checks</h4>
          <ul class="cx-checks">${t.checks.map(c => `<li>${mark(c.ok)}<span>${esc(c.label)}<span class="cx-rule">Rule: ${esc(c.rule)}</span></span></li>`).join('')}</ul>
          ${t.route === 'person' ? `<p class="cx-person"><b>Routed to a person.</b> ${esc(t.reason)}</p>` : `
          <label class="cx-eyebrow" for="cx-draft">Drafted reply ${sent ? '(sent)' : ''}</label>
          <textarea id="cx-draft" rows="9" readonly>${esc(draft)}</textarea>
          <p class="cx-small">${esc(t.reason)}</p>`}
          <div class="cx-acts">
            ${t.actions.map((a, i) => `<button type="button" class="cx-btn" data-act="${i}">${esc(a.label)}</button>`).join('')}
            <span class="cx-sp"></span>
            ${t.route === 'draft' ? `<button type="button" class="cx-btn" data-edit ${sent ? 'disabled' : ''}>Edit</button>` : ''}
            <button type="button" class="cx-btn" data-esc ${sent || esc8 ? 'disabled' : ''}>${esc8 ? 'Escalated' : 'Escalate'}</button>
            ${t.route === 'draft' ? `<button type="button" class="cx-btn cx-pri" data-send ${sent ? 'disabled' : ''}>${sent ? 'Sent' : 'Approve & send'}</button>` : ''}
          </div>
          ${how('support triage', { trigger: 'A new email or helpdesk ticket arrives (helpdesk webhook, or Gmail push via Pub/Sub; tool to confirm)', system: 'Ops service: keyword intent + confidence, Shopify order lookup, policy rules from config; an LLM writes the reply from an approved template and the order facts only', api: 'Shopify Admin GraphQL orders(query: "name:CX-…") · helpdesk API: create draft reply', approve: `An agent approves, edits or escalates every reply. Below ${Math.round(POLICY.minConfidence * 100)}% confidence nothing is drafted.` })}
        </article>
      </div>`;
    const panel = $('#cx-panel-support');
    if (focusSel) panel.querySelector(`[data-mail="${e.id}"]`)?.focus();
    panel.querySelectorAll('[data-mail]').forEach(b => b.onclick = () => { st.sel = +b.dataset.mail; renderSupport(true); });
    panel.querySelectorAll('[data-act]').forEach(b => b.onclick = () => { toast(t.actions[+b.dataset.act].done + ' (demo)'); b.disabled = true; });
    const ta = panel.querySelector('#cx-draft');
    if (ta) ta.oninput = () => { st.edits[e.id] = ta.value; };
    panel.querySelector('[data-edit]')?.addEventListener('click', ev => { ta.readOnly = false; ta.focus(); ev.currentTarget.disabled = true; });
    panel.querySelector('[data-esc]')?.addEventListener('click', () => { st.escalated.add(e.id); toast(`Escalated to the support lead (demo)`); renderSupport(); panel.querySelector('[data-esc]')?.focus(); });
    panel.querySelector('[data-send]')?.addEventListener('click', () => {
      st.sent.add(e.id); toast(`Reply sent to ${e.from} (demo, nothing was sent)`);
      const next = triaged().find(x => !st.sent.has(x.e.id) && x.t.route === 'draft');
      if (next) st.sel = next.e.id;
      renderSupport(true); refreshCounts();
    });
  }

  /* ------------------------------------------------------------ DELIVERY */
  function renderDelivery() {
    const lanes = laneSummary(S.shipments, LANES);
    const stuck = stuckList();
    const tone = v => v >= 90 ? 'good' : v >= 80 ? 'warn' : 'bad';
    $('#cx-panel-delivery').innerHTML = `
      <section class="cx-card" aria-labelledby="cx-lanes-h">
        <h3 id="cx-lanes-h">Delivery by lane, last 30 days</h3>
        <div class="cx-tablewrap" tabindex="0" role="region" aria-label="Lanes table, scrollable"><table class="cx-table">
          <thead><tr><th scope="col">Lane</th><th scope="col">Promised</th><th scope="col" class="cx-r">Actual avg</th><th scope="col">On time</th><th scope="col" class="cx-r">Shipments</th></tr></thead>
          <tbody>${lanes.map(l => `<tr><th scope="row">${esc(l.name)}<span class="cx-small"> ${esc(l.group === 'Europe' ? 'Europe' : '')}</span></th><td>${l.min}–${l.max} days</td>
            <td class="cx-r ${l.late ? 'cx-down' : ''}">${l.avg.toFixed(1)} days</td>
            <td><span class="cx-bar" aria-hidden="true"><i class="cx-${tone(l.onTime)}" style="width:${l.onTime}%"></i></span> ${chip(tone(l.onTime), l.onTime + '%')}</td>
            <td class="cx-r">${l.orders}</td></tr>`).join('')}</tbody></table></div>
        <p class="cx-small">Promise windows are my reading of the public shipping page (assumption, to confirm). Shipment counts and days are invented.</p>
      </section>
      <section class="cx-card" aria-labelledby="cx-stuck-h">
        <h3 id="cx-stuck-h">Parcels in transit</h3>
        <div class="cx-tablewrap" tabindex="0" role="region" aria-label="Parcels table, scrollable"><table class="cx-table">
          <thead><tr><th scope="col">Order</th><th scope="col">Lane</th><th scope="col">Last scan</th><th scope="col" class="cx-r">Days since scan / limit</th><th scope="col">Status</th><th scope="col"><span class="cx-vh">Action</span></th></tr></thead>
          <tbody>${stuck.map(p => `<tr class="${p.isNew ? 'cx-new' : ''}"><th scope="row" class="cx-mono">${esc(p.o)}</th><td>${esc(p.m)} · ${esc(p.carrier)}</td><td>${esc(p.last)}</td>
            <td class="cx-r ${p.stuck ? 'cx-down' : ''}">${p.sinceScan} / ${p.limit}</td>
            <td>${p.stuck ? chip('bad', 'Stuck') : p.pastPromise ? chip('warn', `Past ${p.promiseMax}-day promise`) : chip('good', 'Moving')}</td>
            <td class="cx-r">${p.flagged ? `<button type="button" class="cx-link" data-notify="${esc(p.o)}">${p.notified ? 'Drafted' : 'Draft delay email'}</button>` : ''}</td></tr>`).join('')}</tbody></table></div>
        ${st.notices.length ? `<p class="cx-small"><b>Import-fee notices queued:</b> ${st.notices.map(esc).join(', ')}</p>` : ''}
        ${how('stuck parcels', { trigger: 'Carrier tracking events, plus a scheduled check every morning', system: 'Ops service compares days since the last scan with the lane limit, and days since dispatch with the promise (lib/lanes.js)', api: 'AfterShip Tracking API: webhook tracking_update · GET /trackings', approve: 'Ops approves the delay-email template once; one-off messages need a click' })}
      </section>`;
    $('#cx-panel-delivery').querySelectorAll('[data-notify]').forEach(b => b.onclick = () => { toast(`Delay email drafted for ${b.dataset.notify} (demo)`); b.textContent = 'Drafted'; b.disabled = true; });
  }

  /* ------------------------------------------------------------ ADS */
  function renderAds() {
    const tot = totals(S.ads), mer = merByMarket(S.markets), max = Math.max(4.5, ...mer.map(x => x.mer));
    $('#cx-panel-ads').innerHTML = `
      <section class="cx-card" aria-labelledby="cx-ads-h">
        <h3 id="cx-ads-h">Campaigns, last 7 days <span class="cx-small">· ${eur(tot.spend)} spend, ${eur(tot.rev)} revenue, ${tot.roas.toFixed(2)} ROAS</span></h3>
        <div class="cx-tablewrap" tabindex="0" role="region" aria-label="Campaigns table, scrollable"><table class="cx-table">
          <thead><tr><th scope="col">Ad</th><th scope="col">Channel</th><th scope="col" class="cx-r">Spend</th><th scope="col" class="cx-r">Revenue</th><th scope="col" class="cx-r">ROAS</th><th scope="col">Flags</th></tr></thead>
          <tbody>${S.ads.map(a => { const f = adFlags(a); return `<tr class="${a.isNew ? 'cx-new' : ''}"><th scope="row" class="cx-mono cx-wrap">${esc(a.n)}</th><td>${esc(a.ch)} · ${esc(a.m)}</td>
            <td class="cx-r">${eur(a.spend)}</td><td class="cx-r">${eur(a.rev)}</td><td class="cx-r ${roas(a) < 2.5 ? 'cx-down' : ''}">${roas(a).toFixed(1)}</td>
            <td>${f.length ? f.map(x => `<span title="${esc(x.detail)}">${chip(x.tone, x.label)}</span>`).join(' ') : chip('good', 'OK')}</td></tr>`; }).join('')}</tbody></table></div>
        <p class="cx-small">Naming convention (my proposal): PRODUCT_MARKET_FORMAT_Angle_V#. Revenue is Shopify orders with the ad’s UTM tags, not the ad platform’s estimate.</p>
      </section>
      <div class="cx-two">
        <section class="cx-card" aria-labelledby="cx-mer-h">
          <h3 id="cx-mer-h">MER by market</h3>
          <p class="cx-small">All store revenue ÷ all ad spend. The line marks a 3.0 target (illustrative).</p>
          <ul class="cx-mer">${mer.map(x => `<li><b>${esc(x.m)}</b><span class="cx-mer-t" aria-hidden="true"><i class="${x.mer < 3 ? 'cx-warn' : 'cx-good'}" style="width:${x.mer / max * 100}%"></i><span class="cx-goal" style="left:${3 / max * 100}%"></span></span><span class="cx-r">${x.mer.toFixed(2)}×${x.mer < 3 ? '<span class="cx-vh"> below target</span>' : ''}</span></li>`).join('')}</ul>
        </section>
        <section class="cx-card" aria-labelledby="cx-rep-h">
          <h3 id="cx-rep-h">Weekly report</h3>
          <p class="cx-small">Today a VA builds this by hand in a spreadsheet. Here it’s one click, ready to paste.</p>
          <div class="cx-acts"><button type="button" class="cx-btn cx-pri" data-report>Generate the weekly report</button><button type="button" class="cx-btn" data-copy ${st.report ? '' : 'disabled'}>Copy</button></div>
          <label class="cx-vh" for="cx-report">Weekly report text</label>
          <textarea id="cx-report" rows="12" readonly placeholder="The report appears here.">${esc(st.report)}</textarea>
        </section>
      </div>
      ${how('ads checks', { trigger: 'Scheduler at 07:00 Dublin time, every day; report every Monday', system: 'Ops service joins spend with Shopify sales by UTM; spike, disapproval and naming rules (lib/ads.js)', api: 'Meta Marketing API GET /act_{id}/insights · Google Ads API (YouTube) · Slack chat.postMessage', approve: 'The media buyer decides. The service never changes budgets or pauses ads itself.' })}`;
    const p = $('#cx-panel-ads');
    p.querySelector('[data-report]').onclick = () => {
      const mon = new Date(now - ((now.getDay() + 6) % 7) * D);
      st.report = weeklySummary(S.ads, S.markets, { weekOf: mon.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) });
      renderAds(); $('#cx-report').focus(); toast('Weekly report generated');
    };
    p.querySelector('[data-copy]').onclick = async () => {
      try { await navigator.clipboard.writeText(st.report); toast('Copied to clipboard'); }
      catch { $('#cx-report').select(); toast('Press Ctrl+C to copy'); }
    };
  }

  /* ------------------------------------------------------------ CUSTOMER VOICE */
  function renderVoice() {
    $('#cx-panel-voice').innerHTML = `
      <p class="cx-small">Theme names follow the public complaint themes I found. Counts, trends and reviews are invented. Trustpilot shows no replies to negative reviews today, so every reply below would be a first.</p>
      <ul class="cx-themes">${S.themes.map((t, i) => {
        const now7 = t.trend.at(-1), prev = t.trend.at(-2), up = now7 > prev, down = now7 < prev, mx = Math.max(...t.trend);
        return `<li class="cx-card cx-theme ${t.isNew ? 'cx-new' : ''}">
          <div class="cx-theme-h"><h3>${esc(t.t)}</h3>
            <span class="cx-count" aria-label="${themeCount(t)} mentions in 7 weeks">${themeCount(t)}</span>
            <span class="cx-trend ${up ? 'cx-down' : down ? 'cx-upgood' : ''}">${up ? '▲' : down ? '▼' : '■'} ${now7} this week <span class="cx-vh">(${up ? 'up' : down ? 'down' : 'flat'} from ${prev})</span></span>
            <span class="cx-spark" aria-hidden="true">${t.trend.map(v => `<i style="height:${v / mx * 100}%"></i>`).join('')}</span></div>
          <label class="cx-eyebrow" for="cx-rep-${i}">Drafted public reply</label>
          <textarea id="cx-rep-${i}" rows="4">${esc(t.reply)}</textarea>
          <p class="cx-product"><b>Send to product:</b> ${esc(t.product)}</p>
          <div class="cx-acts"><button type="button" class="cx-btn cx-pri" data-pub="${i}">Approve reply</button><button type="button" class="cx-btn" data-prod="${i}">Send to product</button></div>
        </li>`; }).join('')}</ul>
      <section class="cx-card" aria-labelledby="cx-rev-h"><h3 id="cx-rev-h">Latest tagged reviews (invented)</h3>
        <ul class="cx-revs">${S.reviews.map(r => `<li class="${r.isNew ? 'cx-new' : ''}"><b>${esc(r.who)}</b> ${chip('info', S.themes.find(t => t.key === r.theme).t)}<p>${esc(r.text)}</p></li>`).join('')}</ul></section>
      ${how('review themes', { trigger: 'New review on Trustpilot (polled every 15 minutes, or webhook if the plan allows)', system: 'An LLM picks one theme from a fixed list; counts stored per week; reply drafted from the theme’s approved template', api: 'Trustpilot Business API: list service reviews · reply to a review (paid API module, to confirm)', approve: 'The support lead approves every public reply before it is posted' })}`;
    const p = $('#cx-panel-voice');
    p.querySelectorAll('[data-pub]').forEach(b => b.onclick = () => { toast('Reply queued for Trustpilot (demo, nothing was posted)'); b.textContent = 'Approved'; b.disabled = true; });
    p.querySelectorAll('[data-prod]').forEach(b => b.onclick = () => { toast('Note sent to the product channel (demo)'); b.textContent = 'Sent to product'; b.disabled = true; });
  }

  function refreshCounts() {
    const open = S.emails.filter(e => !st.sent.has(e.id)).length;
    const n = { support: open, delivery: stuckList().filter(p => p.flagged).length };
    root.querySelectorAll('[data-count]').forEach(el => { const v = n[el.dataset.count]; el.textContent = v ? String(v) : ''; el.setAttribute('aria-label', v ? `, ${v} open` : ''); });
    todayData();
  }
  function renderAll() { renderToday(); renderSupport(); renderDelivery(); renderAds(); renderVoice(); refreshCounts(); }

  /* ------------------------------------------------------------ SCENARIOS */
  // Scenario data is built through the same libs the tabs use, so the log and the tabs always agree.
  const helenOrder = { id: 'CX-DEMO-10612', email: 'helen.w@example.com', country: 'UK', items: 'Neck Tightening Cream ×1', total: '£58.00', shippedAt: new Date(now - 15 * D), deliveredAt: new Date(now - 12 * D), carrier: 'DPD', site: '3PL-EU-1' };
  const helenMail = { id: 9, from: 'Helen W.', email: 'helen.w@example.com', receivedAt: now, isNew: true, subj: 'Return the neck cream?', body: 'Hi, the neck cream isn’t for me. Can I send it back for a refund? Order CX-DEMO-10612.' };
  const helenT = triage(helenMail, { ...ctx, orders: [helenOrder] });
  const helenRan = helenT.actions[0].label.replace('Issue ', '');
  const caParcel = { o: 'CX-DEMO-10399', m: 'CA', carrier: 'FedEx', last: 'Arrived at sort facility', shippedAt: new Date(now - 8 * D - 2 * H), lastScanAt: new Date(now - 2 * D - 4 * H), isNew: true };
  const caS = parcelStatus(caParcel, LANE.CA, now);
  const spikeAd = S.ads.find(a => a.n === 'ELS_US_Video_60Day_V4');
  const menthol = S.themes.find(t => t.key === 'menthol');

  const SCENARIOS = [
    { key: 'refund', name: 'A refund request', sub: 'Email → order → 60-day check → return number → draft', src: 'Helpdesk', wait: true,
      title: `Refund request from ${helenMail.from} (UK)`,
      steps: ['Email received', `Order ${helenOrder.id} found`, helenT.checks.find(c => /guarantee/.test(c.label)).label, `Return number ${helenRan} created`, 'Reply drafted', 'Waiting for a person to approve'],
      how: { trigger: 'New email or helpdesk ticket (helpdesk webhook; tool to confirm)', system: 'Ops service triage rules: intent, order lookup, 60-day guarantee from delivery', api: 'Shopify Admin GraphQL: orders(query: "name:CX-DEMO-10612") · helpdesk API: draft reply', approve: 'A support agent approves or edits the reply in Support' },
      apply() { if (!S.orders.includes(helenOrder)) { S.orders.push(helenOrder); S.emails.unshift(helenMail); st.sel = helenMail.id; st.alerts.unshift(['info', 'New refund request triaged', `${helenMail.from}: within the guarantee, return number and reply ready.`, 'support', true]); } } },
    { key: 'order', name: 'A US order arrives', sub: 'Shopify webhook → import-fee flag → pre-delivery email', src: 'Shopify',
      title: 'Shopify order CX-DEMO-10650 ($138, United States)',
      steps: ['orders/create webhook received', 'Signature (HMAC) verified', 'Saved once; duplicate deliveries ignored', 'US is outside the EU: flagged for import fees', 'Pre-delivery email drafted: “your courier may ask for import fees”'],
      how: { trigger: 'Shopify orders/create webhook', system: 'Ops service checks the shipping country against the duty table (data/duties.js)', api: 'Email tool event, e.g. Klaviyo POST /api/events "Duties notice" (tool to confirm)', approve: 'Ops approves the template once; after that it sends per order' },
      apply() { if (!st.notices.includes('CX-DEMO-10650')) { st.notices.push('CX-DEMO-10650'); S.ordersYesterday++; st.alerts.unshift(['info', 'Import-fee notice queued for CX-DEMO-10650', 'US order: customer told before delivery that the courier may ask for fees.', 'delivery', true]); } } },
    { key: 'parcel', name: 'A Canada parcel runs late', sub: 'Tracking check → promise missed → delay email', src: 'AfterShip', wait: true,
      title: `${caParcel.o} to Canada misses its window`,
      steps: ['Morning tracking check', `${caParcel.o} matched to its Shopify order`, `Day ${caS.sinceShip} against a ${LANE.CA.min}–${LANE.CA.max} day promise: missed`, 'Delay email drafted before the customer writes in', 'Waiting for a person to approve'],
      how: { trigger: 'AfterShip tracking webhook, plus a scheduled morning check', system: 'Promise and stuck-scan rules per lane (lib/lanes.js)', api: 'AfterShip Tracking API: GET /trackings · webhook tracking_update', approve: 'Ops approves the delay email' },
      apply() { if (!S.parcels.includes(caParcel)) { S.parcels.unshift(caParcel); st.alerts.unshift(['warn', `${caParcel.o} to Canada is past its promise`, 'Delay email drafted for approval.', 'delivery', true]); } } },
    { key: 'ad', name: 'An ad overspends', sub: 'Morning pull → 2.1× spike → Slack alert with a cap', src: 'Ads',
      title: `Spend spike on ${spikeAd.n}`,
      steps: ['Meta and YouTube spend pulled', `€${spikeAd.today} today vs €${spikeAd.avg7} average: ${spikeRatio(spikeAd).toFixed(1)}×`, `Joined with Shopify sales: ROAS ${roas(spikeAd).toFixed(1)}`, `Suggested cap: €${suggestedCap(spikeAd)} a day`, 'Media buyer alerted in Slack'],
      slack: () => `<div class="cx-slack" role="img" aria-label="Example Slack message to the media buyer"><span class="cx-slack-a" aria-hidden="true">OB</span><div><b>Ops bot</b> <span class="cx-small">#ads · ${time(new Date())}</span><p>⚠️ <span class="cx-mono">${esc(spikeAd.n)}</span> has spent <b>€${spikeAd.today}</b> today, ${spikeRatio(spikeAd).toFixed(1)}× its 7-day average. ROAS on Shopify sales is <b>${roas(spikeAd).toFixed(1)}</b>. Suggested daily cap: <b>€${suggestedCap(spikeAd)}</b>. Nothing has been changed.</p></div></div>`,
      how: { trigger: 'Scheduler, every morning at 07:00 Dublin time', system: 'Spike rule (≥1.8× the 7-day average) and ROAS on UTM-matched Shopify sales (lib/ads.js)', api: 'Meta Marketing API /insights · Google Ads API · Slack chat.postMessage', approve: 'The media buyer decides whether to cap. Budgets are never changed automatically.' },
      apply() { if (!spikeAd.isNew) { spikeAd.isNew = true; st.alerts.unshift(['warn', `${spikeAd.n}: spend ${spikeRatio(spikeAd).toFixed(1)}× average`, `Slack alert sent to the media buyer with a €${suggestedCap(spikeAd)} cap suggestion.`, 'ads', true]); } } },
    { key: 'review', name: 'A 1★ review lands', sub: 'Trustpilot → theme tag → drafted public reply', src: 'Trustpilot', wait: true,
      title: '1★ review from D. Demo (US)',
      steps: ['New review pulled', 'Tagged: menthol irritation', `Theme count ${themeCount(menthol)} → ${themeCount(menthol) + 1}`, 'Public reply drafted', 'Waiting for a person to approve'],
      how: { trigger: 'Trustpilot poll every 15 minutes (or webhook, depending on plan)', system: 'An LLM picks a theme from a fixed list; weekly counts stored', api: 'Trustpilot Business API: reply to service review (API module, to confirm)', approve: 'The support lead approves each public reply' },
      apply() { if (!S.reviews.some(r => r.who.startsWith('D. Demo'))) { S.reviews.unshift({ who: 'D. Demo · US · 1★', theme: 'menthol', text: 'Burned around my eyes, I had to stop using it.', isNew: true }); menthol.trend[menthol.trend.length - 1]++; menthol.isNew = true; st.alerts.unshift(['warn', 'New 1★ review: menthol irritation', `Reply drafted. Theme now at ${themeCount(menthol)} mentions.`, 'voice', true]); } } },
  ];

  /* ------------------------------------------------------------ player wiring */
  let activeRun = null;
  const player = createPlayer(SCENARIOS, {
    stepMs: 700, gapMs: 1100,
    schedule: (fn, ms) => setTimeout(fn, reduced() ? Math.min(ms, 120) : ms),
    onEvent(e) {
      if (e.type === 'reset') { st.runs = []; activeRun = null; }
      if (e.type === 'start') { activeRun = { s: e.scenario, step: -1, time: time(new Date()) }; st.runs.unshift(activeRun); }
      if (e.type === 'step' && activeRun) { activeRun.step = e.step; const log = $('#cx-log'); if (log) log.innerHTML = renderLog(); }
      if (e.type === 'done') { e.scenario.apply(); toast(`Step ${e.index + 1} of ${SCENARIOS.length} done: ${e.scenario.name.toLowerCase()}`); renderSupport(); renderDelivery(); renderAds(); renderVoice(); refreshCounts(); }
      if (e.type === 'state' || e.type === 'done' || e.type === 'start') updatePlayerUi();
    },
  });
  function updatePlayerUi() {
    const p = $('#cx-panel-today'); if (!p || !p.querySelector('.cx-player')) return;
    p.querySelectorAll('[data-scn]').forEach(li => { const i = +li.dataset.scn; li.className = scnClass(i); li.querySelector('[data-scn-state]').textContent = scnLabel(i); });
    p.querySelector('[data-ctl=play]').textContent = playLabel();
    p.querySelector('[data-ctl=play]').disabled = player.state === 'playing';
    p.querySelector('[data-ctl=pause]').disabled = player.state !== 'playing';
    p.querySelector('[data-ctl=skip]').disabled = !(player.state === 'playing' || player.state === 'paused');
    p.querySelector('[data-ctl=replay]').disabled = !st.runs.length;
    $('#cx-pstatus').textContent = statusText();
    const log = $('#cx-log'); if (log) log.innerHTML = renderLog();
  }

  root.addEventListener('click', e => {
    const g = e.target.closest('[data-go]');
    if (g) { selectTab(g.dataset.go, { focus: true }); return; }
    const c = e.target.closest('[data-ctl]');
    if (!c) return;
    const k = c.dataset.ctl;
    if (k === 'play') { if (player.state !== 'paused') track('demo_play'); player.play(); }
    if (k === 'pause') { player.pause(); root.querySelector('[data-ctl=play]').focus(); }
    if (k === 'skip') player.skip();
    if (k === 'replay') { track('demo_play'); player.replay(); }
    if (k === 'play' || k === 'replay') root.querySelector('[data-ctl=pause]')?.focus();
  });

  renderAll();
  updatePlayerUi();

  return {
    playMorning() {
      selectTab('today', { silent: true });
      if (player.state === 'playing') return;
      track('demo_play');
      player.state === 'ended' ? player.replay() : player.play();
    },
  };
}
