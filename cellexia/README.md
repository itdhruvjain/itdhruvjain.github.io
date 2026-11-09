# /cellexia/ — Cellexia Ops Hub case study

An unofficial concept page by Dhruv Jain, a job candidate, for the Cellexia team. It is part case study and part working demo: what I learned about the business, an interactive Ops Hub (support triage, delivery lanes, ads checks, customer voice), the import-duties problem, the architecture and a 30-day plan.

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

The tests cover guarantee day 59 vs 61, damage report at 47h vs 49h, a wrong-item email, a low-confidence email sent to a person, stuck parcels past the lane limit, the spend-spike threshold, campaign naming, MER and the weekly report, landed cost and the scenario player (play, pause, skip and replay).

## Files

```
index.html           the page (all eight sections, static HTML)
styles/cx.css        scoped styles (.cx-*), light/dark, responsive, print (2-page plan)
data/policy.js       policy values: guarantee, damage window, lane promises; each marked source or ASSUMPTION/VERIFY
data/sample.js       invented orders, emails, shipments, parcels, ads, markets, themes, reviews
data/duties.js       ILLUSTRATIVE duty thresholds, rates and fees for the explainer
lib/triage.js        intent + confidence, order lookup, policy checks, drafted reply (pure)
lib/lanes.js         on-time rates, stuck-parcel and missed-promise rules (pure)
lib/ads.js           ROAS, MER, spike detection, naming convention, weekly summary text (pure)
lib/duties.js        landed-cost maths (pure)
lib/scenario.js      step runner with pause/skip/replay, timers injected (no DOM)
ui/page.js           page shell: analytics, theme, section nav, duties explainer, print, lazy hub
ui/hub.js            the Ops Hub tabs and scenario player (loaded when it scrolls near view)
tests/*.test.js      node:test unit tests
package.json         only marks the folder as ES modules and defines `npm test`
```

## Edit the sample data

- **Emails, orders, parcels, ads, reviews:** `data/sample.js`. Dates are built relative to "now", so the demo always reads as this morning. Keep names fake, emails on `example.com` and orders prefixed `CX-DEMO-`.
- **Policy values:** `data/policy.js`. Change `guaranteeDays`, `damageHours`, `minConfidence` or a lane's promise and every check, draft and table updates.
- **Duty explainer:** `data/duties.js`.
- **Scenario steps:** the `SCENARIOS` array in `ui/hub.js`. Step labels are computed through the same libs the tabs use, so the log and the tabs always agree.

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

## Analytics

GoatCounter (cookie-free) counts the page view automatically. Events are sent as `cellexia-<event>` plus `--<ref>` when the URL had `?ref=` (kept in sessionStorage for the visit):
`cellexia-demo_play`, `cellexia-tab_<support|delivery|ads|voice|today>`, `cellexia-plan_print`, `cellexia-cta_email`, `cellexia-visit` (only when a ref is present). No personal data is sent.

## Nav link

The front page has a "Case study" link that is off by default. To turn it on, set `SHOW_CASE_STUDY = true` in the small script just above the analytics block at the bottom of `/index.html`.
