# CLAUDE.md — The Gospel of John as a City

Interactive maps rendering the Gospel of John as a city (a collaboration between
Ronald and PaulDz). Districts = narrative blocks, wards = major sections,
neighborhood buildings sized by Greek word count. Live on GitHub Pages:
https://recklessnode.github.io/gospel-of-john-city/ (2D) and `/city3d.html` (3D).

## Commands

```bash
python3 scripts/build_data.py   # xlsx → data/john-data.json (only when data changes)
python3 scripts/build.py        # assemble index.html AND city3d.html from templates
```

There is no framework and no build system beyond those two scripts. Verify changes
by opening the built HTML in a browser (or headless: playwright/chromium screenshots
— see the walkthrough positions in docs/phase2-ancient-city.md).

## Architecture

```
data/John gospel as a city.xlsx   source data (John Stats outline is authoritative)
scripts/build_data.py             extracts/curates → data/john-data.json
index.template.html + scripts/app.js     → index.html   (2D: city / linear / index)
city3d.template.html + scripts/app3d.js  → city3d.html  (3D canvas renderer)
scripts/build.py                  injects JSON + app code at /*__DATA__*/ and /*__APP__*/
```

Both outputs are fully self-contained single files (required: GitHub Pages + Claude
artifact previews + offline use).

## Invariants — do not break

1. **app.js and app3d.js share the city plan and MUST stay in lockstep.** The
   duplicated functions (`wayPoint`, `layoutOrganic`/`layoutPlan`, `catmullSample`,
   `convexHull`, the road-clearance pass in `buildWay`/`roadClearance`, and all their
   constants: BASE_R 315, harbor r 535, relaxation 220+90 iters, padding 8,
   ROAD_HALF 9, CLEAR 13.5, rnd() seed math) must produce identical positions in
   both files. If you change layout in one, change the other identically — or
   better, verify by diffing hood positions.
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

## Conventions

- **conversations.md** is the session log, tied to commit IDs. Each working session
  appends an entry as work happens; a commit's ID is recorded by the *following*
  commit (a commit can't contain its own hash). Keep this up to date.
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
door signs, Enter-to-explore, day/night, and the detail panel. The canvas renderer
(`scripts/app3d.js`) stays in the repo as reference/fallback until the Three.js
version reaches feature parity.
