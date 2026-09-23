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

### Walk mode: inverted look, and jutter (Ronald's feedback)

Two reports: the citywalk still had inverted controls, and the motion was juddery.

**Inverted look.** The earlier fix corrected orbit shift-drag pan but not the *walk*
free-look, which was still FPS-style (drag right → turn right) while the cursor is a grab
hand and every other drag in the app is grab semantics. Walk look now matches: drag right
and the street swings right, i.e. you turn left. Both axes, both 3D views.
`smoke.mjs` now guards the direction (via a `?debug` handle) so it cannot silently flip
back a third time.

**Jutter — measured rather than guessed, and the first two guesses were wrong.**
Baseline during playback: 63 ms median, 77 of 106 frames over 33 ms. Idle in walk mode was
a clean 16.7 ms, so the cost was per-rendered-frame.

- *Guess 1, the label/occlusion work:* turning labels off changed nothing. Wrong.
- *Guess 2, the shadow map:* the sun never moves and the city never changes shape, but the
  renderer was re-drawing all 370-odd meshes into a 2048² depth buffer every frame. Freezing
  it after the first render (`shadowMap.autoUpdate = false`) is correct and worth keeping —
  63 → 54 ms — but it was not the main cost either.
- *Actual measurement:* `renderer.render` costs **8 ms** (402 draw calls, 34K triangles).
  The rest is rasterisation and compositing — which under headless swiftshader is software,
  so **these numbers do not transfer to Ronald's machine** and any further micro-optimising
  here would be optimising the test harness.

So the fix is one that self-tunes instead of assuming which resource is scarce: **adaptive
resolution**. Frame time is smoothed, and pixel ratio steps between 0.75 and the device
maximum with hysteresis and a 900 ms cooldown so it settles rather than oscillates. On a
high-DPI laptop that is up to a 7× fill-rate reduction when needed, and it costs nothing on
a machine that is already fast. Headless: 63 → 42 ms, scaler settling at 0.75.

Also fixed: walk speed was **frame-rate dependent** (`walkT += k` per frame), so on a slow
frame you moved less and the pace slider meant different things on different machines —
which reads as jutter even when frame delivery is even. Now delta-timed with a 50 ms clamp
so a stall cannot teleport you. Applied to both 3D views.

Added `?debug` on the Three.js page, which exposes the renderer, scene and a `quality()`
readout — so a machine-specific report can be gathered instead of guessed at.

### PaulDz's radial-city graphic, and student-authored routes (issue #2)

PaulDz commented on #2 with an annotated radial city plan — Prologue at the hub, Book of
Signs as the left/blue half, Book of Glory as the right/yellow half, Epilogue outside the
wall by the airport — and a question rather than a request: could a *student* plot their
own roads, subways and paths through the city, with the wedges between the major roads
serving as wards and neighborhoods?

**Measured before replying, rather than eyeballing the picture.** Running the plan and
taking bearings from the centre showed his graphic and our city already agree on almost
everything:

| his graphic | our plan, measured |
|---|---|
| Signs on the left/west | Signs Metropolis spans bearings 102°–261° |
| Glory on the right/east | Glory District spans 262°–327° |
| Epilogue outside the wall, SE | Harbor of Tiberias at 334°–344°, r 518–572; wall runs r 403–461 |
| wedges = wards containing neighborhoods | already `4 districts → 13 wards → 61 hoods`, laid out in ward order so wards are already contiguous arcs |

So the disagreement is about **shape**, not content.

**The one real difference is a hole we had not named.** Nothing in our city sits inside
radius 206 — roughly a quarter of the walled area is blank, because angle encodes narrative
order and every block is pinned to the ring. PaulDz puts the Prologue there. The
corroborating detail: *both* existing theme roads already start at the Prologue block (1:4
announces life and light), so they radiate from a hub that isn't there, and have to travel
out to the rim first to do it.

The trade, stated plainly in the reply: our plan organises by **time** (good for the Way,
bad for themes, which must zigzag around the rim); his organises by **structure** (good for
themes, but chapter order becomes a spiral). Reconcilable cheaply by keeping the ring and
filling the hub — Prologue at centre, radial avenues along the 13 ward boundaries so the
wedges *become* the wards, Way still running the ring. Invariant 5 holds: the hub is a block
we already have, the wedges are wards we already have, the avenues are boundaries already in
the data. Nothing invented. It also answers #3 nearly for free — containment shown by
construction instead of by a pale wash.

