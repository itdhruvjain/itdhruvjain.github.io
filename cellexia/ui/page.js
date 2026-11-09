// Page shell for /cellexia/: analytics, theme, section nav, the water opener, print, lazy hub.

const $ = s => document.querySelector(s);
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------------- analytics (GoatCounter, cookie-free) ----------------
   Share links like https://itdhruvjain.github.io/cellexia/?ref=cellexia
   The ref is kept for the session and appended to event names: "cellexia-tour_start--cellexia". */
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
const spy = new IntersectionObserver(es => es.forEach(en => {
  if (!en.isIntersecting) return;
  navLinks.forEach(a => a.hash === '#' + en.target.id ? a.setAttribute('aria-current', 'location') : a.removeAttribute('aria-current'));
}), { rootMargin: '-40% 0px -55% 0px' });
navLinks.map(a => document.getElementById(a.hash.slice(1))).filter(Boolean).forEach(s => spy.observe(s));

/* ---------------- the water question ----------------
   A short, paced sequence: question → "not on their own" → bond forms → team appears → the connector joins them.
   Every line is in the page from the start (for screen readers and no-JS); the animation only reveals it. */
const why = $('#why');
const BEATS = [1300, 2400, 2600, 2600, 2400]; // ms before stages 1..5
let wTimers = [];
function setStage(n) { for (let i = 1; i <= 5; i++) why.classList.toggle('is-s' + i, i <= n); }
function playWater() {
  wTimers.forEach(clearTimeout); wTimers = [];
  why.classList.add('is-anim');
  if (reduced()) { setStage(5); return; }
  setStage(0);
  let t = 0;
  BEATS.forEach((ms, i) => { t += ms; wTimers.push(setTimeout(() => setStage(i + 1), t)); });
}
playWater();
$('#cx-w-replay').addEventListener('click', () => { track('why_replay'); playWater(); });

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
  document.getElementById('hub').scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth' });
  if (hub) hub.startTour();
});

/* ---------------- print + contact ---------------- */
$('#cx-print').addEventListener('click', () => { track('plan_print'); window.print(); });
document.addEventListener('click', e => { if (e.target.closest('a[href^="mailto:"]')) track('cta_email'); });
