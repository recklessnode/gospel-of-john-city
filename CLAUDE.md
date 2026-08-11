# CLAUDE.md — The Gospel of John as a City

Interactive maps rendering the Gospel of John as a city (a collaboration between
Ronald and PaulDz). Districts = narrative blocks, wards = major sections,
neighborhood buildings sized by Greek word count. Live on GitHub Pages:
https://recklessnode.github.io/gospel-of-john-city/ (2D) and `/city3d.html` (3D).

## Commands

```bash
npm install                     # once: three + esbuild + playwright
npm run build                   # verify parity → bundle src/ → assemble all three pages
npm run verify                  # plan parity check alone (fast, no browser)
npm run bundle                  # esbuild only
node scripts/shots.mjs city3d-three.html shots [--dark]   # walkthrough screenshots
node scripts/smoke.mjs city3d-three.html                  # interaction checks
python3 scripts/build_data.py   # xlsx → data/john-data.json (only when data changes)
python3 scripts/build.py        # assemble the pages (skips the 3-D bundle if absent)
```

`npm run build` is the normal entry point. `python3 scripts/build.py` alone still
works — it just warns and skips `city3d-three.html` when the bundle is missing.

## Architecture

```
data/John gospel as a city.xlsx   source data (John Stats outline is authoritative)
scripts/build_data.py             extracts/curates → data/john-data.json
index.template.html + scripts/app.js     → index.html   (2D: city / linear / index)
city3d.template.html + scripts/app3d.js  → city3d.html  (3D canvas renderer, classic)
city3d.template.html + src/ (bundled)    → city3d-three.html (3D Three.js, Phase 2)
scripts/build.py                  injects JSON + app code at /*__DATA__*/ and /*__APP__*/

src/plan.js      the city plan — pure math, no DOM, no Three.js
src/scene.js     the plan built as Three.js geometry
src/kits.js      procedural building kits, the crenellated wall and the gates
src/palette.js   day/night palettes + the sun direction
src/labels.js    billboarded DOM labels with nearest-first collision culling
src/main.js      cameras, picking, panel, walk UI, day/night, main loop
```

Both 3D pages share `city3d.template.html`; the build fills in `<!--__SUBTITLE__-->`
and `<!--__ALT__-->` (the cross-link between them) per page.

Both outputs are fully self-contained single files (required: GitHub Pages + Claude
artifact previews + offline use).

## Invariants — do not break

1. **app.js, app3d.js and src/plan.js share the city plan and MUST stay in
   lockstep.** The duplicated functions (`wayPoint`, `layoutOrganic`/`layoutPlan`,
   `catmullSample`, `convexHull`, the road-clearance pass in `buildWay`/
   `roadClearance`, the shoreline/quay geometry, and all their constants: BASE_R
   315, harbor r 535, relaxation 220+90 iters, padding 8, ROAD_HALF 9, CLEAR 13.5,
   rnd() seed math) must produce identical positions in all three. This is now
   machine-checked: **`npm run verify`** (scripts/verify_parity.mjs) evaluates each
   renderer's plan section over the same data and diffs hood positions, the Way,
   wall segments, gates, obelisks and the sea/quay polygons. Run it after any
   layout change; `npm run build` runs it first and refuses to build on drift.
2. **Data quirks are intentional, not bugs.** 16:4b–33 is absent from John Stats
   (Greek count 442 comes from the bubble-data sheet); ward totals sometimes exceed
   district totals (overlapping addenda in the source); ward VII is extended to
   11:55–12:11. All documented in README. Never "fix" the numbers — they were
   verified against the spreadsheet with zero mismatches.
3. **Verse indexing:** cumulative 1–879 via per-chapter verse counts
   (`JOHN.chapterOffsets`). IDs: `n<row>`/`w<row>`/`d<row>` reference John Stats
   spreadsheet rows; manual nodes use `m<ref>`.
4. **The pericope 7:53–8:11** ("Mercy Annex") stays outside the city wall — it's a
   later insertion and that placement is a deliberate scholarly statement.