**On student authoring, the invariant-5 question was the one worth getting right.** The
rule governs the *city*, not the student: a student's route is a reading, and readings are
the point — what matters is that the map never launders a reading into a fact. Proposed
three visibly distinct tiers: **sourced** (Malina & Rohrbaugh, or a Koester list PaulDz
signs off) drawn solid and cited; **editorial** (our two roads) dotted with the verse
warrant; **student** in its own channel, always attributed, never written into repo data.

His street/subway/walkway metaphor turns out to carry real interpretive weight, and it also
solves the "ten routes would be visual mud" problem from the issue body: a **street** route
claims continuity (the passages between stops are part of the argument), a **subway** claims
connection without continuity (1:4 and 8:12 belong together whatever lies between), a
**path** claims a local link inside one ward. Three channels, so several can be shown at
once — and choosing the mode is itself an interpretive act the student must defend.

No server needed: routes live in the browser, export as a file, and encode into the URL — a
twelve-stop route is a handful of bytes, so handing work in is pasting a link. The payoff is
**"walk this route"**, pointing the existing walk camera at the student's stop list instead
of chapter order.

Sequencing proposed: route model + editor + share links now (independent of any replan, and
it unblocks the original Koester ask since sourced routes use the same model); hub + radial
avenues next; a full symmetrical-disc replan only if that proves the metaphor.

Three questions left with him, because they are his to answer and not the software's:
whether the Prologue at the hub is a *claim* (which would make radial distance mean
something, and needs a rule) or a convenience; whether the narrative Way survives as a
spine; and which themes are streets versus subways.

### PaulDz's way types and theme lists — measuring John, then banding it (issue #2)

Two more comments on #2. The first is one line and settles a question: *"That is where the
Prologue goes. The Prologue is John 1:1-13."* The second is a full specification — six Roman
way types (*via, vicus, clivus, semita, angiportus, ambitus*) with descriptions, exhaustive
verse lists for 34 themes, and a direct request: **"please choose which topic or theme is
assigned as which size way through the city."** His rule: the more text a theme takes, the
larger its way.

**Data first, in the same shape as the chiasm work.** His comment is transcribed verbatim to
`data/themes-source.md` as the provenance record. Three Fable agents parsed the lists in
parallel into structured JSON, and three more independently audited each parse against the
source — bolded names counted, every bullet's refs traced both directions, every ref checked
against John's real per-chapter verse totals. All three came back clean: **269 refs, none
dropped, none invented.**

**Measuring a theme needed a per-verse number the spreadsheet doesn't have.** It counts Greek
words per pericope, so `scripts/verse_weights.py` spreads each block's total across its
verses. One real bug found while building it: three blocks *split a single verse between
them* (7:14a/b, 16:4a/b, 19:16a/b), so weights must accumulate rather than overwrite —
without that the totals came up 44 words short. They now reconcile to 13,355 exactly. The
apportionment makes every Greek figure an estimate, which is stated in CLAUDE.md and in
everything shown to PaulDz; verse counts are exact.

**The assignment was made by threshold, not by taste.** Two Opus agents proposed complete
mappings from different angles (a disciplined-size reading, and one weighing each road's
character), and a third judged them and produced a final. Then the important step: the result
was re-expressed as **verse-count floors** — `40 / 28 / 11 / 6 / 3 / 0` in
`data/way-types.json` — and those floors reproduce the judged mapping **exactly, key for
key**. So nothing is hand-tagged. `verify_themes.mjs` (now in `npm run verify`) checks the
bands are ordered, that every way is what the thresholds derive, and that no two bands overlap
in verse count — which is what *proves* the mapping was derived rather than placed.

Result: **via 2 · vicus 2 · clivus 10 · semita 10 · angiportus 7 · ambitus 3.**

**What the measurement found that the reviewers were right to flag:**

