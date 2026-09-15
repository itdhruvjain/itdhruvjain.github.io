# Dhruv Jain — personal site

Two static pages, no build step, no dependencies.

| File | What it is |
|---|---|
| `index.html` | The front page — a single-scroll, evidence-first pitch: hero with the 60× result and role target, three evidence sections (PIQET, Health4Community, Groundwork), a five-product range table, a have/learning skills grid, working principles and a "How to hire me" Q&A. Plain HTML/CSS, one small script for the theme toggle |
| `cv.html` | Full CV plus a "How to hire me" section with a live timezone-overlap calculator |
| `deck.html` | Redirect stub to `/` — the deck used to live here; kept so shared links don't break |
| `.nojekyll` | Tells GitHub Pages to serve the files as-is instead of running them through Jekyll |

The two pages link to each other and share a light theme with a dark toggle (the choice is remembered in `localStorage`).

Everything is inline. Two external requests, both from public CDNs:

- **Google Fonts** — `index.html` uses Archivo, Source Serif 4 and JetBrains Mono; `cv.html` uses Archivo, Figtree, Newsreader and JetBrains Mono. Real fallback stacks are declared, so the pages read correctly if it is blocked.
- **three.js r128** from cdnjs — used only by `cv.html`, loaded *lazily* when the 3D panel scrolls into view. If WebGL is unavailable or the script fails, the panel swaps itself for a written fallback. Nothing else on the page depends on it.

## The interactive bits

**`cv.html`** — every section does something

- **Role lens** (top of page): pick Backend / Frontend / Data / Leadership / AI and the whole CV re-weights around it. Matching bullets and projects stay lit, everything else dims — nothing is hidden, and the counter tells the reader exactly what was highlighted and what wasn't.
- **Stat tiles**: click any of the four headline numbers to expand the story behind it.
- **Career scrubber**: drag across Feb 2022 → now and the page reports the role, the date and what was being built at that moment, with the matching timeline marker lighting up.
- **Skill chips**: click a technology and the Projects section filters to where it was actually used, with a summary line ("Angular — used in 4 of 5 projects"). Click again to clear.
- **Project cards**: click to expand.
- **Command palette**: press `/` or `⌘K` / `Ctrl+K` to jump to any section, project, skill or action — including switching lens, toggling theme, copying the email address and printing.
- **Playground → PIQET rewrite**: drag-to-compare slider between the before and after states. It is a real `<input type="range">` underneath, so it works with a keyboard and assistive tech.
- **Playground → blast radius**: a rotating 3D dependency graph. Hover a node to light up everything depending on it; click one to propose a change and see the two-hop reach, with risk auto-escalating past thirteen affected modules. Illustrative 64-module graph, labelled as such.
- **Timezone calculator**: converts the working day into the visitor's zone and computes the overlap.
- Scroll-triggered reveals, count-up stats, and a timeline rail that draws itself — all skipped when the visitor has `prefers-reduced-motion` set.
- Copy-email and print/save-PDF buttons; the print stylesheet strips every interactive control so it prints as a clean CV.

**`index.html`** (the front page)

- Deliberately static: one scroll, no slides, no reveals to wait for. The only interactive control is the dark-mode toggle (shared `dj-theme` key with `cv.html`).
- The two before/after bar charts are drawn to scale in CSS and animate once on load; the animation is skipped under `prefers-reduced-motion`.
- Sticky header with section jump links (hidden on phones) and a print stylesheet that drops the header and buttons.


## Publishing to GitHub Pages

**Option A — as your main personal site** (lands at `https://<username>.github.io`)

1. Create a **public** repo named exactly `<your-github-username>.github.io`.
2. Copy `index.html`, `cv.html` and `.nojekyll` into the repo root.
3. Commit and push to the `main` branch.
4. Go to **Settings → Pages**. Under *Build and deployment*, set Source to **Deploy from a branch**, branch `main`, folder `/ (root)`. Save.
5. Wait a minute or two, then open `https://<your-github-username>.github.io`.

**Option B — as a project site** (lands at `https://<username>.github.io/<repo>`)

Same as above, but the repo can be named anything (`cv`, `portfolio`, …). The site will live at `https://<username>.github.io/<repo>/`.

```bash
git init
git add .
git commit -m "Add personal site"
git branch -M main
git remote add origin https://github.com/<username>/<repo>.git
git push -u origin main
```

Then enable Pages in **Settings → Pages** as in step 4.

## Custom domain (optional)

1. Add a file named `CNAME` in the repo root containing just your domain, e.g. `dhruvjain.dev`.
2. At your DNS provider, point the domain at GitHub Pages:
   - apex domain → four `A` records: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - `www` subdomain → a `CNAME` record pointing at `<username>.github.io`
3. Back in **Settings → Pages**, enter the domain and tick **Enforce HTTPS** once the certificate is issued.

## Before you publish

**`cv.html`**, in the `How to hire me` section:

1. **Working hours** currently read `10:00 – 19:00 IST`. Change them if that is not your real day — the timezone calculator keys off this value (search for `10, 0` and `19, 0` in the script at the bottom of the file, and the `10:00 – 19:00 IST` text in the markup).
2. **Work authorisation** shows an "Ask me" chip. The front page now states the position plainly (Indian citizen, remote via EOR or contract, sponsorship needed for on-site) — bring the CV in line with it.
3. **Availability** shows an "Ask me" chip in place of a notice period. The front page says "currently serving notice" — bring the CV in line with it.

## Editing

Both files are plain HTML with a `<style>` block at the top and a `<script>` block at the bottom. Colours are CSS custom properties defined in `:root` (and redefined for dark mode), so a palette change is a handful of hex values.

## Local preview

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

Opening the files directly with `file://` works too, but a local server matches how GitHub Pages will serve them.
