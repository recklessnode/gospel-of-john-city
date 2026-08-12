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
- `9ff43d2` — M1: Three.js city, parity check, QA harness, docs

### Walk-mode controls (same day, Ronald's feedback)

Ronald: shift-drag pan is inverted left/right, and Space paused the walk but never
resumed it. Both fixed, both now covered by `scripts/smoke.mjs`:

- **Pan inverted.** The Three.js port double-negated the pan vector — it built the
  camera's *left* vector `(f.z, 0, -f.x)` and then subtracted, so the city ran away
  from the mouse. Restored the canvas view's formula (right = `(-f.z, 0, f.x)`,
  target moves opposite the drag) so grabbing and dragging right carries the city
  right. The vertical axis was inverted by the same sign error and is fixed with it.
- **Space wouldn't resume.** Space was never handled in code — it was reaching the
  focused play button as a browser button activation. Once the walk was playing,
  pressing Space fired *both* that activation and (after the walk bar re-rendered)
  a second toggle, so pause stuck and resume cancelled itself out. Space is now an
  explicit walk-mode binding with `preventDefault()`, so it is a single clean
  pause/resume toggle no matter what has focus. Fixed in both 3D views.

- `c83d146` — smoke.mjs accepts a live URL

---

## 2026-08-10 — Session 3: PaulDz's chiasm request + Phase 2 M2a (building kits)

**Participants:** Ronald + Claude (Opus 5, Claude Code)

**Crash recovery:** the machine hard-rebooted mid-session. Nothing was lost — the
working tree was clean and `dd77e12` was already on origin, so M2a started from a
known-good state. (Worth remembering: `gh`'s *active account* had flipped to
`praeluceo` after the reboot, which fails with "Resource not accessible by personal
access token" on anything write-shaped. `gh auth switch --user recklessnode` fixes
it — this repo belongs to recklessnode.)

### PaulDz's feedback → issue #1

PaulDz asked for the chiasms *inside* a block to be visible — John 4:1–42 is a
single mega-complex building today, but it contains six chiasms (Water, Husbands,
Worship, The Christ?, Harvest, Outcome) — and for the **centre of each chiasm to be
highlighted**. He also liked the Book of Signs Metropolis and the city as a whole.

