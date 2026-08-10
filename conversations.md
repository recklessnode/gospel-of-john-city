# conversations.md — session log

A running log of working sessions on this project, tied to git commit IDs.

**Convention:** each session gets an entry written as the work happens. Commit IDs are
appended to an entry as commits are made; since a commit can't contain its own hash,
the ID line for a commit lands in the *next* commit — the log trails the history by
one step. `git log --oneline` is always the ground truth.

---

## 2026-08-10 — Session 1: first interactive map + repo setup

**Participants:** Ronald + Claude (Fable 5, with Opus 5 review agents)

**Inputs:** `John gospel as a city.xlsx` (John Stats outline, bubble data, chapter
locations, city-levels glossary), PaulDz's hand-drawn city sketch, the Gemini concept
doc ("Gospel of John as a city").

**Decisions made:**

- Map layout: **both views, toggleable** — organic walled city (primary, after
  PaulDz's sketch) + linear west→east "Johannine Way" skyline; plus an Index table view.
- Repo: **public, GitHub Pages enabled** so Ronald and PaulDz can share a live URL.
- Data curation: John Stats is the authoritative outline; footprint neighborhoods are
  the non-overlapping pericopes, with addenda/markers/episodes kept as drill-down
  details. 16:4b–33 (missing from John Stats) patched from bubble data (442 gw —
  completes ward IX's chiasm and its 2,296 gw total). Ward VII extended to 11:55–12:11.
  Known sheet discrepancies documented in README rather than silently fixed.
- Visual design: seven theme colors from the validated dataviz palette (witness /
  signs / discourse / controversy / farewell-love / passion / resurrection); gold
  stars for the "I AM" landmarks; the two theme paths from PaulDz's sketch rendered
  as toggleable roads (Life & Water, Light & Witness); chiasms as A↔A′ bridge arcs
  with the D-center (15:12–17) drawn as a ringed fountain; 7:53–8:11 as "The Mercy
  Annex" outside the wall.
- Agent policy (per Ronald): mix Opus 5 + Fable 5 subagents to conserve tokens —
  build inline, review out-of-line. Documented in `agents.md`.

**Work done:** data pipeline (`build_data.py` → `john-data.json`), single-file
interactive map (`index.html` via template + app.js), light/dark modes, pan/zoom,
tooltips, detail panel with chiasm ladders, screenshot-based QA in headless Chromium
(fixed: annex NaN placement, pointer-capture eating clicks, label collisions,
CSS-vs-attribute font sizing).

**Review results:** Fable 5 data audit — zero mismatches (all hood/ward/district stats,
verse indices, I AM positions verified against the sheets; three half-verse boundary
overlaps confirmed intentional). Opus 5 visual QA — 27 findings; all 3 CRITICAL and
9 MAJOR fixed (label halos + counter-scaling on zoom, ward-lobe district hulls,
harbor moved outside the wall, dark-mode resurrection green, legend/how-to-read
rework, keyboard access); a few MINOR polish items deferred.

**GitHub note:** the cloud sandbox's GitHub proxy only allows repos pre-connected to
a session, so publishing runs from Ronald's WSL via `publish.sh` (gh repo create +
push + enable Pages).

**Commits:** *(IDs appended as made — each ID lands in the following commit)*
- `4cb9bf8` — Initial build: interactive map, data pipeline, review fixes
- `e211124` — publish.sh + logged 4cb9bf8

### Addendum: 3D view (same session)

Ronald asked what 3D would take (street-view height, orbit/tilt, easier zoom) and
about ancient-world styling (Jerusalem/Rome/Ephesus/Aksum). Decisions:
**Phase 1 now** — 3D as a separate `city3d.html`; ancient-architecture kits are
Phase 2 (scoped in README). Constraint discovered: the sandbox blocks npm/pip/CDN
fetches, so Phase 1 ships a dependency-free Canvas perspective renderer (painter's
algorithm) instead of bundling Three.js; the plan layout is shared verbatim with the
2D map so both views agree. Features: orbit/tilt/zoom/focus camera, **Walk the Way**
street mode with verse scrub (gate 1:1 → harbor 21:25), I AM obelisks, theme roads,
day/night, tooltips + detail panel. GitHub publishing clarified for Ronald: cloud
sessions can't create repos (proxy is repo-scoped); one-time `publish.sh` in WSL,
after which the repo can be connected to future sessions for direct pushes.

- `d497d07` — city3d.html: 3D orbit + Walk-the-Way
- `2d1e3bb` — logged d497d07
- `4d29284` — publish.sh made idempotent (identity + existing-repo push), after
  Ronald's second run hit "Name already exists" / "empty ident name"

### Published! (same day)

Ronald published: repo `recklessnode/gospel-of-john-city`, live at
https://recklessnode.github.io/gospel-of-john-city/. First deploy had a propagation
lag; 3D page followed in a second push. Ronald's feedback on 3D: the city rendered
**mirrored** ("upside down") vs the 2D map — root cause was a left-handed camera
basis (right vector = up×f instead of f×up); fixed to a proper right-handed lookAt
basis so N is up / E is right, matching the 2D map. Pitch clamped to ≈6°–89° so the
camera can orbit from street-grazing to top-down but never under the plane.

**Publishing saga, resolved:** update-by-bundle kept failing in Ronald's WSL because
his repos lived on /mnt/c (Windows mount) — DrvFS permissions + GitHub Desktop's CRLF
checkouts made git see every file as permanently modified. Fix that worked, in the
GitHub-Desktop clone: `git config core.fileMode false` + `core.autocrlf input` +
`git reset --hard`, then pull the self-contained full-history bundle and push
(cb32ca8..fff0189 on GitHub). Camera fix confirmed live on main via raw fetch.
Canonical working copy is now `Documents/GitHub/gospel-of-john-city`; future sessions
should connect the GitHub repo so Claude pushes directly.

- `15f59e7` — 3D camera fix (merged to GitHub in fff0189)
- `13247d9` — logged the publishing resolution

### Walkable streets (same day, Ronald's feedback)

Ronald: add a **pace** control to Walk the Way; make the road a real walked road with
a **hard boundary** so buildings never clip the camera; and give buildings **doorways
opening onto the road with entry walkways**, so a viewer can "enter" a passage.
Implemented: a road-clearance phase in the layout (buildings pushed to ≥ radius +
13.5 units off the frozen Way centerline; identical code in app.js and app3d.js so
2D and 3D remain the same city; wall hull and ward centroids recomputed after),
arched doorways on each building's road-facing side, paved entry walkways road-edge →
door (drawn as alley stubs in 2D), a 0.25×–5× pace slider in the walk bar, and an
"Enter ⏎" action that opens the interior (detail panel) of the passage being passed.

- `1617a3e` — walkable streets (pace, corridor, doorways, Enter)

### Streets v3 (same day, Ronald's feedback round 2)

Ronald: draw the road more visibly; add an entrance gate where the Way pierces the
wall (was clipping through); anchor building names as signs over their doorways;
free look-around while walking. Implemented: higher-contrast pavement with dashed
centerline + paving seams; Way×wall crossings detected and the wall gapped there,
with gate towers + lintel to walk under (CITY GATE at the Prologue entrance, WATER
GATE at the harbor exit); name-boards hung over each doorway, visible only from the
street side, nearest-first collision culling; walk mode free look (drag or ←→,
PgUp/PgDn pitch, ↑↓/wheel to move, look recenters on play); landmark buildings get
gold portal trim; district labels hidden at street level.

---

## 2026-08-10 — Session 2: Phase 2 M1 (Three.js) + two walk-mode bugs

**Participants:** Ronald + Claude (Opus 5, Claude Code on Ronald's machine)

**Setup:** the project moved out of the Cowork sandbox into Claude Code, cloned to
`~/gospel-of-john-city` (native ext4, so none of the /mnt/c fileMode/CRLF trouble).
Real npm and direct `git push` here: `npm install three esbuild playwright` just
works, and pushes go straight to origin — no more bundle relay.

**Bugs Ronald hit while walking the Way** (both in the canvas 3D view, both fixed
and pushed first, in `47be0b4`):

- *The road disappeared once you passed the gate; the ground fell away at the
  harbour.* Root cause was one line: `drawFlatPoly` bailed out entirely if **any**
  vertex projected behind the camera — which is guaranteed for the ground disc, the
  sea and the road ribbon as soon as you are standing on them. Ground polygons are
  now clipped against the camera's near plane in world space before projection.
  (The Three.js view never had this bug — the GPU clips properly.)
- *The environment dropped off the map at The Harbor.* The Sea of Tiberias blob
  overlapped the land, and the Way's last stretch ran into open water and simply
  stopped: you ended the book standing in the sea. The water is now a **bay with a
  real shoreline** (held back where the harbour quarter stands), the Way ends on a
  **stone quay with a jetty** running out into the water, and the ground disc was
  widened so the horizon is land, not void. The sea runs out past the land's edge
  so it meets the sky. The 2D map's decorative sea blob was left alone (it is
  painted behind the city there, so it never read as wrong) — say the word if you
  want the two synced.

**M1 — Three.js parity, done.** New page `city3d-three.html` (622 KB, self-contained,
no CDN), built from `src/` by esbuild and inlined by `scripts/build.py`. It
reproduces the canvas view feature-for-feature — orbit and Walk-the-Way cameras with
the same numbers and clamps, pace/scrub/free-look/Enter-to-explore, door signs with
nearest-first collision culling, ward/district/gate labels, overlays, day/night,
tooltips and the detail panel — on real WebGL: directional sun + hemisphere ambient,
PCF soft shadow maps, distance fog, and raycast picking instead of screen-space hit
circles. The two 3D pages cross-link in the header so they can be compared live.

**The invariant is now machine-checked.** `src/plan.js` holds the city plan as pure
math (no DOM, no Three.js), and `scripts/verify_parity.mjs` evaluates the plan
sections of `app.js`, `app3d.js` and `plan.js` over the same data and diffs hood
positions, the Way, wall segments, gates, obelisks and the sea/quay polygons. All
three agree exactly (61 hoods + annex, 361 way points, 24 wall segments, 2 gates,
9 obelisks). `npm run build` runs it first and refuses to build on drift — CLAUDE.md
invariant 1 is no longer a promise, it is a test.

**QA harness:** `scripts/shots.mjs` drives the real UI controls in headless Chromium
(swiftshader) and screenshots the walkthrough positions from the Phase 2 spec, light
and dark; `scripts/smoke.mjs` checks hover tooltip → click panel → Escape → walk bar
→ Enter-to-explore → overlay toggles → day/night. Both 3D pages pass all 9 checks.

**Tuned from the screenshots:** exposure lowered (the first pass washed out), road
darkened a touch for contrast against the ground, theme-road dots switched to
screen-space size (with size attenuation they ballooned into beach balls as you
walked past), label distance horizons matched to the canvas view's cutoffs, and
night shadows softened to 50% (a full-strength shadow at night was a black hole in
the street).

**Deviation from the spec, on purpose:** the spec suggested OrbitControls, but the
hand-rolled orbit camera was kept so the framing, drag feel and pitch clamps stay
identical to the canvas view — parity was the point of M1. Easy to swap later if
you want inertia.

**Next:** M2 — the building kits (Herodian temple platform, Roman fortress, stoas,
stepped pools, courtyard houses, crenellated wall, harbour quay + boats, stelae).

**Commits:** *(IDs appended as made — each ID lands in the following commit)*
- `47be0b4` — near-plane clipping fix + harbour coast/quay
