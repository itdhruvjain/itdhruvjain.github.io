# /cellexia/ — Cellexia Ops Hub case study

An unofficial concept page by Dhruv Jain, a job candidate, for the Cellexia team. It opens with why this role matters (an interactive “hydrogen + oxygen ≠ water without a bond” diagram), then: what I learned about the business, an interactive Ops Hub with a self-paced guided tour, the import-duties problem, the architecture and a 30-day plan.

**Not affiliated with or endorsed by Cellexia Labs.** All orders, customers, emails, ad figures and reviews are invented. The page carries `noindex, nofollow`.

Live at `https://itdhruvjain.github.io/cellexia/`. Share with a ref to see visits in GoatCounter: `https://itdhruvjain.github.io/cellexia/?ref=cellexia`.

## Run it

No build step. Native ES modules, served as static files.

```bash
# from the repo root (the folder that holds index.html and cellexia/)
python -m http.server 8000
# open http://localhost:8000/cellexia/
```

Opening `index.html` from `file://` does **not** work, because browsers block ES modules there. Use a local server.

## Tests

Node 18 or later. No dependencies.

```bash
cd cellexia
npm test          # runs: node --test tests/
```

The tests cover guarantee day 59 vs 61, damage report at 47h vs 49h, a wrong-item email, a low-confidence email sent to a person, stuck parcels past the lane limit, the spend-spike threshold, campaign naming, MER and the weekly report, landed cost, the guided-tour state (next, back, goto, chapter ends) and review theme tagging.

## Files

```
index.html           the page (opening layer + eight sections, static HTML)
styles/cx.css        scoped styles (.cx-*), light/dark, responsive, print (2-page plan)
data/policy.js       policy values: guarantee, damage window, lane promises; each marked source or ASSUMPTION/VERIFY
data/sample.js       invented orders, emails, shipments, parcels, ads, markets, themes, reviews
data/duties.js       ILLUSTRATIVE duty thresholds, rates and fees for the explainer
lib/triage.js        intent + confidence, order lookup, policy checks, drafted reply (pure)
lib/lanes.js         on-time rates, stuck-parcel and missed-promise rules (pure)
lib/ads.js           ROAS, MER, spike detection, naming convention, weekly summary text (pure)
lib/duties.js        landed-cost maths (pure)
lib/tour.js          guided-tour state: chapter/step, next/back/goto, progress (pure, nothing auto-advances)
lib/voice.js         review theme tagging from a fixed theme list (pure)
ui/page.js           page shell: analytics, theme, section nav, water diagram, duties explainer, print, lazy hub
ui/hub.js            the Ops Hub tabs (loaded when it scrolls near view)
ui/tour.js           the guided tour: 5 chapters, flow diagrams and “Try it” controls on the real libs
tests/*.test.js      node:test unit tests
package.json         only marks the folder as ES modules and defines `npm test`
```

## Edit the sample data

- **Emails, orders, parcels, ads, reviews:** `data/sample.js`. Dates are built relative to "now", so the demo always reads as this morning. Keep names fake, emails on `example.com` and orders prefixed `CX-DEMO-`.
- **Policy values:** `data/policy.js`. Change `guaranteeDays`, `damageHours`, `minConfidence` or a lane's promise and every check, draft and table updates.
- **Duty explainer:** `data/duties.js`.
- **Guided tour:** the `CHAPTERS` array in `ui/tour.js`. Each step has `at` (which node of the flow diagram lights up), a title, plain-language text and a `body`; “Try it” steps add `out` functions that re-render as the reader moves a control. What each chapter adds to the hub when the reader clicks “See it in …” is the `RESULTS` map in `ui/hub.js`.

## What is real, assumed or illustrative

| Item | Status |
|---|---|
| 60-day money-back guarantee, product names, €54–69 price range, markets, sales channels, Trustpilot 4.8 / ~4,500, complaint themes | From public research |
| 48-hour damage window, refund timing, lane promise days | **Assumption**, my reading of public pages; to verify |
| Duties-unpaid shipping outside the EU | **Assumption**, suggested by reviews |
| Duty thresholds, rates and fees | **Illustrative only**, not current rules |
| Helpdesk, 3PL, email tool | **Unknown**, marked "to confirm" on the page |
| Ad naming convention PRODUCT_MARKET_FORMAT_Angle_V# | My proposal |
| Every order, customer, email, review, count and ad figure | **Invented** |

## Fonts

Inter and Inter Tight load from Google Fonts without blocking the first paint. Metric-matched Arial fallbacks (`Inter Fallback`, `Inter Tight Fallback` in `styles/cx.css`) keep the layout still when the web fonts swap in.

## Analytics

GoatCounter (cookie-free) counts the page view automatically. Events are sent as `cellexia-<event>` plus `--<ref>` when the URL had `?ref=` (kept in sessionStorage for the visit):
`cellexia-tour_start`, `cellexia-tour_chapter_<key>`, `cellexia-tour_result_<key>`, `cellexia-tour_done`, `cellexia-tour_restart`, `cellexia-why_connect`, `cellexia-tab_<support|delivery|ads|voice|today>`, `cellexia-plan_print`, `cellexia-cta_email`, `cellexia-visit` (only when a ref is present). No personal data is sent.

## Nav link

The front page has a "Case study" link that is off by default. To turn it on, set `SHOW_CASE_STUDY = true` in the small script just above the analytics block at the bottom of `/index.html`.