Filed as **issue #1** with his structure recorded verbatim, plus the survey of where
we stand: chiasms are modelled only at *ward* level today (a hood carries a `chiasm`
tag and a `center` flag, and the panel draws the ward's ladder), there is no
intra-block layer at all, and `n18` (Samaritan Well Forum) carries no `details`.
The issue proposes a `chiasms` array on a hood, deriving the centre rather than
hand-tagging it, and rendering in three places cheapest-first: detail-panel ladders,
then 2D interior courts, then — the natural home — a 3D forum with one interior
court per theme, each with a marked centre. Four questions are logged for PaulDz
rather than silently normalised: Theme 3's `Cʺ` after `B′` breaks the mirror,
Theme 4 ends `A` not `A′`, Theme 5 looks like two chiasms in one theme, and it is
unclear whether 4:1–6 should show as an unchiasmed forecourt.

### M2a — the kits

`src/kits.js`: four kits chosen by size tier and ward — **courtyard house** (<150
gw: flat roof, parapet, exterior stair, string courses, window slits), **civic
hall** (150–249: podium, four-column portico, pediment, hanging banners), **agora
forum** (≥250: colonnades round an open court, rear hall, awnings between the
columns), **Herodian temple platform** (Temple Citadel ward, ≥250: stepped ashlar
podium, grand stair, peristyle, gold façade band, sanctuary above). Plus a
**crenellated wall** with merlons, towers at ~105-unit intervals and arrow slits,
and **real arched gates** — thirteen voussoirs springing at head height, so you walk
under an arch instead of a flat lintel.

Three constraints shaped every kit: the footprint must stay inside the hood's circle
of radius `h.r` (the only space the layout guarantees is free), the height must stay
`h.h` (it encodes the Greek word count, which the page subtitle promises), and the
door goes on local +X, since the group is rotated by `-doorAng` to face the road.

**Colour was the thing that nearly broke.** First pass tinted walls 42% toward the
theme hue and the city went muddy — from orbit the seven-theme legend stopped
reading, which would have made the map lie. Fix: walls 60% toward the theme, and
**roofs 72%** — from above you are mostly looking at roofs, so that is where the
coding has to live — with awnings and banners left at the pure theme colour for
street level. Colour now reads at both altitudes.

Geometry accumulates in a `Parts` helper and is merged per material, so a forty-piece
temple costs four draw calls rather than forty.

### Review round (agent policy: build inline, review out-of-line)

**Fable 5 — mechanical audit.** All PASS: plan parity holds; all 62 blocks resolve
to a kit (25 house / 20 hall / 16 forum / 1 temple — Abraham Controversy); zero
footprint overlaps across 1,891 pairs (tightest margin 2.78u) and zero road
intrusions (tightest 1.17u); no NaN geometry; 372 meshes total, max 6 per block.
It caught one real defect: the kits were stacking roof slabs and parapets **on top
of** `h.h` instead of inside it, so short houses rendered up to 18% too tall —
quietly corrupting the "height = Greek word count" claim the page makes. Fixed;
correlation is now 1.0000, worst deviation 0.0%. It also found two dead materials
left from the cylinder era.

**Opus 5 — visual QA** on all 16 screenshots. 16 findings; two were verified false
before acting, which was worth the check:

- *"Buildings are cut in half by the city wall"* — **false**. Measured: no block is
  within 34.8 units of a wall segment, and the 14 towers clear by 32.6. The padded
  convex hull guarantees this (8 sample points at r+46 per hood, so the hull's
  distance to any centre is ≥ 0.924·(r+46)). It was a misread of the oblique
  top-down. Acting on it would have meant a wall-clearance pass in the plan — a
  change to hood positions requiring coordinated edits across all three renderers.
- *"A harbour block overhangs the sea"* — **false**. Tightest is Shepherd's
  Commission: reach 599.7 vs shoreline 608.0.

Fixed from the rest: world labels painting over the legend (z-index, plus the
legend and walk bar are now reserved boxes that labels are culled out of, not
merely painted under); collision culling extended from door signs to every label
class with a priority order (district → gate → ward → I AM → sign); door signs now
raycast for occlusion, so a sign no longer hovers in front of the city wall
labelling a building you cannot see; the civic-hall pediment floated behind its own
entablature; door awnings floated ~1 unit off the wall (now pulled in and
bracketed); `archOnFace` extruded doorways **outward**, so every door was a black
slab stuck on the façade rather than a recess; forum awnings hung 15 units up as
thin slivers; the landmark gold hoop was a torus around a square building sitting
below its parapet (now a gold cornice frame); ACES tone mapping added because the
light palette was clipping roofs and road to flat white; the camera near plane
raised 0.5 → 2 and polygon offset applied to the ground decals, which is what the
"z-fighting speckle" actually was; theme mix raised to 72% with painted architraves
so colour reads at street level, not just from orbit; the house kit was identical
everywhere and read as a face (two symmetric slits + awning + arch) — slits are now
seeded per block, 1–3 of them, off-centre, and string courses no longer cut across
the door head; label plates for gate/sea text on pale sky and stone.

Dark mode took two passes. Raising the stone and wall values did nothing on its own
because ACES tone mapping cancelled the lift; the actual culprit was the hemisphere
sky colour being near-black, so every vertical face at street level collapsed into
one silhouette. Night is now lit as moonlight rather than realism.

**Deferred to M2b** (recorded, not forgotten): harbour furniture — bollards, steps,
boats — which is the payoff of the whole walk and is still a bare ramp; and the
reviewer's note that `resurrection #008300` and `sign #1baf7a` are hard to tell
apart. That palette is shared with the 2D map and validated, so it is Ronald's and
PaulDz's call, not a unilateral fix.

**Commits:**
- `47be0b4`..`dd77e12` — carried in from session 2
- `96ce9a3` — M2a: building kits, crenellated wall, arched gates
- `ecc9c05` — M2a review fixes (labels, doorways, tone mapping, night)

### The Prologue hairpin and the gate alignment (Ronald's feedback)

Ronald asked two things about the road: is the extreme U-turn at The Cosmic Poem
intentional or an artifact, does side-of-road mean anything — and separately, that
the road should straighten to meet each gate face-on and only resume meandering
once through.

**Side of the road means nothing.** `r = BASE_R ± (42 + rnd·26)` alternates purely by
build index, and build index is narrative order, so it flips every pericope.
Verified: hoods #0/2/4/6 inside, #1/3/5/7 outside. It is an anti-collision zigzag,
not a statement. (Which makes it an unused channel — it *could* carry meaning
later, e.g. chiasm A-side vs A′-side.)

**The hairpin was an artifact, with a specific cause.** The Way's control points are
the ward centroids. Multi-hood wards average the inside/outside zigzag and land near
the ring (r ≈ 300–325); The Cosmic Poem is the only single-hood ward inside the wall,
so its "centroid" was just Hymn to the Word's position — which had drawn the inside
slot, at r = 269. The road dived 193 units from the gate to reach it and the spline
hairpinned back out at 111°. Fixed by holding non-outside ward control points to a
band around the ring (bearing untouched — only the radius is tamed). Worst bend is
now 81°, and it is at t≈0.89 where the Way genuinely leaves the ring for the harbour.

**The gate skew was not the road's fault.** Measured first: CITY GATE 43.7°,
WATER GATE 13.9°. Making the entry radial *did not fix it* — the skew got worse
(48°) because the gate is wherever the Way crosses the **wall hull**, and the hull is
a 21-vertex polygon whose edge there sits ~45° off the road's normal. No amount of
road shaping fixes a wall that is not perpendicular to it. So the gate is now built
**square to the road** — which is what real gatehouses do — and the wall is cut wider
along its own edge (24 units at the City Gate, 21 at the Water Gate) to clear the
skewed opening. You now walk straight through the arch at both gates.

The entry also got the shape Ronald described: a short curve outside the wall, then
three control points sharing a bearing so the stretch spanning the wall is straight.

**One regression caught and fixed:** the approach outside the wall lengthened the
Way, and the walk maps verse position linearly along arc length — so you reached
John 1:27 *before* entering the city. The plan now publishes `gateT` (where the Way
crosses the wall, as a fraction of arc length) and both 3D views anchor verse 1 at
the gate; the approach reads "Approaching the West Gate". This is what the code
comment always claimed ("gate = verse 1") but the implementation did not do.

**The plaza was not built.** Ronald approved marking the switchback with a plaza so
the loop had a reason — but straightening removed the loop, and building civic
furniture to justify a bend that no longer exists would be inventing content. Left
undone deliberately; say the word if a plaza is wanted for its own sake.

All three renderers stay in lockstep — parity re-verified after every step, and it
earned its keep: it caught the drift the moment plan.js was patched and app3d.js was
not (23 wall segments vs 21). The 2D map's layout shifts slightly as a consequence of
the Way changing; it renders clean, and the spiral reads better than before.

**Ronald confirmed the principle**, so it is now invariant 5 in CLAUDE.md rather
than a one-off call: *nothing in the city is invented*. Every building, landmark
and piece of civic furniture has to be grounded in the text or in PaulDz's
structural work — a block is a pericope, a stela is an "I AM" saying. Decorative
geometry that serves real content is fine (paving, kerbs, awnings, merlons); a
named place that is not in John is not. This has teeth for M2b: the harbour is
currently a bare quay and the temptation is to furnish it, but boats and a
charcoal fire are in John 21 and a market stall is not.

**Commits:**
- `96ce9a3` — M2a: building kits, crenellated wall, arched gates
- `ecc9c05` — M2a review fixes (labels, doorways, tone mapping, night)
- `255d4bb` — road entry straightened, held to the ring, gates squared to the road

### Build stamps (Ronald's request)

Ronald: there was no way to tell, on refresh, whether the page in front of him was
the latest build or a cached one. All three pages now carry a discreet stamp in the
header — `build 2026-08-11 03:04Z · ff1b5c4` — linking to the commit it was built
from, injected by `scripts/build.py` at `<!--__BUILD__-->`. The smoke test asserts
it is present and well-formed.

One wrinkle worth knowing: the hash names HEAD at *build* time, and the built HTML
is committed afterwards, so the stamp trails the history by one commit — the same
convention conversations.md already uses. The **timestamp** is the reliable signal
that something changed; the hash tells you which source state produced it.

---

## 2026-08-12 — Session 4: the chiasm feature (issue #1), built by workflow

**Participants:** Ronald + Claude (Opus 5 orchestrating; Opus 5 + Fable 5 agents)

**PaulDz answered, and the scope changed.** He confirmed all four open questions — the
`C″` that breaks Theme 3's mirror is correct (a triple C); Theme 4 ending `A` was a typo;
Theme 5 is two chiasms under one theme; the transition/introduction verses do belong as
an unchiasmed forecourt — and then attached the **chiasm structure of the whole gospel**
(996 lines, 58 pericopes, transcribed from Malina & Rohrbaugh, *Social-Science Commentary
on the Gospel of John*, Fortress 1998). So this was never a John 4 feature; John 4 was the
worked example. That file is now `data/chiasms-source.md` — under invariant 5 it is the
grounding for everything the feature displays.

He also asked two much larger questions, which were split out rather than allowed to ride
along: **#2** (trace Koester's theological themes through the city as routes) and **#3**
(make the district → ward → neighbourhood hierarchy legible). Worth recording for #2: the
mechanism is already half-built — the city draws two theme routes today and a route is
just an ordered list of blocks — so the blocker is not code. A theme route is a claim
about the text and has to come from PaulDz or a citable source, exactly as the chiasms did.

**Built by a six-agent workflow** (Ronald's call), Opus for design/UI/judgement and Fable
for the exacting parse and mechanical audits: design → parse → join → UI → parallel audits
→ fix. ~1M subagent tokens over about two hours, on branch `chiasms-issue-1`.

Result: **106 source units → 84 chiasms + 16 sub-chiasms over 62 blocks.** Per block:
6 blocks have none, 43 have one, 9 have two, one has four, two have six, one has seven.
No source unit went unmatched. Centre kinds: unpaired 38, pivot 31, band 3, pivot-single 3,
enclosed 2, pivot-group 1, and **6 with none** — the source genuinely marks no centre, and
the UI says *"No centre is marked in the source for this pattern"* rather than picking a
plausible middle rung. That honesty is the whole point of invariant 5.

The irregular cases PaulDz flagged all land correctly: 4:1–42 Theme 3's `Cʺ` stays a third
member of base C (and is exactly why C′ is not mistaken for the centre); 7:1–9's
`C1/C2/C′1/C′2` resolves to a four-rung centre panel; 8:13–19 highlights **B Judging**
among the five top-level headers he asked us to keep, with each header's lowercase run
getting its own centre.

**Verified independently, not taken on trust:** `npm run verify` (plan parity + a new
chiasm integrity/join check), `npm run build`, smoke tests on both 3D pages, a hand
spot-check of the triple-C unit against the source line by line, and the QA screenshots
read directly. Integration is deliberately small — two lines in `scripts/app.js` and
`scripts/app3d.js`, three in `src/main.js`, one shared `src/chiasm-ui.js` — and no layout
code was touched.

**Cost noted:** the corpus adds ~197 KB minified to every page (index.html 79 KB → 267 KB
raw). Gzipped, which is how Pages serves it, that is 56 KB for the 2D map — acceptable, so
it was left alone rather than optimised. The full-fat JSON stays on disk as the provenance
record.

**Open for PaulDz:** the six centreless chiasms, and whether the section-level chiasms
(IX over 13:1–17:26, X over 18:1–19:42) should be drawn on the map as arcs — that would be
a new visual claim, so it was deliberately not smuggled in with this feature.
