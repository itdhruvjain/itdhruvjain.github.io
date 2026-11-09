// Page shell for /cellexia/: analytics, theme, section nav, duties explainer, print, lazy hub.
import { DUTY_MARKETS, DEFAULT_VALUE } from '../data/duties.js';
import { landedCost } from '../lib/duties.js';

const $ = s => document.querySelector(s);

/* ---------------- analytics (GoatCounter, cookie-free) ----------------
   Share links like https://itdhruvjain.github.io/cellexia/?ref=cellexia
   The ref is kept for the session and appended to event names: "demo_play--cellexia". */
let ref = '';
try {
  const q = (new URLSearchParams(location.search).get('ref') || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40);
  if (q) sessionStorage.setItem('cx-ref', q);
  ref = q || sessionStorage.getItem('cx-ref') || '';
} catch { ref = ''; }
const sent = new Set();
export function track(name, once = false) {
  const key = 'cellexia-' + name + (ref ? '--' + ref : '');
  if (once && sent.has(key)) return;
  sent.add(key);
  const go = () => { try { window.goatcounter.count({ path: key, title: name + (ref ? ' (' + ref + ')' : ''), event: true }); } catch { /* blocked or offline */ } };
  if (window.goatcounter && window.goatcounter.count) go();
  else addEventListener('load', () => setTimeout(go, 400), { once: true });
}
if (ref) track('visit', true);

/* ---------------- toast ---------------- */
const toastEl = $('#cx-toast');
export function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('is-on');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => toastEl.classList.remove('is-on'), 2800);
}

/* ---------------- theme (follows the CV page's saved choice, else the OS) ---------------- */
const root = document.documentElement;
const themeBtn = $('#cx-theme');
const themeNow = () => root.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
const syncThemeBtn = () => { const d = themeNow() === 'dark'; themeBtn.setAttribute('aria-pressed', d); themeBtn.querySelector('span').textContent = d ? 'Light' : 'Dark'; };
themeBtn.addEventListener('click', () => {
  const next = themeNow() === 'dark' ? 'light' : 'dark';
  root.dataset.theme = next;
  try { localStorage.setItem('dj-theme', next); } catch { /* private mode */ }
  syncThemeBtn();
});
syncThemeBtn();

/* ---------------- section nav: highlight where you are ---------------- */
const navLinks = [...document.querySelectorAll('.cx-secnav a')];
const sections = navLinks.map(a => document.getElementById(a.hash.slice(1))).filter(Boolean);
const spy = new IntersectionObserver(es => es.forEach(en => {
  if (!en.isIntersecting) return;
  navLinks.forEach(a => {
    const on = a.hash === '#' + en.target.id;
    if (on) { a.setAttribute('aria-current', 'location'); a.scrollIntoView?.({ block: 'nearest', inline: 'nearest' }); }
    else a.removeAttribute('aria-current');
  });
}), { rootMargin: '-40% 0px -55% 0px' });
sections.forEach(s => spy.observe(s));

/* ---------------- lazy Ops Hub ---------------- */
const hubEl = $('#cx-hub');
let hubP = null;
function loadHub() {
  if (!hubP) hubP = import('./hub.js').then(m => m.initHub(hubEl, { track, toast })).catch(err => {
    hubEl.innerHTML = '<p class="cx-empty">The demo couldn’t load. Please refresh the page.</p>';
    console.warn(err);
    return null;
  });
  return hubP;
}
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); loadHub(); } }, { rootMargin: '600px 0px' });
  io.observe(hubEl);
} else loadHub();

$('#cx-play').addEventListener('click', async () => {
  const hub = await loadHub();
  document.getElementById('hub').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  if (hub) { hub.playMorning(); document.querySelector('#cx-hub [data-ctl=pause]')?.focus({ preventScroll: true }); }
});

/* ---------------- duties explainer ---------------- */
const mSel = $('#cx-d-market'), vIn = $('#cx-d-value'), vOut = $('#cx-d-value-out');
mSel.innerHTML = Object.entries(DUTY_MARKETS).map(([k, m]) => `<option value="${k}">${m.name}</option>`).join('');
const money = (cur, n) => cur + (Math.round(n * 100) / 100).toFixed(2);
function calc() {
  const k = mSel.value, m = DUTY_MARKETS[k], v = +vIn.value;
  vOut.textContent = money(m.cur, v);
  $('#cx-d-cur').textContent = m.code;
  const a = landedCost(m, v, 'today'), b = landedCost(m, v, 'prepaid');
  $('#cx-d-today').innerHTML = `
    <div class="cx-d-row"><span>At checkout</span><b>${money(m.cur, a.checkout)}</b></div>
    <div class="cx-d-row cx-d-door"><span>At the door (duty ${money(m.cur, a.duty)} + tax ${money(m.cur, a.tax)} + courier fee ${money(m.cur, a.atDoor ? a.fee : 0)})</span><b>${money(m.cur, a.atDoor)}</b></div>
    <div class="cx-d-row cx-d-total"><span>Total paid</span><b>${money(m.cur, a.total)}</b></div>
    <p class="cx-d-note">${a.atDoor ? `A surprise of <b>${a.surprise}%</b> on top of what they agreed to pay.` : 'No surprise charge at this value.'}</p>`;
  $('#cx-d-pre').innerHTML = `
    <div class="cx-d-row"><span>At checkout (incl. duties and taxes)</span><b>${money(m.cur, b.checkout)}</b></div>
    <div class="cx-d-row"><span>At the door</span><b>${money(m.cur, 0)}</b></div>
    <div class="cx-d-row cx-d-total"><span>Total paid</span><b>${money(m.cur, b.total)}</b></div>
    <p class="cx-d-note">One price, known up front${b.total < a.total ? `, and <b>${money(m.cur, a.total - b.total)}</b> less than paying the courier` : ''}.</p>`;
}
mSel.addEventListener('change', () => { vIn.value = DEFAULT_VALUE[mSel.value]; calc(); });
vIn.addEventListener('input', calc);
mSel.value = 'US'; vIn.value = DEFAULT_VALUE.US; calc();

/* ---------------- print + contact ---------------- */
$('#cx-print').addEventListener('click', () => { track('plan_print'); window.print(); });
document.addEventListener('click', e => {
  const a = e.target.closest('a[href^="mailto:"]');
  if (a) track('cta_email');
});