- *His six-type list is not a size ranking.* Both proposals reached this independently: it is
  two groups of three, and neither group is internally ordered. The 3/3 grouping is his and is
  load-bearing; the order inside each triple is ours. The contested pair is **semita vs
  angiportus** — if he meant the alley above the sidewalk, **ten assignments flip.**
- *The compilation asymmetry, which is the most important finding.* His four classical lists
  are exhaustive; his six modern-concern lists are curated ("the verses most frequently turned
  to"). A rule that measures text quantity reads that difference in **method** as a difference
  in **weight** — 11 of the 12 largest themes come from the classical lists, 20 of the 22
  smallest from the modern ones. That shapes the entire city and it is not a fact about John.
- *Depth is not reach.* Signs is largest on both his measures (2395 words) but touches 11 of 61
  blocks, because a sign is a narrative sitting in one place. Belief is smaller (1319) but
  touches 35 blocks across 18 chapters. Proposed: his rule sets the **width**, reach sets the
  **length** — put to him rather than assumed.
- *John 3:16 gets a maintenance gap.* Smallest theme measured, so the rule hands the most
  quoted sentence in the Bible two to three feet of weed-choked dirt. Nobody would quietly
  promote it — the moment one theme is hand-placed the city stops being derivable — so it went
  to him as a choice between accepting it with intent (the *ambitus* was legally required, a
  firebreak) and stating a floor rule.
- *One ref has nowhere to go:* 8:20, under Glory through Humiliation, lands in no block,
  because invariant 4 detaches 7:53–8:11. Reported, not rehomed.

**On the Prologue, the data said something better than the question deserved.** Malina &
Rohrbaugh — the source PaulDz himself transcribed — put the Prologue at **1:1–18**, which is
where our block and ward come from. But their chiasm for it is A B C D C′ B′ A′ with **D =
1:12–13, "Children of God (new life)"** as the unpaired centre. So his 1:13 boundary lands
exactly on the end of the centre rung. The hub of the city would not merely be the Prologue,
it would be **the centre of the Prologue** — and that centre is becoming children of God,
which is what 20:31 says the whole gospel is for. Whether he wants the block *split* there or
was pointing at the centre is his call, so it was asked, not assumed.

**Nothing is drawn yet, deliberately.** The two biggest open questions — the semita/angiportus
order and the compilation asymmetry — would each send the rendering back to the start, so the
assignment went to him before any geometry was built. An error of mine caught by the judge in
passing: the brief I gave the agents said Belief spans 21 of 21 chapters; it is 18. Corrected
before it reached him, and not passed off as his.

Commits: 2a71182 (measurement + verifier), 56ebae0 (way bands).

**A design pass, and a bug it found on the way.** A fourth Opus agent designed how the six
way types are drawn — widths, sections, surfaces, kerbs, 2D and 3D treatments, dark-mode
rules — in `docs/theme-ways-design.md`. It anchors the scale off the existing road
(`2 × ROAD_HALF = 18` units read as a real via ⇒ **1 plan unit ≈ 0.65 m**), which makes the
*ambitus* 1.2 units = 2.6 Roman feet, exactly PaulDz's "two to three feet". Its collision
answer is one focus way plus up to three pins, with URL state so a reading can be reviewed by
link, and exhaustiveness kept in a table rather than in geometry.

While reading the rendering code it noticed that both 3D views decimate the sampled curve
with `i += 3`, which drops the tail unless the last index is a multiple of 3. Measured before
believing it: **the Light & Witness road was stopping 30 plan units short of its final stop**,
the Life & Water road 5.6. A shared `everyNth()` in `plan.js` (mirrored into `app3d.js` per
invariant 1) now always keeps the endpoint. Commit 8f3b2d7; smoke 14/12 checks, verify clean.

The design's own first-slice recommendation is deliberately ruthless about what *not* to
build — no width interpolation inside a band, no per-theme hue, no re-layout to make room for
ways, no ways for the 17 children — and it flags that the two hand-authored roads in
`john-data.json` (`life`, `light`) are hand-picked stop lists that the sourced themes now
supersede. Nothing rendered yet: the two open questions on #2 (the semita/angiportus order,
and the compilation asymmetry) change the *data* rather than the code, so the design survives
either answer, but the sizes it draws would move.

