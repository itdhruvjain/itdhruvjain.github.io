# /cellexia/ — case study for Cellexia

An unofficial concept page by Dhruv Jain, a job candidate, for the Cellexia team.

**Not affiliated with or endorsed by Cellexia Labs.** All orders, customers, emails, ad figures and reviews are invented. The page carries `noindex, nofollow`.

Live at `https://itdhruvjain.github.io/cellexia/`. Share it with a ref to see visits in GoatCounter: `https://itdhruvjain.github.io/cellexia/?ref=cellexia`.

## What's on the page

1. **Why this role.** A scroll-driven opener: "Hydrogen + oxygen. Do you get water?" The atoms bond into H₂O, the molecule becomes "the person who connects", and the team's roles fly out and start passing work to each other. On phones and with reduced motion it plays as a simple sequence instead of following the scroll.
2. **The proof.** Three public findings with counters, then "A morning at Cellexia": a simulated ops-hub window that works through five events (refund, US order, late parcel, ad overspend, low review). It plays when it scrolls into view, and any step can be replayed on its own. Below it, an animated architecture diagram.
3. **How I'd work with you.** The 30-day plan on a timeline that fills as you scroll, plus working principles and the questions I'd ask on day one.
4. **Contact.** Email, copy email, phone, portfolio.

## Run it

No build step. It uses native ES modules, so serve it rather than opening the file:

```bash
# from the repo root (the folder that holds index.html and cellexia/)
python -m http.server 8000
# open http://localhost:8000/cellexia/
```

## Tests

You need Node 18 or later. There are no dependencies.

```bash
cd cellexia
npm test          # node --test tests/
```

`tests/demo.test.js` pins the exact inputs the demo shows: day 21 is within the 60-day guarantee, a US order gets the fee notice, a Canada parcel on day 9 with no scan for 4 days is late and stuck, €1,520 against a €724 average is 2.1× with a €720 cap, and the review is tagged as menthol. The other tests cover the full rule set: triage, lanes, ads, duties and review themes.

## Files

```
index.html          the page markup
styles/cx.css       styles: light/dark, responsive, reduced motion; metric-matched font fallback
ui/app.js           page script: hero animation, scroll spy, demo player, architecture, analytics
data/policy.js      policy values (guarantee, damage window, lane promises), each marked as source or ASSUMPTION/VERIFY
data/sample.js      invented sample data used by the tests
data/duties.js      ILLUSTRATIVE import-fee settings
lib/triage.js       intent, order lookup, guarantee and damage checks, drafted replies
lib/lanes.js        on-time, late and stuck-parcel rules
lib/ads.js          ROAS, spike detection, suggested cap, naming convention, weekly summary
lib/duties.js       landed-cost maths
lib/voice.js        review theme tagging
tests/*.test.js     node:test unit tests
```

## Editing

- **Demo text:** the `STEPS` array in `ui/app.js`. Lines that come from rules (guarantee day, late/stuck parcel, spend spike and cap, review theme) are built in the `R` object just above it, from `lib/`.
- **Hero roles and messages:** `ROLES` and `MSGS` in `ui/app.js`.
- **Policy numbers:** `data/policy.js`. Change the guarantee or a lane's promise and the demo lines follow.

## Analytics

GoatCounter (cookie-free) counts the page view. Events are sent as `cellexia-<name>`, with `--<ref>` added when the link had `?ref=`, which is kept for the visit in sessionStorage. The events are `demo_play`, `step_<0-4>`, `why_replay`, `cta_email`, `cta_copy_email` and `visit` (sent only when a ref is present). No personal data is sent.

## Nav link

The front page has a "Case study" link that is off by default. To turn it on, set `SHOW_CASE_STUDY = true` in the small script above the analytics block in `/index.html`.