5. **Nothing in the city is invented.** Every building, landmark and piece of
   civic furniture must be grounded in the text or in PaulDz's structural work —
   a block is a pericope, a stela is an "I AM" saying, the wall and gates are
   where the plan puts them. Confirmed by Ronald 2026-08-10, when a plaza he had
   already approved was dropped rather than built: it had been proposed to
   justify a hairpin in the road, and once the hairpin was fixed at its cause the
   plaza would have been scenery with nothing behind it. Decorative geometry that
   *serves* real content is fine (paving, kerbs, awnings, merlons); a named place
   that isn't in John is not. When a kit needs something to fill space, scale or
   repeat what is already there rather than inventing a new landmark.

## Conventions

- **conversations.md** is the session log, tied to commit IDs. Each working session
  appends an entry as work happens; a commit's ID is recorded by the *following*
  commit (a commit can't contain its own hash). Keep this up to date.
- **Every page carries a build stamp** in its header (`build <UTC time> · <sha>`,
  linking to that commit) so a refresh can be told apart from a cached page. It is
  injected by `scripts/build.py` at `<!--__BUILD__-->`. Note the hash names HEAD at
  *build* time — the built HTML is committed afterwards, so the stamp trails the
  history by one commit, the same convention as conversations.md. The timestamp is
  the reliable "did this change" signal.
- **agents.md** documents the model-mix policy (build inline, review with
  independent agents; cheapest capable model wins).
- Word counts shown in UI come from the sheet by row — formatting `fmt()` handles
  nulls as "—".
- Theme colors are a validated accessible palette (light + dark variants in
  `JOHN.themes` and the CSS custom properties); don't invent new hues casually.

## Environment notes (Ronald's machine)

- Working clone: `Documents/GitHub/gospel-of-john-city` on the Windows mount. WSL
  git there needs `core.fileMode false` and `core.autocrlf input` (already set in
  that clone). A repo in `~` (native ext4) avoids the issue entirely.
- `publish.sh` is idempotent (creates the repo or pushes to the existing one) but
  ordinary `git push` is all that's needed now.
- Unlike the Claude cloud sandbox (which cannot reach npm/CDNs/GitHub), Claude Code
  on this machine has normal network access: `npm install three` works, and pushes
  go straight to origin.

## Current focus: Phase 2 — ancient-world 3D city

See **docs/phase2-ancient-city.md** for the full spec. Summary: rebuild the 3D view
on Three.js (npm + esbuild bundle, keeping the single-file output), replacing
abstract cylinders with procedural ancient-architecture kits (Herodian temple
platform, Roman fortress, stoas, stepped pools, courtyard houses, crenellated wall,
harbor with boats, stelae), while keeping everything that already works: the shared
city plan, walk-the-Way camera with pace/free-look, gates on the wall crossings,
door signs, Enter-to-explore, day/night, and the detail panel.

**M1 is done** — `city3d-three.html` reproduces the canvas view on WebGL with real
shadows and raycast picking. The canvas renderer (`scripts/app3d.js` →
`city3d.html`) stays as the classic/fallback view until Ronald signs off; the two
pages cross-link in the header.

**M2a is done** — four kits (house / hall / forum / temple) chosen by size tier and
ward, plus a crenellated wall with towers and arched gates. Rules that matter when
adding kits:

- A kit is built in a local frame with **+X facing the road**; the group is rotated
  by `-h.doorAng` and placed at `(h.x, h.y)`. Put the door on +X.
- A kit must **fit inside the hood's circle of radius `h.r`** — that circle is the
  only space the layout guarantees is free. Half-side `a = h.r * 0.78`.
- **Height must stay `h.h`.** It encodes the Greek word count, which the page
  subtitle promises; a kit that overshoots breaks the skyline's meaning.
- Colour keys are `body:<theme>` (stone 60% toward the theme hue), `roof:<theme>`
  (72% — from orbit you see roofs, so the coding has to live there) and
  `accent:<theme>` (pure theme colour, for awnings and banners). Anything new must
  be registered in **both** the material set and `applyTheme`, or it will be stuck
  in day colours at night.
- Geometry accumulates in `Parts` and is merged per material, so a 40-piece temple
  costs four draw calls. Don't add loose meshes per block.

**M2b is next:** stepped pools, gardens + tombs, the Praetorium fortress, harbour
quay + boats, and I AM stelae replacing the obelisks.