### Divine Fire split out into its own repository

Ronald had pushed a `divine-fire-synthesis` branch here (two commits, 2026-08-25): a 524-line
first-principles synthesis connecting divine Word, fire, holiness, clean/unclean distinctions
and judgment across the Hebrew Bible, Second Temple literature, rabbinic tradition and the New
Testament, plus the 299-line conversation it was distilled from. Docs only, no code, branched
cleanly off `main` at 672d283.

**Moved to [recklessnode/divine-fire-synthesis](https://github.com/recklessnode/divine-fire-synthesis)**
(private) on 2026-08-26, with both commits replayed onto a fresh history — original author,
dates and messages preserved, and both files verified byte-identical to the branch.

The reason for separating them is invariant 5. This project runs on *nothing in the city is
invented*: every building, landmark and route traces to the text or to a citable source. The
synthesis is openly constructive — it reasons from first principles and says so in its own
first paragraph. Those are two different standards of evidence, and keeping them in one
repository would eventually have let the looser one leak into the stricter one. The new repo
carries a CLAUDE.md saying so, and stating that nothing in it may be cited as a source for
city content: if a conclusion there belongs in the city, it has to arrive by the city's own
route, sourced to citable authors.

The branch is left in place here as a record; it is superseded, not lost.

### Moved into the razorclam project hierarchy

`/home` was at 92% (77 GB free of 916 GB), and the cause is sessions running with `cwd=$HOME`
so scratch lands loose, survives compaction, loses its owner and is never cleaned. A peer
session ("Bynoe Industries ERP") established a contract — `~/projects/HOUSEKEEPING.md` — under
which retention becomes a property of *location*, and asked every session to migrate what it
owns. This project moved on 2026-09-14.

**New path: `~/projects/gospel-of-john-city/git/gospel-of-john-city`.** Run `npm ci` before
`npm run build` — `node_modules/` and `build/` were deleted as regenerable, reclaiming 55.6 MB
of the 63 MB this project occupied. Both were gitignored, so the worktree stayed clean;
`package-lock.json` was kept, and `build/REGENERATE.md` records that it is the *only* copy of
the resolved versions because it is gitignored, so losing it costs reproducibility.

**The pin check ran before anything moved**, and two additions to it were worth making:

- **Verify `sudo -n` actually works first.** An unavailable sudo and a clean systemd tree are
  indistinguishable in the check as written — the empty result reads as "nothing pins this"
  either way. Confirmed sudo worked, so the negatives here are real.
- **A live process's cwd is a pin the check omits.** `ls -l /proc/*/cwd` found none for this
  project, but found two for `~/divine-fire-synthesis` — including a `claude --resume` session
  running since 2026-09-04. That tree holds **498 files against 3 commits**, so ~495 are
  uncommitted: precisely the highest-value, least-redundant content the contract says must
  never be moved automatically. It was created by this session in August and has since been
  adopted by another; it was left completely alone and recorded in OWNERS.md so the orphan
  sweep does not later read it as abandoned.

Nothing loose in `/home/ronald` belonged to this project — temp files have always gone to the
session scratchpad under `/tmp/claude-1000/...` — so there was nothing to collect and the
`fetch-*`, `dendrite-*` and trajectory files there were deliberately not touched.

Verified after the move, before trusting it: HEAD unchanged, 41 tracked files before and after,
worktree clean, `git worktree list` self-updated, all three verifiers passing, and the per-repo
`gh` account pin surviving (it lives in `.git/config`, so it travelled with the checkout).

### Retiring the two sketch roads — provenance (2026-09-22)

The city carried two hand-drawn **theme roads** from its first build. They were our
transcription of **PaulDz's early sketch**, not an invention of ours, and they are retired now
because his own later, exhaustive theme lists (issue #2, `data/themes-source.md`) supersede
them — and one of them, "Light & Witness", measures as more than one of his themes. Keeping
both pictures would have the map contradict itself. The sketch image is not in the repository,
so this entry is the only surviving record of what the roads were. Nothing below is typed; each
block is printed by the command beside it.

The attribution in the generator, `git show ce4b9e1:scripts/build_data.py | grep -n 'Theme roads'`:

```
281:# --- Theme roads (from PaulDz's sketch: theme paths snaking out of the Prologue) ---
```

The attribution in the README before this session, `git show 2ce9d82:README.md | grep -n -A1 'theme roads'`:

```
20:the **"I AM" landmarks**, the two **theme roads** (Life & Water, Light & Witness —
21-the two paths in PaulDz's sketch), and **chiasm bridges** linking A↔A′ pairs.
```

Origin, `git log -1 --format='%h %ad %s' --date=short 4cb9bf8`:

```
4cb9bf8 2026-08-10 Initial build: interactive Gospel of John city map
```

Each road, and where its stops fall among PaulDz's measured themes. Produced by
`node docs/provenance-sketch-roads.mjs ce4b9e1`, run from the repo root,
against the last commit that still carried the data key:

#### The Life & Water Road  —  1:4 — 'In him was life' • water, bread, and resurrection sites
stops (11): n3, n14, n18, n22, n30, n46, n62, n72, n83, n96, n98
| stop | top-level themes containing it | sub-entries containing it |
|---|---|---|
| n3 (1:1–18) | belief-eternal-life, life, witness-testimony, divinity-of-christ, light-vs-darkness, absolute-truth, child-of-god, born-again, incarnation | — |
| n14 (3:1–21) | belief-eternal-life, life, witness-testimony, holy-spirit-person-work, light-vs-darkness, spiritual-blindness, child-of-god, born-again, love-for-cosmos | — |
| n18 (4:1–42) | belief-eternal-life, life, witness-testimony, holy-spirit-person-work, i-am-statements | i-am-divine-name (sub-entry of i-am-statements) |
| n22 (5:1–20) | signs, divinity-of-christ | signs-bethesda-invalid (sub-entry of signs) |
| n30 (6:24–59) | belief-eternal-life, life, i-am-statements, abiding-in-christ, security-assurance, rest-sustenance | bread-of-life (sub-entry of i-am-statements) |
| n46 (7:37–39) | belief-eternal-life, holy-spirit-person-work, glory-through-humiliation, rest-sustenance, spiritual-empowerment | — |
| n62 (10:1–18) | life, i-am-statements, good-shepherd, greatest-sacrifice | door-of-the-sheep (sub-entry of i-am-statements), i-am-good-shepherd (sub-entry of i-am-statements) |
| n72 (11:17–44) | signs, belief-eternal-life, life, i-am-statements, jesus-friendship, grief-mourning | signs-raising-lazarus (sub-entry of signs), resurrection-and-the-life (sub-entry of i-am-statements) |
| n83 (14:1–31) | belief-eternal-life, life, divinity-of-christ, holy-spirit-person-work, i-am-statements, abiding-in-christ, abiding-intimacy, absolute-truth, prayer-jesus-name, honest-doubt, helper-comforter, overcoming-anxiety | way-truth-life (sub-entry of i-am-statements) |
| n96 (20:1–31) | signs, belief-eternal-life, life, divinity-of-christ, holy-spirit-person-work, jesus-friendship, grief-mourning, honest-doubt, spiritual-empowerment | signs-purpose (sub-entry of signs) |
| n98 (21:1–14) | signs, jesus-friendship | signs-catch-of-fish (sub-entry of signs) |

Against the measured theme `life`: 8 of 11 road stops are among its 18 blocks; 10 of its blocks are not on the road (n16, n24, n25, n33, n34, n48, n67, n77, n79, n88).

#### The Light & Witness Road  —  1:4 — 'the life was the light of men' • testimony and light sites
stops (9): n3, n5, n6, n16, n48, n57, n77, n88, n102
| stop | top-level themes containing it | sub-entries containing it |
|---|---|---|
| n3 (1:1–18) | belief-eternal-life, life, witness-testimony, divinity-of-christ, light-vs-darkness, absolute-truth, child-of-god, born-again, incarnation | — |
| n5 (1:19–28) | witness-testimony | — |
| n6 (1:29–34) | witness-testimony, holy-spirit-person-work | — |
| n16 (3:22–36) | belief-eternal-life, life, witness-testimony, holy-spirit-person-work | — |
| n48 (8:12) | life, i-am-statements, light-vs-darkness | light-of-the-world (sub-entry of i-am-statements) |
| n57 (9:1–41) | signs, belief-eternal-life, i-am-statements, light-vs-darkness, spiritual-blindness | signs-man-born-blind (sub-entry of signs), light-of-the-world (sub-entry of i-am-statements) |
| n77 (12:20–36) | belief-eternal-life, life, glory-through-humiliation, light-vs-darkness | — |
| n88 (17:1–26) | belief-eternal-life, life, divinity-of-christ, glory-through-humiliation, abiding-intimacy, cultural-alienation, absolute-truth, security-assurance | — |
| n102 (21:24–25) | witness-testimony | — |

No top-level measured theme is keyed `light`.

PaulDz is being invited to object if the sketch paths should stay (issue #2 draft).

### Theme ways, slice 1 — built, reviewed, fixed (2026-09-22/23, Opus 5.5, ultracode)

**Why now.** PaulDz had not answered the issue-#2 assignment in five weeks, after answering every
earlier reply within days. The diagnosis: the reply was 211 lines carrying about twelve questions — the
dense-ask shape that gets passed over (the same lesson the Divine Fire commit taught). So slice 1's one
job is to give him **a link per question** he can react to, instead of prose. The design survived his
silence because it is data-driven: his answers change `data/way-types.json`, not the code.

**Process, in the order it ran.** Each design and review step was a workflow; the building was inline
(agents.md: build inline, review out-of-line).
1. *Verify the five-week-old design against the code* (4 Fable agents): 23 claims, 7 wrong or stale, 38
   things it missed — the worst, removing the legacy checkboxes would null-deref at script load and kill
   the whole 2D page.
2. *Plan*, then *critique from two lenses* (Opus). Both critics independently found the same blocker:
   a centre-to-centre line passes under blocks the theme does not touch and reads as touching them.
3. *Revise against all 30 critique items*, then a completeness audit and a regression audit. The
   regression audit found the revision's own new bugs; past that point the tests became the verifier.
   The plan and its build-time addendum are `docs/theme-ways-slice1.md`.
4. *Build* C0–C10 below, every assertion mutation-tested: each check was shown to go red when the thing
   it guards is broken, not merely to go green.
5. *Independent visual review*, three Opus lenses + synthesis. **All three: not fit to show PaulDz.**
6. *Fix the nine essential findings*, then *re-review with the same instrument* (below).

**Commits** (all local until Ronald approves the push): d1ce1d2 plan · 2ce9d82 2D smoke test (the 2D page
had none) · ce4b9e1 legacy roads no longer drawn · 042cb0b themeRoads deleted, provenance kept · ba3958e
theme parse committed · 3632ef1 way widths · 111a31d data into the 2D page · 6b6b694 routing + node gate ·
7c7fdd8 drawing · 711df58 key · c966566 fit + floor · b5c2479 index Ways table · 6c1070b scale has one home
· 21c32ee materials · 4e8f539 badges · ed2b668 stubs · 3376355 dimming · bbe563a key wording · 52d7a00 draft.

**The honesty result.** Drawn naively, the 34 ways touch **117** blocks they are not on, across 22 ways.
Routed clear of non-member blocks, **0** uncertified crossings remain. What remains is 3 pinches on the
Signs via — two non-member blocks closer together than a via is wide — drawn as bridges and named in the
key. `scripts/verify_ways.mjs` gates this in `npm run verify`, in node, in seconds, using app.js's own
functions (no second copy); it is proven against a radial-only router, the bug a regression audit found.

**Bugs found on the way, most of them mine** (each fixed at its cause, each with a check that fails
without the fix):
- **The audited parse of PaulDz's lists had only ever lived in `/tmp`.** The restart erased it, and
  `build_themes.py` then silently wrote an empty `themes.json`. Recovered from the committed output —
  rebuilding from the reconstruction is byte-identical — committed as `data/themes-parsed.json`, and the
  script now refuses on missing or empty input. The same failure class as the Divine Fire tmpfs loss,
  carried in my own repo while I flagged it for another session.
- **The router settled a neck by iteration order**: pushes applied one block at a time let the last block
  win, so a line kissed one block and hugged the other. Pushes are averaged now (Cimmino), so a neck is
  split evenly — and the result no longer depends on which block the loop reaches first.
- **A synthetic test proved the wrong thing**: a block exactly on a sample was rescued by the d = 0
  tie-break, so it never exercised the normal-push fix it claimed to. It now uses a block between samples
  and asserts that it is.
- **The smoke harness crashed and lost every result** when an interaction failed; it now records the step
  as ✗ and keeps the rest. The "proposed" check was case-sensitive and missed "Proposed".
- **The build's size line counted characters as bytes.**
- **I committed once on a red smoke run** (ed2b668, amended before anything was pushed): the command
  printed the failures without gating on them. Every later commit runs smoke and verify first.

**What the visual review changed.** The via had been drawn in the Johannine Way's own casing, deck and
crown at 78% of its width — three identical main roads. Badges spread by angle hid each other on small
blocks, so Q4's shared block showed one way. The 3:16 stub hugged its rim and read as the legend's own
outline symbols. Dimming by `saturate()` left Passion blocks the darkest marks on the map. Fixed: ways use
greys that are not the Way's; the Way takes a lifted edge while ways are shown; badges stack in a
screen-spaced column above the labels; stubs are a dash outside every ring; dimming is one flat grey; the
key says who supplied what. **And the review caught a false claim in my draft**: Q4 said the two alleys
were "tied on both measures", but the Greek tie is an artefact of spreading each pericope's words evenly
over its verses — by NA28, 6:35 has about 26 words and 20:22 about 10 — and "3:16 ≈ 17" is wrong (it has
25). Q4 now claims a tie on verse count only, and the key states how the Greek estimate is made.

**Not built, deliberately**: route shields along each way, lane offsets at shared blocks, zoom-scaled
phone badges, a collapsed phone sheet, a six-type ladder in the key, a type-ordered phone floor, any 3D
drawing. **Found and not fixed, because it is not this slice's to settle**: an I AM star sits on 7:37-38
("Rivers of Living Water"), which has no ἐγώ εἰμι and is not in PaulDz's I AM list. It has been there
since the first build (4cb9bf8); it may come from his sketch, as the roads did. Removing it changes the
default map and settles a scholarly question — a question for him, not a quiet edit.

**The recheck, with the same three lenses** (each given its own first-round findings as a checklist).
Verdict: *close, but not yet* — every first-round blocker confirmed fixed, measured rather than eyeballed
(the Way's lifted edge 6.14:1 against a via kerb 3.22; same-block badges exactly 16.0 px apart; the 3:16
stub visible on a phone), and the honesty lens re-checked every figure in the key against the data and
found all correct. But the fixes had introduced their own problems, and the lenses found them: a dimmed
block's rings stayed bright, so Q4's solid alley read as a ring round Pilate's Judgment Seat; district
outlines outranked the ways in dark mode, so the 3:16 stub still read as one; the draft's intro said
"every line on the map" came from PaulDz's lists while the key calls routes schematic — two documents
contradicting each other; Q3 promised two roads and measured one; Q4's "only 1 block" steered the answer.
Fixed in 282f52d (rings and outlines recede while ways are shown; the key says which side a stub is on,
checked against the drawn dash) and 241c78e (the draft claims only what is computed; Q4 asserts the block
counts it states). Each check mutation-tested; the compass one catches reading SVG's y-down as y-up.

**Deferred to slice 2 by the recheck's verdict**: treat ward outlines as obstacles when placing a stub;
keep badges off label letters; route by ring extent and widen bridge clips over rings; name the verse the
Q4 alleys share (7:38) as well as the block; name the theme in Q2; a screen-space dash floor for the
ambitus and clivus on phones; the collapsed phone sheet; route shields; the six-type ladder. And the I AM
star on 7:37-38, to raise with Ronald as its own issue.

**Before the draft is posted, the work must be live**: its links point at GitHub Pages, which does not
have any of this until it is pushed. Order: Ronald approves → push → origin/main == main by ref → wait for
Pages → fetch one ?ways= link live and match its build stamp → only then post.
