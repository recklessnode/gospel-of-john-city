# Theme ways, slice 1: implementation plan (v2)

Repo: `/home/ronald/projects/gospel-of-john-city/git/gospel-of-john-city`, HEAD `98e3dc2`, `main...origin/main`.
Sources read: `docs/theme-ways-design.md` (all 100 lines), `CLAUDE.md`, `agents.md`, `data/way-types.json`,
`data/themes.json`, the four verification reports, and the two v1 critiques (honesty, ship-safety;
30 issues). **Where the verification or a critique contradicts the design, the code at HEAD decides**,
and every anchor below was re-read at HEAD for this revision.

**Anchors are for orientation only. Every deletion is done BY CONTENT**: find the quoted text,
delete it, then grep that the quoted text is gone and that its neighbours are still there. v1
proved why: it said "delete app.js:687-688", which would have removed ck-light *and* ck-chiasm and
left ck-life, a null deref at load (critique #21). Line numbers drift after the first edit of a
commit; quoted content does not.

**What changed from v1, in one paragraph.** Painter's order alone was not honest (both critics,
blocker): a centre-to-centre curve passes under blocks the theme does not touch. v2 restores
**hood clearance for non-member hoods only**, adds a node gate (`scripts/verify_ways.mjs`, in
`npm run verify`) that measures every way's non-member crossings before any browser runs, draws
the few crossings that cannot be cleared as visible **bridges** with a disclosure in the key, puts
the ways **under the city wall**, and generates every figure that PaulDz sees from data. C6 is
split into C6a (geometry + node gate) and C6b (drawing) so the cheap gate lands first. The commit
sequence is otherwise v1's.

Model identity (the relayed user request asked): this planning subagent runs as **Opus 5.5
(`claude-opus-5-5`)** according to its own system prompt. Whether "ultracode" is on can't be seen from
here, so the orchestrating session has to answer that.

---

## 0. What this slice is for

PaulDz has not answered in five weeks. The working diagnosis is that a dense prose request gets
passed over. Slice 1 therefore has **one job**: give PaulDz a **link per question** that opens a map
showing the proposed assignment, so he can react to a picture.

**No figure below is typed.** Each question is a template in `docs/issue2-questions.json`; the
`{…}` placeholders are filled from `data/themes.json` / `data/way-types.json` by
`scripts/draft_issue2.mjs` (C10), which also evaluates each question's `assert` list and refuses to
write a draft whose prose claim ("tied", "both via") is false. The table shows the templates, not
their values.

| link (`index.html?ways=…`) | question template (placeholders filled by the generator) | asserts |
|---|---|---|
| `signs,belief-eternal-life` | Both band as {signs.way} ({signs.verses} and {belief-eternal-life.verses} verses; {signs.band}). {signs.label} touches {signs.blocks} blocks and {belief-eternal-life.label} {belief-eternal-life.blocks}. Is the widest way the right reading for both? {signs.bridges} | `signs.way == belief-eternal-life.way` |
| `love-for-cosmos,born-again` | {love-for-cosmos.refs} is {love-for-cosmos.verses} verse, so it bands as {love-for-cosmos.way} ({love-for-cosmos.band}), the smallest way. Is that right, or does it deserve more? | `love-for-cosmos.way == last type` |
| `life,witness-testimony,light-vs-darkness` | Your sketch's two theme paths are retired in favour of your issue-#2 lists; its "Light & Witness" path measures as more than one theme: {witness-testimony.label} is a {witness-testimony.way} of {witness-testimony.blocks} blocks, {light-vs-darkness.label} a {light-vs-darkness.way} of {light-vs-darkness.blocks}. Object if the sketch paths should stay. | `witness-testimony.way != light-vs-darkness.way` |
| `rest-sustenance,spiritual-empowerment` | Tied on both measures ({rest-sustenance.verses} verses, {rest-sustenance.greek} Greek est.), they share {shared:rest-sustenance,spiritual-empowerment} block(s). Two alleys, not one? | `verses ==`, `greek ==` for the pair |

Row 2 changed from v1 (critique #4): v1 asked whether 3:16 "next to the born-again semita" was
right, but that adjacency is a product of **our** stub rule (the stub centres towards the nearest
hood by edge gap, n12 at 9.5 u, not towards the semita). The question now asks about the band,
which is data. Row 3 now tells PaulDz that his sketch's paths are retired and invites an
objection (critique #2).

The fourth row still **corrects the design** (§3 "exact co-extension"). Measured: no two of the 34
top-level themes have identical block lists (0 of 561 pairs); rest/empowerment are `[n30,n46]` and
`[n46,n96]`. The design text gets an inline correction marker in C0.

**Two things are the page's to say, not the plan's.** The *extents* (verses, blocks) are PaulDz's.
The *band* is ours. Every place a way type appears, the page shows `JOHN_WAYS.status`, read
verbatim from `data/way-types.json`, plus the derivation rule for that row, **computed** from
adjacent `minVerses` (e.g. "{verses} verses → vicus, band {28}–{39}"; the upper edge is the next
wider type's `minVerses − 1`, the widest type shows "≥"). The page never types the status sentence
or the word "proposed" itself: one fact, one home (imperative 5).

**How every number shown to PaulDz is computed (decision 2).**

- *In the page:* every figure in the key, the Ways table and the bridge notes is read at render time
  from `JOHN_WAYTHEMES` / `JOHN_WAYS` (injected verbatim, deep-equal-checked against the files in
  C5) or computed by the same pure functions the node gate runs (`wayRoute`, `wayCrossings`).
  smoke2d re-derives each displayed figure **in the test** from the page globals and compares; no
  expected value is a literal in the test.
- *In the draft comment:* `docs/issue2-draft.md` is **generated** by `scripts/draft_issue2.mjs`
  from `docs/issue2-questions.json` + the data files, committed, and re-checked by
  `node scripts/draft_issue2.mjs --check` inside `npm run verify` (regenerate in memory, fail on
  any diff). The generator **lints its own templates**: a digit anywhere outside a `{…}`
  placeholder is a build failure, so a typed figure can't get in by accident. The Pages base URL
  is read from README.md's `**Live map:**` line (its one home); the generator fails if that line is
  missing.

Sending the links is Ronald's call. C10 generates the draft and does not post it. GitHub Pages only
serves the links after a push, and **pushing also needs Ronald's go-ahead**.

---

## 1. Scope: kept, cut, and why

### Kept (each one is needed for PaulDz to see or react)

1. **Retire the two legacy roads.** They were our transcription of **PaulDz's early sketch**
   (build_data.py:281, README.md:20-21, conversations.md:32, origin 4cb9bf8), not our invention.
   They are superseded by his own later, exhaustive issue-#2 theme lists, and one of them ("Light &
   Witness") measures as more than one theme. Keeping both pictures would have the map contradict
   itself. The sketch image is not in the repo, so the stop lists and their labels are quoted into
   conversations.md as the only surviving transcription (C3).
2. **Data injection.** `themes.json` and `way-types.json` go into **index.html only**.
3. **`widthPlan` per way type** in `way-types.json`. The only new field.
4. **2D drawing of the six treatments**, stroke stacks only (§5).
5. **Non-member hood clearance** (routing step 3, restricted). New in v2; see the table below.
6. **Up to 4 shown ways, numbered ①–④**, with a number badge on every block each way touches.
7. **Block dimming.** Blocks on no shown way are desaturated; dimming never changes opacity.
8. **URL state, `?ways=a,b,c,d`.** A link is the whole review artefact.
9. **A way key** (`#waykey`) visible at every width, 400 px included.
10. **Fit-to-shown-ways**, with a 1-CSS-px on-screen floor (C8).
11. **An index-view Ways table**, placed **first** in the index view: all 51 rows (34 + 17 children
    under their parents). It is the exhaustive text and the only selector that works on a phone.

### Cut (say it out loud)

| cut | why |
|---|---|
| **In-map Ways panel** (search box, six type chips, 34 grouped rows) | `#controls` is `display:none` under 700 px (index.template.html:298-299), so a panel inside it is invisible on PaulDz's phone. The index table already holds all 34 rows. Desktop convenience; slice 2. |
| **Focus vs pin distinction** (`?way=…&pin=…`, gold kerb, 60 % pins) | Two states for one fact (which ways are shown). One param, `?ways=`, in order. No links exist yet, so nothing breaks. |
| **Way-corridor clip (routing step 4)** | Layer order does this job: ways are drawn under the Johannine Way, so a crossing reads as a junction. (v1 claimed the legacy roads set this precedent; they did not: app.js:364-365 declares gWall, gWay, **then** gRoads, so the old roads sat *above* the Way. The decision stands on the Way's primacy, not on precedent.) |
| ~~Hood-clearance push (step 3)~~ **→ restored, non-member hoods only** | v1 cut it, claiming painter's order does the same job. **It does not** (both critics, blocker). Measured on the real layout (§2.5): the naive centre-to-centre curve overlaps **117** non-member hood discs across the 34 ways, so a way visibly enters and leaves blocks it is not on, and when that block is on another shown way it is not even dimmed. v1's degeneracy argument (d = 0 at a stop) only holds when pushing away from *member* hoods; stops stay pinned at member centres and only non-member hoods push, so the push is well defined. |
| **Routing step 2, "push the final stop"** | The verification rates it **WRONG**. All three `catmullSample` copies already push the endpoint (plan.js:43, app.js:150, app3d.js:99). Pushing again duplicates it. |
| **Lateral offset for shared stretches** (§3) | Needs normals on a shared stretch. Only 37 of 561 pairs share a consecutive block pair and none are co-extensive; the badges say which way touches which block. |
| **Junction nodes** | Only needed where two ways over-paint; with ≤4 ways and badges, not in slice 1. |
| **textPath inline labels every 220 u** | The ①–④ badges plus the key carry identity, need no `getTotalLength()`, and answer "which blocks is it on". |
| **Gold halo rings on focused blocks** | Gold dashed rings already *mean* "landmark" (`.hood-ring`, index.template.html:128). |
| **Furniture ticks** and the **semita street-side kerb offset** | Decoration. Stroke stacks still give each type a distinct section. |
| **Linear-view way lanes** | Deleted in C2, not replaced. The key is hidden in the linear view so it never lists ways that are not drawn (C7). First thing to add if PaulDz asks about narrative *reach*. |
| **Stations for the 17 children** | Slice 2. Child rows say "inside <parent>; its verses are counted in <parent>'s way" (the rationale is build_themes.py:80-83). |
| **`y`, `kerb` and other 3D fields in way-types.json** | No consumer in slice 1; a field nothing reads will drift. |
| **Stripping fields at injection** | Compact `themes.json` is 15,004 B (~5.5 % of index.html). Verbatim injection is checkable by deep equality (C5). |
| **Global detour routing around a pinch** | Clearance is local: it moves the curve off obstacles, it does not search for a different way around a cluster. Where a via or vicus must pass between two non-member hoods narrower than its corridor, the crossing is drawn as a disclosed bridge (§2.5), not hidden and not re-routed. Slice 2 can add a detour search; the gate's counts are its baseline. |
| Search, type filters, walk-mode chips, 3D anything | Slice 2. |

---

## 2. Where the way maths lives: **app.js only, until slice 2**

**Decision:** the slice-1 way geometry lives **only in `scripts/app.js`**, as DOM-free functions
placed **above the parity marker** `/* ---------- svg helpers ---------- */` (app.js:211). It is not
added to `src/plan.js`, and `verify_parity.mjs` gets no themes diff. The node gate runs these
functions from app.js itself (the same `upTo()` slice verify_parity uses), so there is no second
copy to drift.

**Reasons.**

1. **Invariant 1 is about positions.** Slice 1 moves no hood, no Way point and no wall. Clearance
   moves only the *theme way's* own samples; hoods are read, never written. `npm run verify`
   parity stays the complete guard for invariant 1.
2. **With one consumer, a parity check compares a copy to nothing.** A `themeWayPts()` in plan.js
   with no 3D consumer would be imperative 5's second copy.
3. **The day slice 2 brings the second consumer (scene.js ribbons), the functions move to
   `src/plan.js`, get their app.js copy, and `verify_parity.mjs` gains the diff, in the same
   commit.** Copies are born with their check.

**The region above the marker is documented as the lockstep section** (CLAUDE.md invariant 1), so
the new functions carry a header comment (critique #11):

```js
/* ---------- theme ways: 2D-only until slice 2 ----------
   NOT mirrored in app3d.js or src/plan.js and NOT parity-checked. Pure: no DOM, no globals
   written. Exercised in node by scripts/verify_ways.mjs through the same upTo() slice. */
```

### 2.1 The functions (all above app.js:211)

| function | returns | notes |
|---|---|---|
| `wayStops(theme)` | member hoods sorted by `v0` | reads `byId`; throws on an unresolved block id |
| `wayObstacles(theme)` | every hood circle not in `theme.blocks`, plus the annex at `r + 6` (its `.annex-blob`) | the annex is on no theme's list |
| `wayRoute(stops, obstacles, hw)` | `{pts, pinned}`: the drawn polyline and which samples are stops | §2.2 |
| `wayCrossings(pts, obstacles, hw)` | `[{id, certifiedBy}]` | §2.3 |
| `wayStub(h, hw)` | `{cx, cy, R, a0, a1, capBinds, nearest}` | §2.4 |
| `wallPathD()` | the wall's path string | **moved**, not new: the two lines `const inner = DISTRICTS.filter(d => !d.outside)…` and `blobAround(inner, 58)` leave renderOrganic and renderOrganic calls this. One home for the wall, so the gate can count wall passes without a copy. |

`hw` = half the drawn casing width = `widthPlan × scale / 2`, where `scale` is derived (never
restated): in the page, `parseFloat(getComputedStyle(wayCasingEl).strokeWidth) / (2 * ROAD_HALF)`;
in node, the `.way-casing` rule's `stroke-width` parsed out of `index.template.html` over
`2 * ROAD_HALF` from the slice. Today both give 13/18.

All constants live in one `WAY_ROUTE` object: `{ PER: 32, STEP: 2, ITERS: 80, SMOOTH: 0.5,
MARGIN: 1.5, STUB_PAD: 0.6, STUB_FRAC: 0.55, STUB_CAP: 34 }`.

### 2.2 `wayRoute`: clearance for non-member hoods only

1. `raw = catmullSample(stopPts, PER)`; the samples at `k·PER` and the last one are **pinned**
   (they are the member-hood centres). Densify linearly so no two samples are more than `STEP` u
   apart (so a chord can't cut a disc between samples).
2. Repeat `ITERS` times: **push** every unpinned sample that lies within `o.r + hw + MARGIN` of an
   obstacle `o` out radially to that distance; then **smooth** every unpinned interior sample by
   `SMOOTH` towards its neighbours' midpoint.
3. Finish with one more push, so the last operation is a push.
4. Assert pinned samples are bit-identical to the stop centres (stops never move).

The 2D map then draws `pts` as an `M…L…` polyline (1-decimal coordinates, like `catmull()`), not
through `catmull()`, because the pushed samples are the geometry.

### 2.3 What counts as a crossing, and when one is allowed to remain

- **Crossing:** the drawn stroke overlaps a non-member disc, i.e. some polyline *segment* (not
  just a sample) comes within `o.r + hw` of the obstacle centre.
- **Certified pinch:** a residual crossing of `H` is certified when, at the polyline point closest
  to `H`, some *other* obstacle `B` both (a) has edge gap `|HB| − H.r − B.r < 2·(hw + MARGIN)`
  and (b) is itself within `B.r + hw + MARGIN` of that point. No point near there clears both.
  This is a **local** certificate: it proves the neck is narrower than the way, not that no detour
  around the cluster exists (see the cut table).
- **Why pinches can happen at all, derived:** buildWay's relaxation keeps hood edges at least 8 u
  apart (`min = A.r + B.r + 8`, app.js:187), and measured the minimum edge gap is exactly 8.00.
  A way's corridor is `w + 2·MARGIN`: via 13.11, vicus 9.50, clivus 7.33, semita 5.46, angiportus
  4.59, ambitus 3.87. So only via and vicus can ever be pinched (44 and 37 hood pairs are narrower
  than their corridors); clivus and below always fit between any two hoods. The gate prints this
  table from the constants, so it stays true when a width changes.

### 2.4 `wayStub` (single-block themes)

Centre = the hood, `R = h.r + hw + STUB_PAD`, arc length `L = min(STUB_FRAC·2π·h.r, STUB_CAP)`,
centred on the bearing to the hood with the smallest edge gap. The stub is **ours, not data**; the
key says so (C7). Measured: the cap binds for all five single-block themes, and none of the five
stubs overlaps a non-member disc. The gate prints both facts rather than a comment asserting them
(critique #11).

### 2.5 Measured today (snapshot; the committed gate's output is the home of these figures)

Measured at HEAD 98e3dc2 by running app.js's own plan section (`layoutOrganic(); buildWay();`)
in node, with the C4 widths (via 14 … ambitus 1.2), `scale` = 13/18 parsed from the template,
`MARGIN` 1.5. Prototype: `scratchpad/clearance.mjs` (becomes `scripts/verify_ways.mjs` in C6a).

| measure | naive centre-to-centre curve | after non-member clearance |
|---|---|---|
| non-member disc overlaps, all 34 ways (stroke width counted) | **117** | **3** |
| same, centreline-only (stroke ignored) | 102 | — |
| ways with ≥ 1 overlap | 22 of 34 | 1 of 34 |
| worst ways | witness-testimony 12, signs 11, divinity-of-christ 9, holy-spirit-person-work 9, life 8 | signs 3 |
| certified pinches / uncertified | — | 3 / **0** |
| stubs (5) overlapping a non-member disc | 0 | 0 |
| passes under the city wall | 3 (signs, witness-testimony, jesus-friendship; one each) | 3 (same) |

The honesty critic measured 95 centreline crossings with point samples at 16 per segment; the 102
here tests segments at 64 per segment. The difference measures the sampler, not the layout, and
is why the gate tests segments.

The three residuals are all on **signs** (a via, corridor 13.1 u):
n36 Brothers' Challenge (pinched against n40, gap 8.1), n44 Arrest Attempts (against n47, gap
8.4), n90 Garden of Arrest (against n92, gap 8.0). They are unchanged at 400 iterations, so they
are geometry, not under-convergence. Sensitivity: MARGIN 3.0 leaves 8 (signs 3, life 2,
witness-testimony 3), all certified; MARGIN 0 is degenerate (pushed samples sit exactly on the
test boundary), which is why MARGIN > 0.

**This matters for link 1**: n36 and n44 are *Belief* blocks, so in `?ways=signs,belief-eternal-life`
the Signs via passes over two lit blocks it is not on. That is exactly the case the blocker
described, and it is why the remaining crossings are drawn and disclosed, not hidden.

### 2.6 The gate: fails on the fixable, reports the unfixable

**Decision:** `scripts/verify_ways.mjs` **FAILS** (exit 1) on any **uncertified** residual
crossing, and **REPORTS** every certified pinch as a measured figure, per way and in total.
Reasons: an uncertified residual means clearance failed where the geometry had room (a bug; fail
loudly, imperative 2). A certified pinch is a property of the layout that no local router can
fix; failing on it would block the build until someone deletes the check or fakes the route, and
a silent pass would hide it. An honest, reported crossing beats both.

What "reported" means for a certified pinch, so it is never silent:

1. **On the map:** the way is redrawn above the hood as a **bridge**: the same treatment layers,
   clipped to a disc of radius `H.r + hw + 1` around the crossed hood, in `gWayBridges` (after
   `gHoods`). A continuous way drawn *over* a block with its casing intact is the cartographic
   overpass convention: it reads as passing over, not stopping in. The block gets no badge.
2. **In the key row:** "passes over N block(s) it is not on — no room between blocks: <short
   names>", N and names computed from `wayCrossings`.
3. **In the gate output and the draft:** the `{signs.bridges}` placeholder in the issue-#2
   template is filled from the same computation.
4. **Cross-artifact check (smoke2d):** the drawn path is parsed back out of the DOM and tested
   against the hood circles read from the DOM; the set it crosses must equal the set of
   `[data-bridge]` elements for that way. The node gate and the rendered page must agree.

The gate also fails on: a moved stop; a way whose residual count exceeds its naive count; any
stub overlap; an unresolved block id; a block list out of `v0` order after `wayStops`; a bridge
clip disc reaching the Johannine Way casing. It prints `unmeasured` and exits 2 if it examined
0 ways or 0 obstacles.

**Test the instrument first:** the gate runs two synthetic cases before the real data (a straight
2-stop way through a disc must count 1 crossing naive and 0 after clearance; a way tangent-clear
of a disc must count 0), and `node scripts/verify_ways.mjs --naive` (clearance disabled) must
**exit 1** on the real data, with 117 overlaps reported as uncertified. That proves it can say no.

**The same rule for `everyNth`.** Once the legacy roads are deleted, `everyNth`
(src/plan.js:46-55 and its copy at scripts/app3d.js:309-315) has **zero consumers** (scene.js:192
and app3d.js:810). Both copies are deleted in C2; slice 2 can restore it with a consumer.
`catmullSample` stays: the Way and `wayRoute` use it.

---

## 3. The legacy roads in 3D: **both 3D views show no theme ways after this slice**

**Decision:** `city3d.html` (canvas) and `city3d-three.html` (Three.js) show **nothing**. The
dotted-road code, its hue maps and its two checkboxes are removed. No replacement goes in.

- Only one of the two sketch paths has a clear measured counterpart, and even that one is partial:
  8 of the `life` road's 11 stops are in the measured `life` theme, and 10 of that theme's 18
  blocks are not on the road. The `light` path's stops spread over several measured themes (the
  per-stop table is generated in C3). Showing `life` alone in 3D would promote one of 34 themes
  because a sketch path once went there.
- A 3D replacement would draw in the retired idiom (hue-per-road, `pal.themes.sign`), or pull the
  six treatments into 3D, which is slice 2's whole job.
- It would need `themes.json` in the 3D pages, which slice 1 leaves out (C5).
- The canvas page "only needs its two dead roads removed" (design §4).

Retirement reason, stated in the log and the draft: **superseded by PaulDz's own issue-#2 theme
lists**, not "invented". The key is deleted from `build_data.py` (both sites) and `john-data.json`
is regenerated. `verify_themes.mjs` gains a gate that fails if a `themeRoads` key comes back. The
stop lists, labels, notes and the sketch attribution survive **only** as quoted provenance in
`conversations.md` (C3).

---

## 4. Ordered commits

Escalation is always the same: grep and node checks (seconds), then `npm run verify` (no
browser; now includes `verify_ways` and `draft_issue2 --check`), then `npm run build`, then
`smoke2d` in 4 configs, then `smoke` on both 3D pages, then the Opus visual review (out-of-line,
agents.md rule 2). Each commit names **the check that fails without it**.

**Before C0 (environment, not committed).**

- `npm ci` (package-lock.json is gitignored; conversations.md says to run it).
- `openpyxl` is **not installed**, so `build_data.py` cannot run. Throwaway venv in the regenerable
  class: `python3 -m venv build/venv && build/venv/bin/pip install openpyxl`.
- Baseline: `npm run verify` passes at HEAD (61 hoods + annex, 409 way points).
- **An untracked `scripts/smoke2d.mjs` appeared in the working tree while this plan was being
  revised** (not in HEAD; `git status` showed the tree clean at session start). C1 reads it in full
  and either adopts it against the C1 spec below or deletes it; it is never committed unread.

### C0: Record the slice-1 plan
- Copy this file to `docs/theme-ways-slice1.md` (the "record build prompts + specs" rule).
- `docs/theme-ways-design.md`: a two-line pointer at its head (slice-1 decisions supersede §1
  routing, §2 focus/pin and §3's co-extension), **plus a one-line inline correction marker at each
  false factual claim** (critique #7), each pointing to the slice-1 doc, found by content:
  - line containing `the existing sampler drops it` (§1 step 2): false; catmullSample pushes the
    endpoint (plan.js:43); the real bug was everyNth, fixed in 8f3b2d7.
  - line containing `**Exact co-extension**` (§3): false; 0 of 561 pairs are identical.
  - line containing `src/plan.js:264-268` (§5.5): now 274-279.
  - line containing `scripts/app.js:625-646` (§5.11): now 624-639.
  - line containing `21.9 KB and rides into all three` (§5.14): slice 1 injects 15,004 B into
    index.html only.
  - **Not marked:** §5.4's `scripts/app.js:686`. v1 and the honesty critique both said "actually
    :687"; at HEAD :686 *is* the ck-life line (ck-light :687, ck-chiasm :688), so the design is
    right there and v1 was wrong.
- Check: none can fail (docs only).

### C1: Add a 2D smoke test (the instrument comes first)
- `scripts/smoke2d.mjs` (takes `target`, loops over light/dark × 1440/400 unless `--config`,
  writes screenshots with `--shots <dir>`). See the untracked-file note above.
- `package.json` gains `"smoke": "node scripts/smoke2d.mjs index.html && node scripts/smoke.mjs city3d-three.html && node scripts/smoke.mjs city3d.html"`.
  Not in `build` (it needs a browser).
- Initial checks: no pageerror or console error; build stamp present; `.hood[data-hood]` count
  equals hood count + annex computed from `JOHN`; switching to linear and index views throws
  nothing; at 400 px `document.documentElement.scrollWidth <= innerWidth` (this guards the page
  chrome only; it **cannot** see overflow inside `#indexview`, which is absolutely positioned with
  its own scroller, so the Ways table gets its own check in C9); `.layer-chiasm` is `display:none`
  by default and shows after `#ck-chiasm` is clicked (the guard for the C2 mis-deletion, critique
  #21).
- **Check that fails without it:** the file doesn't exist in HEAD.
- **Test the instrument first:** it must pass on HEAD's `index.html` in all 4 configs **and must
  FAIL** on `node scripts/smoke2d.mjs index.template.html` (the `/*__DATA__*/` placeholder raises a
  pageerror).

### C2: Stop drawing the legacy theme roads (consumers only; the data key stays)
Every consumer in one commit (split pairs are null derefs). **Delete by the quoted content**;
line numbers are HEAD orientation.

- `scripts/app.js`
  - organic loop (:423-431): from `// theme roads` through the closing `}` of
    `for (const key in JOHN.themeRoads) {` (the hue idiom `key === "life" ? "var(--t-sign)"` is
    inside it).
  - organic declaration (:365): remove `gRoads = el("g", { "class": "layer-roads" }), ` and keep
    `gHoods = el("g", {}),` on that line.
  - linear declaration (:531): the same text, keep `const gBase = el("g", {}), ` and the next line.
  - linear lanes (:624-639): from `// theme lanes above the skyline` through the loop's closing
    `}` (second hue copy inside).
  - `applyOverlays` (**:686-687**): the two lines containing `show("#road-life` and
    `show("#road-light`. **Keep** the line containing `show(".layer-chiasm"` (:688).
  - module top level (:694): remove `"ck-life", "ck-light", ` from the array; keep `"ck-iam"`,
    `"ck-chiasm"`, `"ck-labels"`. Must land with the markup, or the page dies at load.
- `index.template.html`: the two `<label>` lines containing `id="ck-life"` and `id="ck-light"`
  (:328-329); the `.theme-road {` rule (:141). **Keep** `.roadline` (:167), used by the ck-chiasm
  label (:330).
- `src/plan.js`: the `themeRoadPts` block (`for (const key in JOHN.themeRoads)`, :274-279);
  `themeRoadPts` from `buildPlan`'s return (:358); `everyNth` and its comment (:46-55); and in the
  docstring at :66-67, `obelisks and theme roads.` becomes `and obelisks.` (critique #8/#30).
- `src/scene.js`: `import { everyNth }` (:12); `themeRoadPts` in the destructure (:69); the
  dotted-overlay block from `const dot = dotTexture();` (:186-201); `function dotTexture()` (:44-54,
  sole caller :187); the `tc` retint lines (:278-279); `themeRoads` from the return (:291).
- `src/main.js`: the two lines containing `mk("ck3-life"` and `mk("ck3-light"` (:409-410).
- `scripts/app3d.js`: the `everyNth` copy and the `themeRoadPts` block (:309-320); the dotted loop
  containing `const trColors =` (:805-816, including the per-frame `getElementById("ck3-" + key)`);
  the two `mk()` lines for ck3-life/ck3-light (:1079-1080).
- `scripts/smoke.mjs`: the list at :70 becomes `["ck3-iam","ck3-labels"]`; add
  `ok("legacy road toggles are gone", !(await page.$("#ck3-life")) && !(await page.$("#ck3-light")))`.
- `scripts/smoke2d.mjs`: `#ck-life`, `#ck-light` and `.theme-road` counts all 0.
- `README.md:18-21`: stop listing the two theme roads as a toggle; the sketch attribution moves to
  conversations.md with the stop lists (C3).
- Leave alone: conversations.md's historical mentions; every `"light"`/`"dark"` colour-scheme token
  (main.js:36/:416, app.js:791, app3d.js initTheme, shots.mjs:26/:36, build_data.py:108-114).
  **Never run a repo-wide sed on light/life.**
- `npm run build` rebuilds all three pages.
- **Checks that fail without it (cheapest first):**
  1. `! grep -rniE "themeRoads|themeRoadPts|trColor|ck3?-li(fe|ght)|theme-road|theme road" src scripts/*.js index.template.html city3d.template.html README.md`
     (critique #8: `theme road` with a space catches plan.js:67). ~20 hits at HEAD, must be 0.
     smoke.mjs/smoke2d.mjs are excluded (they hold the negative assertions); build_data.py joins
     the grep in C3.
  2. `grep -c 'show(".layer-chiasm"' scripts/app.js` is exactly 1 (the neighbour survived).
  3. The new negative smoke assertions fail against HEAD's pages; the chiasm-default check from C1
     stays green.
  4. Parity, `smoke` on both 3D pages and `smoke2d` stay green.

### C3: Delete `themeRoads` from the data, keep the provenance
- **Provenance first (before editing), generated not typed** (critiques #2, #3, #30). Append to
  `conversations.md`:
  - the build_data.py:281 comment verbatim: `# --- Theme roads (from PaulDz's sketch: theme paths snaking out of the Prologue) ---`;
  - README.md:20-21's attribution verbatim: "(Life & Water, Light & Witness — the two paths in
    PaulDz's sketch)";
  - the origin commit **4cb9bf8** (2026-08-10, "Organic city view (after PaulDz's sketch)");
  - both roads' `label`, `note` and `stops`, as JSON, printed by
    `git show HEAD:data/john-data.json | node -e 'console.log(JSON.stringify(JSON.parse(require("fs").readFileSync(0)).themeRoads,null,1))'`;
  - a **per-stop table** (stop → the top-level themes containing it, then any sub-entries labelled
    "sub-entry of <parent>"), plus the reverse (measured blocks of the same-named theme that are
    not on the road), printed by a node one-liner over `git show HEAD:data/john-data.json` and
    `data/themes.json`. Paste its output **with the command that produced it**. (Checked for this
    revision: it labels `light-of-the-world` as a sub-entry of `i-am-statements`, shows that n88
    is in none of light-vs-darkness, witness-testimony or light-of-the-world, and prints life's
    10-of-18 reverse gap. v1's hand-typed "4 / 5 / 2" counts are dropped.)
  - The stated reason: these were our transcription of PaulDz's sketch; superseded by his issue-#2
    lists; "Light & Witness" measures as more than one theme; PaulDz is invited to object (C10).
- `scripts/build_data.py`: the `"themeRoads": {},` placeholder (:118) and the block from the
  `# --- Theme roads (from PaulDz's sketch` comment through the dict's closing `}` (:281-294).
- **Null subject first:** before editing, run the *unchanged* generator
  (`build/venv/bin/python scripts/build_data.py`) and require `git diff --exit-code data/john-data.json`.
  If HEAD's generator doesn't reproduce HEAD's file, stop.
- Regenerate, then `npm run build`.
- `scripts/verify_themes.mjs`, after the join checks (~:95):
  `if ("themeRoads" in JD) fail("john-data.json carries themeRoads — theme extents live only in data/themes.json")`.
- **Checks that fail without it:**
  1. Run **before committing C3**, so `HEAD` is the C2 commit (its sha is recorded in the log
     entry): load `git show HEAD:data/john-data.json`, delete `themeRoads`, deep-equal the
     regenerated working-tree file. The only allowed difference is the key.
  2. `grep -c themeRoads index.html city3d.html city3d-three.html` is 0 for all three (the key is
     injected by build.py:43 today).
  3. The verify_themes gate (fails before this commit; stays as the regression gate). The C2 grep
     now also covers `scripts/build_data.py`.

### C4: Give each way type a drawing width
- `data/way-types.json`: `"widthPlan"` per type: via 14, vicus 9, clivus 6, semita 3.4,
  angiportus 2.2, ambitus 1.2. The only new field.
- `scripts/verify_themes.mjs`, section 5 (from :97): every type has a numeric `widthPlan`, widths
  strictly decrease in band order, and `via.widthPlan < 2 * ROAD_HALF` with `ROAD_HALF`
  **imported from `../src/plan.js`** (exported at plan.js:11).
- `python3 scripts/build_themes.py`, then `git diff --exit-code data/themes.json` (unchanged).
- **Re-band procedure, documented here and in the log** (critique #20): edit a `minVerses` in
  `data/way-types.json` → `python3 scripts/build_themes.py` → `npm run build`. `verify_themes`
  refuses to build between the first and second step (a way that no longer matches its band), and
  smoke2d's fixtures follow automatically because they are derived (C6b).
- **Check that fails without it:** the new verify rule.

### C5: Inject the way data into the 2D page only
- `scripts/build.py`: after the chiasm load (:69-75), load `data/themes.json` and
  `data/way-types.json`. **A missing file is a hard `sys.exit(1)`**, not the chiasm-style warning
  (both are committed sources). `assemble()` (:42) gains `ways=None`; when set, `prefix` (:48-51)
  gains `window.JOHN_WAYTHEMES = <compact>;\nwindow.JOHN_WAYS = <compact>;\n`
  (`separators=(",",":")`, `ensure_ascii=False`). Only the index.html call (:88) passes it. The
  name is `JOHN_WAYTHEMES`, not `JOHN_THEMES`, so it can't be confused with `JOHN.themes` (the 7
  colour categories).
- `smoke2d.mjs`: `page.evaluate(() => [window.JOHN_WAYTHEMES, window.JOHN_WAYS])` deep-equals the
  two files read from disk.
- `smoke.mjs`: `window.JOHN_WAYTHEMES === undefined` on both 3D pages.
- Record index.html bytes before and after in the log (measured by the build's own print line).
- **Check that fails without it:** the smoke2d deep-equality.

### C6a: Way geometry and its node gate (no drawing yet)
The cheap gate lands before any pixel (imperative 1).

- `scripts/app.js`, **above :211**, under the header comment of §2: `WAY_ROUTE`, `wayStops`,
  `wayObstacles`, `wayRoute`, `wayCrossings`, `wayStub`, and `wallPathD()` (moved out of
  renderOrganic by content: the `const inner = DISTRICTS.filter(d => !d.outside)` statement and
  `const wallPath = blobAround(inner, 58);` become `const wallPath = wallPathD();`).
- `scripts/plan_slice.mjs` (new, ~10 lines): exports `upTo(file, marker)` and
  `app2dPlan(JOHN)`; `verify_parity.mjs` imports `upTo` from it instead of defining its own (one
  home for the slicer).
- `scripts/verify_ways.mjs` (new): §2.6 in full. Output per way: key, type, blocks, naive,
  residual, certified list, wall passes; per stub: R, L, cap binds, nearest, overlaps; then the
  corridor-vs-minimum-gap table; then the totals line
  (`ways 34 · naive 117 · residual 3 (certified 3, uncertified 0) · stubs 5, overlaps 0 · wall passes 3`
  at today's data). A pass collapses to that line; a failure prints the offending way's full
  polyline to `build/verify_ways/<key>.json` and keeps it (imperative 2).
- `package.json` `verify` gains `&& node scripts/verify_ways.mjs` (it reads C4's `widthPlan`).
- `verify_parity.mjs` must stay green: the additions above the marker are definitions, and moving
  the wall lines changes no position (the 2D wall is not in parity's return; the check is a
  byte-compare of `wallPathD()` against the old inline expression, run once in the commit's log).
- **Checks that fail without it:** `node scripts/verify_ways.mjs --naive` exits 1 (117 uncertified
  overlaps) and the synthetic cases; without `wayRoute` the default run exits 1 too. It runs in
  seconds, before any browser.

### C6b: Draw the ways named in `?ways=` on the 2D map
- **URL parse at boot, before `renderIndex()`** (critique #27; boot is app.js:809-813,
  `renderIndex()` at :811): `new URLSearchParams(location.search).get("ways")`, split on `,`,
  **deduplicated in order** (critique #22), each key kept only if it is a top-level theme; cap 4.
  Rejects are kept for C7 (unknown, child, duplicate, over cap). Reading `location.search` is never
  guarded.
- **Boot order** becomes `layoutOrganic(); buildWay(); <parse>; renderIndex(); resetVB(); renderOrganic();`
  (resetVB moves before renderOrganic so it can't wipe the C8 fit; critique #18a).
- `drawWay(g, theme, type, opts)` (below the marker): for 2+ blocks, the `wayRoute` polyline; for a
  stub, an SVG `A` arc from `wayStub`. It draws a stacked `<path>` per treatment layer inside
  `<g class="way way-<type>" data-way="<key>">`; `opts.swatch` makes the wrapper
  `<g class="way-swatch way-<type>">` instead (no `.way` class; critique #15). Every map assertion
  in smoke2d is scoped to `#map .way`.
- Bridges: for each certified residual, the same layers in `<g class="way-bridge"
  data-way="<key>" data-bridge="<hood id>" clip-path="url(#bridge-<key>-<id>)">` in `gWayBridges`.
- Badges: numbered circle + text per (way, member block) on the hood's west arc, offset by way
  index. Fill `--ink-1`, text `--surface-1`.
- Dimming: `.dimmed` on every `[data-hood]` circle not in the union of shown blocks (annex
  included).
- **Layer order in `renderOrganic()` (decision 1), declared in this order** (`el()` appends in
  call order, app.js:217):

  `gWater, gDistrict, gWays, gWall, gWay, gHoods, gWayBridges, gWayBadges, gChiasm, gIam, gLabels`

  - **Ways go under the city wall.** Invariant 5: "the wall and gates are where the plan puts
    them". Three ways (signs, witness-testimony, jesus-friendship) join an inner block to a harbour
    block and pass the wall once each (§2.5). Drawn above the wall they would cut a gap where the
    plan has no gate, which reads as a gate. Drawn below it, the wall stays continuous (its stroke
    is 7 u at 0.85 opacity, so the way shows faintly beneath: *passing under*, not *through a
    gate*). The key footer says "Theme ways pass beneath the city wall; they make no gates." The
    rejected alternative, routing ways through the real gates, would bend themes to the Way's
    geometry and is a slice-2 question.
  - **Ways go under the Johannine Way** (primacy; a crossing reads as a junction) and under the
    entry walkways in `gWay`.
  - **Ways go above the district wash** so the translucent wash does not tint them.
  - **Hoods paint over ways** at member stops (the way ends at the centre, hidden by the member's
    own disc); **bridges and badges paint over hoods**.
- `renderOrganic()` calls `applyWays()` next to `applyOverlays()` (:521).
- `index.template.html`:
  - Tokens (with values, critique #19), in `:root` and `:root[data-theme="dark"]`:

    | token | light | dark | why |
    |---|---|---|---|
    | `--way-kerb` | `#8a8374` | `#9a9384` | darker than the deck in light, **lighter** in dark (the semita polarity flip) |
    | `--way-shade` | `#6f6a5f` | `#8a8577` | the alley/gap tone; light-on-dark in dark mode, so it inverts by value, not by opacity |

    Measured contrast (WCAG ratio) against page / district wash / water: `--way-kerb` 3.42 / 3.23 /
    2.99 light, 6.14 / 5.69 / 4.53 dark; `--way-shade` 4.89 / 4.62 / 4.27 light, 5.09 / 4.71 / 3.76
    dark. The Way's own casing is 1.62 / 1.52 / 1.41 light and 1.99 / 1.85 / 1.47 dark. Both are
    greys, **no new hue**.
  - Treatment classes after :124 (§5 table). No `opacity` on any way layer.
  - `.hood.dimmed { filter: saturate(.15); }` after :127, and
    `.hood.dimmed:hover { filter: saturate(.15) brightness(1.12); }` (critique #28; `.hood:hover`
    at :126 would otherwise replace the dimming filter).
- **Fixtures are derived, not hard-coded** (critique #20). smoke2d builds them from
  `JOHN_WAYTHEMES`: per type present, the multi-block theme with the most blocks and, where one
  exists, a single-block theme; chunked into URLs of ≤ 4. It asserts the covered-type count equals
  the number of types present in the data, and prints `unmeasured: <type> stub (no single-block
  <type>)` for each type without a stub (today via, vicus and clivus). A re-band can shrink
  coverage only visibly.
- **Checks that fail without it (smoke2d, 4 configs × every derived fixture URL):** all of §5's
  per-way and per-page assertions. The default page (no param) still has 0 `#map .way`,
  0 `.dimmed` and 0 `.way-bridge`.

### C7: The way key
- `index.template.html`: `<div id="waykey" role="region" aria-label="Theme ways shown" hidden>`
  after `#hint` (:357). CSS near :296: bottom-right,
  `max-width: min(360px, calc(100% - 72px))` so it clears `#zoomctl` (bottom-left); a ≤ 700 px rule
  keeps it visible when `#controls` is hidden.
- `scripts/app.js`, `renderKey()`. Rows are built with DOM calls and `textContent`, never an
  `innerHTML` template (critique #22). Each row:
  - the number ①–④;
  - a swatch drawn by `drawWay(…, {swatch:true})` (one home for the look, no `.way` class);
  - type label and PaulDz's `gloss`;
  - `{verses} verses → {type} (band {lo}–{hi})`, the range computed from adjacent `minVerses`
    (critique #10);
  - `{blocks.length} blocks`; `Greek ≈ {greek} (est.)`; refs when there are 3 or fewer;
  - **stub rows** (`blocks.length === 1`): "one block: drawn as a stub beside it; its position and
    length are not data" (critique #5);
  - **bridge rows**: "passes over {n} block(s) it is not on — no room between blocks: {names}";
  - a remove button `×` with `aria-label="Remove {label}"`.
- Footer: `JOHN_WAYS.status` verbatim; "Lines join each theme's blocks in verse order; the route
  between blocks is schematic." (critique #5); "Theme ways pass beneath the city wall; they make no
  gates."; the 1-px floor note when active (C8); reject notes, each via `textContent`: unknown key
  (the raw key as text), child key ("inside {parent}; its verses are counted in {parent}'s way"),
  duplicate, over the cap of 4.
- URL writes (× and C9 toggles): build the query by hand as `ways=` + keys joined with a literal
  `,` (keys are `[a-z0-9-]`, no encoding needed), keep any other params and the hash, then
  `history.replaceState` **inside try/catch** (CLAUDE.md:54-55). Critique #26: `URLSearchParams`
  would write `%2C`.
- **The view-switch handler owns `#hint` (app.js:779) and must learn about ways** (critique #16).
  Replace `document.getElementById("hint").style.display = isIndex ? "none" : "block"` with
  `hint.style.display = (isIndex || shownWays.length) ? "none" : ""` (empty string hands control
  back to the stylesheet, which also fixes the pre-existing override of the ≤ 900 px rule), and add
  `waykey.hidden = view !== "organic" || !shownWays.length`. The key is hidden in index and linear
  views.
- **Checks that fail without it:**
  - key text contains `JOHN_WAYS.status`, read from the page global;
  - every row contains "est."; row count equals the shown count;
  - band text equals the range recomputed in the test from `JOHN_WAYS.types`;
  - stub rows carry the stub note; bridge rows list exactly the `[data-bridge]` ids of that way;
  - the word "proposed" occurs in the page's visible text only inside occurrences of the status
    string (critique #6);
  - `?ways=nope,signs` draws signs and shows a note containing `nope`;
    `?ways=%3Cb%3Ex%3C%2Fb%3E,signs` creates **no** `<b>` inside `#waykey` and the note's text
    contains `<b>`; `?ways=signs,signs` draws one way; 5 keys draw 4 and show the cap note;
  - × leaves one fewer `#map .way`, and the keys parsed from `location.search` match (compare
    parsed keys, not a literal string);
  - × has an accessible name containing the theme label; `#waykey` has role `region`;
  - at 400 px, **after driving the phone path** (Index → toggle → Show, C9) as well as after a URL
    load: the key's box is inside the viewport and intersects neither `#zoomctl` nor `#hint`;
    `#hint` computed display is `none` while ways are shown; the key is hidden in the index and
    linear views.

### C8: Fit the view to the shown ways
- `scripts/app.js`: the fit is **the last step of `renderOrganic()`** (after `applyWays()`), so both
  boot (C6b's reordered `resetVB(); renderOrganic();`) and the view-switch path (already
  `resetVB(); renderOrganic();`) keep it. It never runs on pan or zoom and does nothing when no
  ways are shown.
- Box: the shown blocks' circles plus stub arcs, padded by 40 u. **The available screen area
  excludes the key** (critique #18c): fit into the svg's client rect minus `#waykey`'s height
  (bottom sheet at ≤ 700 px) or width (side card above), with `vb` aspect matching that area, and
  the existing `300 ≤ vb.w ≤ 3200` clamp (app.js:726 and :763).
- **Sub-pixel remedy, decided: a 1-CSS-px floor on the outermost layer** (critique #18b). Measured
  fits at 400 px: `rest-sustenance,spiritual-empowerment` → vb.w ≈ 811, angiportus ≈ 0.78 px;
  `signs,belief-eternal-life` and `life,witness-testimony,light-vs-darkness` → vb.w ≈ 1042
  (0.38 px/u). `setVB()` already sets `--inv` on the svg for label counter-scaling (app.js:710);
  it also sets `--u1px` (one CSS px in user units), and each outermost layer's width is
  `max(<w>px, var(--u1px))`. Below the floor two types can draw at the same width; their dash
  patterns still differ, the key swatch shows true relative widths, and the key footer says
  "{n} way(s) are thinner than a screen pixel at this zoom and are drawn at 1 px", n computed and
  the line shown only when n > 0. If the first smoke run shows Chromium ignoring `max()` in
  `stroke-width`, fall back to computing the floored width in `setVB()` (same test).
- **Checks that fail without it:** for every derived fixture URL at 400 px: viewBox width < 1200
  unless the box needs more; every shown block's screen bbox is inside `#mapwrap` **and does not
  intersect `#waykey`**; every shown way's outermost on-screen width
  (`strokeWidth × clientWidth / vb.w`) is ≥ 1 CSS px. `?ways=love-for-cosmos` alone is ≈ 0.3 px
  today, so this fails. C10 extends the same assertion to every link in the generated draft.

### C9: The Ways table in the index view
- `scripts/app.js`, `renderIndex()` (:652-681): the Ways table goes **first** in the view, before
  the places table (critique #17), inside `<div class="ways-wrap" style="overflow-x:auto">`, with
  a "Places ↓" jump link after it.
  - Caption: `JOHN_WAYS.status`. Column header is plain `Way`; no typed "(proposed)" (critique #6).
  - Rows grouped in `JOHN_WAYS.types` order, then verses descending. Each top-level row:
    `<button class="way-toggle" data-way aria-pressed="false" aria-label="Show {label} on map">`
    first, then label, type, verses, Greek (est.), block count, chapters, refs.
  - The 17 children indented under their parent, no toggle, "inside {parent}; its verses are
    counted in {parent}'s way".
  - "Show N on map" clicks the organic `#viewseg` button (N computed).
  - Toggle rows **must not use `data-open`** (:678-681 binds that to `openHood`).
  - `renderIndex()` runs once (:811) but after the URL parse, so toggles start in the right state;
    toggling updates `aria-pressed` and the ①–④ marker in place.
  - A refused 5th toggle writes its reason into an `aria-live="polite"` note.
- **Checks that fail without it:**
  - rows equal `JOHN_WAYTHEMES.themes.length` and toggles equal the count of themes with `way`,
    both computed in-page (51 and 34 today);
  - toggling 2 rows then "Show" gives 2 `#map .way` groups and both keys in `location.search`;
  - `aria-pressed` flips; focusing a toggle and pressing Space adds the way (keyboard, critique #23);
  - a 5th toggle is refused with a visible message;
  - at 400 px: every toggle's box is inside `[0, innerWidth]`, and the first toggle's top is inside
    the first screen of `#indexview` without scrolling;
  - **null subject for that check** (critique #17): inject a 1500 px-wide cell *before* the toggle
    column in a test-only copy of the first row; the same assertion must go red.

### C10: Log, docs and the generated PaulDz draft
- `docs/issue2-questions.json`: the four §0 templates, their `ways`, and their `assert` lists.
- `scripts/draft_issue2.mjs`: fills placeholders from the data (`{key.field}` for verses, greek,
  blocks (count), way, label, refs, band; `{shared:a,b}`; `{key.bridges}` from `wayCrossings` via
  `plan_slice.mjs`), evaluates the asserts, lints for digits outside placeholders, reads the Pages
  base from README.md's `**Live map:**` line, and writes `docs/issue2-draft.md`: one link and one
  line per question, the status string verbatim at the top, and the sketch-retirement line. **Not
  posted; Ronald decides.** `--check` regenerates in memory and diffs; `npm run verify` gains
  `&& node scripts/draft_issue2.mjs --check`.
- `smoke2d.mjs` reads the links from `docs/issue2-draft.md` (never restating them) and runs the C8
  on-screen-width and key-overlap assertions and the §5 per-way assertions on each.
- `conversations.md`: session entry with C0–C9 commit IDs (each recorded by the following commit),
  the verify_ways totals line pasted from its output, index.html sizes from the build's print line,
  and the design overrides (step 2, step 3 restored for non-members, the co-extension claim).
- `README.md`: a short "Theme ways" paragraph with the `?ways=` format, pointing to
  `data/way-types.json`'s `status` for their standing rather than restating it (critique #6).
- `scripts/build_themes.py:6-8` docstring (critique #12): **keep PaulDz's quote verbatim** ("the
  more text it takes to describe a theme, the larger the way"); replace only our sentence ("so the
  Greek count is the ranking key…") with: ranking by verse count is our proposal, see
  `data/way-types.json` `rankedBy` and `status`. The code at :84-88 is unchanged.
- **Checks that fail without it:** `draft_issue2.mjs --check` (no draft today; a hand edit to the
  draft or a data change fails it); the template digit lint; the asserts; the smoke2d run over the
  draft's links. The out-of-line Opus visual review of the C6b–C9 screenshots happens **before**
  this commit and its findings go into the log.

---

## 5. Tests

### The six treatments (2D, stroke stacks, no offset maths)

`w = widthPlan × scale` (13/18 today; derived in-page). The layer fractions are presentation
constants in one `TREATMENT` table in app.js. Colours are tokens only; **no layer has `opacity` or
`stroke-opacity`**, so what the contrast test computes is what paints.

| type | w (illustrative) | layers (outer → inner) | light | dark |
|---|---|---|---|---|
| via | 10.1 | casing w `--road-casing`, fill 0.82w `--road-fill`, centre dash `10 6` 0.7 `--baseline` | same tokens | same tokens (they flip) |
| vicus | 6.5 | casing w `--road-casing`, fill 0.78w `--road-fill`, **rut pair** = 0.40w `--way-kerb` under 0.29w `--road-fill` | | |
| clivus | 4.3 | casing w `--road-casing`, **gutter pair** 0.62w `--way-kerb` under 0.50w `--road-fill`, rung dash `0.8 5.2` 0.5w `--way-kerb` | | |
| semita | 2.4 | kerb w `--way-kerb`, deck 0.5w `--road-fill` | kerb darker than deck | kerb lighter than deck |
| angiportus | 1.6 | casing w `--way-shade`, core 0.5w `--road-fill` | dark lane edges | light lane edges (inverts by token value) |
| ambitus | 0.9 | single stroke, dash `1.6 2.4`, `--way-shade` | | |

### `scripts/verify_ways.mjs` (node, in `npm run verify`, before any browser)

§2.6. Crossings, certificates, stops unmoved, `v0` order for all ways, stub R/L/bearing/cap for
all single-block themes, wall passes, the corridor table, the synthetic null subjects and the
`--naive` must-fail run.

### `scripts/smoke2d.mjs`: four configs

Configs light 1440, dark 1440, light 400, dark 400 (dark via Playwright `colorScheme:"dark"`,
which app.js:787-789 turns into `data-theme="dark"`). URLs: the derived fixtures (C6b), then the
draft's links (C10).

Per shown way (all selectors scoped to `#map`):

1. `#map g.way.way-<type>[data-way=<key>]` exists and its type equals `JOHN_WAYTHEMES`'s `.way`.
   The page reads `t.way` and never re-bands.
2. The outermost layer's computed `stroke-width` equals `max(widthPlan × scale, u1px)` ±0.01, with
   `scale` recomputed in the test as `.way-casing` computed width / `page.evaluate("2 * ROAD_HALF")`
   (the page's own top-level const; critique #9: no typed 18).
3. `getBBox()` width and height > 0. This proves the element has geometry, **nothing more**; it is
   the same in every config (critique #29). Per-config visibility is test 4's job.
4. **Contrast, per config.** For the layer that carries the type's identity (the outermost layer
   for every type in the table above), resolve its computed stroke colour, **multiply the opacity
   chain** (`opacity` and `stroke-opacity` of the element and every ancestor up to `svg`) and
   composite onto each ground: `--page`, `--district-wash` on `--page`, `--water`. Require, per
   ground, a ratio ≥ the Johannine Way casing's ratio on the same ground in the same mode (floors:
   1.62/1.52/1.41 light, 1.99/1.85/1.47 dark, computed in the test from tokens, not typed). Badge
   text vs badge fill ≥ 4.5:1.
5. Badge count equals `blocks.length`; no badge on a `[data-bridge]` hood.
6. A stub arc exists exactly when `blocks.length === 1`.
7. **Cross-artifact crossing check** (the blocker, in the browser): parse the outermost layer's
   `d` back into points; for every `[data-hood]` circle not in the way's blocks (cx, cy, r read
   from the DOM), test segment distance < r + w/2. The crossed set must equal that way's
   `[data-bridge]` set. In `?ways=signs,belief-eternal-life` that set is n36, n44, n90 today, two of
   them undimmed Belief blocks, each drawn as a bridge.

Per page:

8. The number of `.hood.dimmed` equals hoods + annex − |union of shown blocks|. **Dimming never
   changes opacity** (critique #14): for each dimmed element, computed `opacity` with the class
   equals computed `opacity` with it removed (the annex keeps its own 0.55).
9. DOM order: every `#map .way` precedes the first `.wall`, the first `.way-casing` and the first
   `.hood`; every `.way-bridge` and badge follows the last `.hood`. `#map .way` groups are in
   ascending `widthPlan`.
10. 400 px: no horizontal page scroll; `#waykey` visible and inside the viewport (C7 detail).

Plus C1, C5, C7, C8 and C9 checks. The default page still has 0 `#map .way`, 0 `.dimmed`,
0 `.way-bridge`. ✓/✗ output like smoke.mjs; exit 1 on any failure or page error.

With `--shots out/ways` it writes one PNG per URL × config for the Opus visual QA (agents.md
rule 2). Reviewer checklist:

- Is each of the six types distinguishable from the others?
- Is the Johannine Way still primary?
- Does any theme way appear to cut the city wall or make a gate?
- Do the signs bridges read as passing *over* those blocks, not stopping in them?
- Are the badges legible? Is 3:16 findable?
- Does anything overprint a block label? (not machine-checked: no 2D label culling)
- Is the status line visible?

### `scripts/smoke.mjs` (3D)
- :70 drops `ck3-life`/`ck3-light`; negative assertion that both are absent (C2);
  `JOHN_WAYTHEMES` undefined (C5). Run on **both** 3D pages (default target is only
  city3d-three.html, :7).

### `scripts/shots.mjs`: **no change**
Zero road tokens in it; the 2D screenshots come from `smoke2d --shots`, so the pixels come from the
run that made the assertions.

### `verify_*`
- `verify_themes.mjs`: C3 (no `themeRoads`), C4 (`widthPlan` present, strictly decreasing, via <
  2×ROAD_HALF imported from plan.js).
- `verify_ways.mjs`: new (C6a).
- `draft_issue2.mjs --check`: new (C10).
- `verify_parity.mjs`: imports `upTo` from `plan_slice.mjs`; otherwise unchanged and must pass.
- `verify_chiasms.mjs`: untouched.

### Escalation per commit
grep/node one-liners → `npm run verify` (parity, chiasms, themes, ways, draft) → `npm run build`
→ `node scripts/smoke2d.mjs index.html` → `npm run smoke` → Opus review (after C6b, C7, C9). A
failure keeps its log, screenshot and (for verify_ways) the offending polyline until it has been
turned into a check; a pass collapses to its ✓ line.

---

## 6. Anchor index (HEAD 98e3dc2; orientation only, delete by content)

| file | lines | what |
|---|---|---|
| scripts/app.js | 33 | `catmull()` SVG path helper (stubs/other shapes; ways now draw polylines) |
| | 136, 138-151 | `ROAD_HALF = 9`; `catmullSample` (endpoint pushed at :150) |
| | 187 | buildWay relaxation `min = A.r + B.r + 8` (why pinches exist) |
| | 211 | parity marker; new pure fns + `wallPathD()` go above |
| | 217 | `el()` appends in call order → layer order |
| | 364-366 | organic layer groups; new order in C6b; drop gRoads |
| | 394-397 | wall: `inner` + `blobAround(inner, 58)` → `wallPathD()` |
| | 423-431 | legacy organic road loop → delete |
| | 453 | annex circle `opacity: 0.55` (dimming must not change it) |
| | 521 | `applyOverlays()` in renderOrganic; add `applyWays()`, then the fit |
| | 531 | linear `gRoads` → delete |
| | 624-639 | legacy linear lanes → delete |
| | 652-681 | `renderIndex`; `iv.innerHTML` :672; `[data-open]` binding :678-681 |
| | 683-689 | `applyOverlays`; delete **:686-687** (ck-life, ck-light); keep :688 (ck-chiasm) |
| | 694-695 | top-level checkbox array; drop ck-life/ck-light |
| | 710-714 | `setVB()` sets `--inv` (precedent for `--u1px`) |
| | 726, 763 | vb clamps 300..3200 |
| | 779 | view handler sets `#hint` inline display → fix in C7 |
| | 787-789 | prefers-color-scheme → data-theme |
| | 809-813 | boot; parse before :811 `renderIndex()`; `resetVB()` before `renderOrganic()` |
| index.template.html | 8-39 / 40-69 | `:root` / dark; add `--way-kerb`, `--way-shade` |
| | 120 | `.wall` stroke 7, opacity .85 |
| | 122-124 | `.way-casing` 13 (scale source) / `.way-fill` / `.way-center`; treatments after |
| | 126-128 | `.hood:hover`, `.hood.selected`, `.hood-ring`; `.dimmed` rules after 127 |
| | 141 | `.theme-road` → delete |
| | 167 | `.roadline` → **keep** (ck-chiasm :330) |
| | 285-294 | `#indexview` table CSS (reused) |
| | 296-299 | `#hint`, ≤900 px hint rule, ≤700 px `#controls` rule |
| | 328-329 | ck-life / ck-light labels → delete |
| | 347 / 357 | `#zoomctl` / `#hint`; `#waykey` after :357 |
| | 360-361 | `const JOHN = /*__DATA__*/;` then `/*__APP__*/` |
| src/plan.js | 11 | `export const ROAD_HALF = 9` |
| | 30-44 | `catmullSample` (endpoint :43; stays) |
| | 46-55 | `everyNth` + comment → delete |
| | 66-67 | docstring "obelisks and theme roads" → "and obelisks" |
| | 274-279 | `themeRoadPts` → delete |
| | 358 | return list: drop `themeRoadPts` |
| src/scene.js | 12, 44-54, 69, 186-201, 278-279, 291 | everyNth import, dotTexture, destructure, dotted overlays, `tc` retint, return |
| src/main.js | 409-410 | `mk("ck3-life"/"ck3-light")` → delete |
| scripts/app3d.js | 309-320, 805-816, 1079-1080 | everyNth copy + themeRoadPts; dotted loop (`trColors` :806); `mk()` lines |
| scripts/smoke.mjs | 7, 70-73 | default target; overlay list |
| scripts/build.py | 42, 48-54, 69-75, 88 | `assemble`, prefix, chiasm load (precedent), index.html call |
| scripts/build_data.py | 118, 281-294 | `themeRoads` placeholder; sketch comment + assignment |
| scripts/build_themes.py | 6-8, 80-88 | docstring; child rationale + band derivation |
| scripts/verify_themes.mjs | 26-27, 97-115 | file loads; section 5 |
| scripts/verify_parity.mjs | 19-24, 36-38 | `upTo` (moves to plan_slice.mjs); 2D slice |
| README.md | 8, 18-21 | `**Live map:**` (draft base URL); "two theme roads … PaulDz's sketch" |
| conversations.md | 32 | "two theme paths from PaulDz's sketch" (provenance, leave) |

## 7. Imperative tensions, stated rather than resolved silently

- **Imperative 5 vs invariant 1 (§2).** "Copies are born with their parity check": no plan.js copy
  until there is a second consumer. The node gate runs app.js's own functions, so it adds no copy.
- **Imperative 1 vs convenience.** smoke2d is a slower (browser) gate, outside `npm run build`.
  C6a lands the geometry gate in node first, so the blocker class fails in seconds.
- **Honesty vs a clean gate.** Failing on every residual crossing would be the strictest gate but
  would force either a fake route or a deleted check the first time a via meets an 8-u neck (it
  already does, three times, on signs). The gate fails on what is fixable and reports what is
  geometry, and the report reaches the map, the key and the draft.
- **Invariant 5 vs visual continuity of ways.** Ways under the wall read as interrupted where they
  pass it. Accepted: an interrupted theme line is honest, a false gate is not.
- **The 1-px floor bends the width encoding** at small zooms. Accepted and disclosed, because an
  invisible 3:16 on a phone would defeat the slice's one job.
- **Cutting the in-map panel costs desktop convenience.** Accepted: the reviewer's first contact
  is a link, very possibly on a phone.

---

## 8. Disposition of the 30 critique issues

H = honesty lens, S = ship-safety lens. Numbering follows `wf1.json` order.

| # | lens | severity | problem (short quote) | disposition |
|---|---|---|---|---|
| 1 | H | blocker | "Painter's order does not make the picture honest … the way visibly goes into the block and comes out the other side" | RESOLVED: §1 cut table (step 3 restored for non-members), §2.2-2.6 (clearance, certificate, bridges, gate), C6a, §5 test 7. Measured naive 117 → 3 certified, 0 uncertified. |
| 2 | H | should-fix | "The repo credits them to PaulDz's sketch … the retirement would read as removing something we made up" | RESOLVED: §1 kept item 1, §3, C3 provenance (build_data.py:281 comment, README attribution, 4cb9bf8), §0 row 3 invites his objection. |
| 3 | H | should-fix | "The recorded comparison is one-directional and misclassifies a theme … its counts are typed by hand" | RESOLVED: C3 per-stop table + reverse direction, generated by a node one-liner pasted with its command; light-of-the-world labelled a sub-entry; typed 4/5/2 dropped. |
| 4 | H | should-fix | "The draft to PaulDz types measured figures into prose … Row 2 also asks PaulDz about adjacency that our stub rule produces" | RESOLVED: §0 (templates, "How every number … is computed"), C10 generator with `--check`, digit lint and asserts; row 2 reworded to ask about the band. |
| 5 | H | should-fix | "Two kinds of geometry on the map are ours, and nothing labels them" | RESOLVED: C7 stub-row note and the "route between blocks is schematic" footer, with smoke assertions; §2.4. |
| 6 | H | should-fix | "Hard-coding '(proposed)' makes a second copy of JOHN_WAYS.status" | RESOLVED: C9 plain `Way` header + status caption, C10 README points to `status`, C7 check that "proposed" appears only inside the status string. |
| 7 | H | should-fix | "Several statements in the design doc are simply false … would stay in place as prose" | RESOLVED: C0 inline correction markers at five claims (sampler, co-extension, plan.js:264-268, app.js:625-646, 21.9 KB). The sixth item (§5.4 ":686, actual :687") is not marked: at HEAD :686 is the ck-life line, so the design is right there. |
| 8 | H | nit | "One stale mention survives C2, and the grep gate cannot see it" (plan.js:67) | RESOLVED: C2 edits the plan.js:66-67 docstring and the grep adds `theme road` (case-insensitive). |
| 9 | H | nit | "The test types 18 for the scale denominator" | RESOLVED: §5 test 2 reads `2 * ROAD_HALF` from the page. |
| 10 | H | nit | "The band text shows only its lower edge … Child rows show large verse counts with 'no way of its own' and no reason" | RESOLVED: C7 computed band range from adjacent `minVerses`; C9/C7 child text "its verses are counted in {parent}'s way" (build_themes.py:80-83 rationale). |
| 11 | H | nit | "2D-only functions placed there are neither mirrored nor evaluated … 'the 34-u cap binds for all five' is also not derivable" | RESOLVED: §2 header comment; C6a verify_ways runs the functions and prints cap-binds per stub (measured 5 of 5). |
| 12 | H | nit | "If the docstring is 'fixed' carelessly it could rewrite PaulDz's own rule" | RESOLVED: C10 keeps his quote verbatim, replaces only our ranking sentence with a pointer to `rankedBy`/`status`. |
| 13 | S | blocker | "Painter's order does not do the same job as clearance … The picture then contradicts the key's block count" | RESOLVED: same as #1, plus §5 test 7 (per-link browser check: the crossed set equals the disclosed bridge set; in link 1, n36/n44 are undimmed Belief blocks drawn as bridges). |
| 14 | S | should-fix | "The opacity-honesty assertion fails on correct code. The annex hood circle has an opacity=0.55" | RESOLVED: §5 test 8 compares computed opacity with and without `.dimmed`. |
| 15 | S | should-fix | "drawWay emits <g class="way …">. The key sits after the svg … test 8 fails on correct code" | RESOLVED: C6b `opts.swatch` → `.way-swatch` wrapper without `.way`; every map assertion scoped to `#map .way`. |
| 16 | S | should-fix | "The view-switch handler owns #hint and knows nothing about #waykey" | RESOLVED: C7 handler change (`""`/`"none"` for hint, `waykey.hidden` by view) and 400 px checks after the Index → toggle → Show path. |
| 17 | S | should-fix | "This check cannot fail for the Ways table … the only selector sits below all of it" | RESOLVED: C9 table first + jump link, toggle-box and first-screen checks with an injected-wide-cell null subject; C1 notes what its scrollWidth check can't see. |
| 18 | S | should-fix | "(a) boot's resetVB wipes the fit (b) a §0 link still renders sub-pixel (c) the fit ignores #waykey" | RESOLVED: C6b boot reorder + C8 fit as last step of renderOrganic; C8 1-px floor (decided) with disclosure; fit excludes the key; C10 runs the checks over the draft's links. |
| 19 | S | should-fix | "the contrast test cannot say whether the intended design passes … no values … ignores opacity … leaves out --water … badge text" | RESOLVED: C6b token hex values with measured ratios; §5 treatment table (no opacity on any layer); §5 test 4 composites the opacity chain over page, wash and water, and tests badge text ≥ 4.5:1. |
| 20 | S | should-fix | "Fixture coverage silently decays when PaulDz changes a threshold … The semita stub is never exercised" | RESOLVED: C6b derived fixtures with covered-type assertion and `unmeasured` lines; C4 re-band procedure. Semita stubs (questioning-faith, conviction-truth) are now in the fixtures; the gate measures stub widths directly. |
| 21 | S | should-fix | "The road lines in applyOverlays are 686-687, and 688 is the ck-chiasm line" | RESOLVED: C2 deletes by content (686-687), grep that `show(".layer-chiasm"` survives; C1 chiasm default/toggle assertion; §6 corrected. |
| 22 | S | should-fix | "Unknown keys from ?ways= are echoed into the key … Duplicate keys are not deduplicated" | RESOLVED: C6b dedupe; C7 rows and notes via `textContent`, with the `%3Cb%3E` and `signs,signs` smoke cases. |
| 23 | S | should-fix | "The toggles have no aria-pressed and no accessible name … No test covers keyboard operation" | RESOLVED: C9 `<button aria-pressed aria-label>` + keyboard test; C7 × `aria-label`, `#waykey` role=region. |
| 24 | S | should-fix | "wayStops and wayStub are called pure and liftable, but nothing below browser level ever runs them" | RESOLVED: C6a verify_ways.mjs in `npm run verify` (stub R/L/bearing/cap, v0 order, crossings). |
| 25 | S | should-fix | "any way that joins an inner block to a harbour block paints over the city wall … the plan's precedent is false" | RESOLVED: C6b decision 1, ways under the wall (3 wall passes measured, key footer line, Opus checklist item); false precedent sentence removed (§1 cut table). |
| 26 | S | nit | "URLSearchParams percent-encodes the comma" | RESOLVED: C7 builds `ways=` by hand, keeps other params and hash; test compares parsed keys. |
| 27 | S | nit | "renderIndex() runs once at :811. So the index toggles are built before the state exists" | RESOLVED: C6b parses `?ways=` before :811. |
| 28 | S | nit | "`.hood:hover { filter: brightness(1.12) }` replaces the dimming filter" | RESOLVED: C6b `.hood.dimmed:hover` rule. |
| 29 | S | nit | "getBBox() is pure geometry … it does not prove the way 'renders in this config'" | RESOLVED: §5 test 3 reworded (geometry only); test 4 carries per-config visibility. |
| 30 | S | nit | "`git show HEAD~` points at the wrong commit … clamp at :730 … README attribution … plan.js:67" | RESOLVED: C3 check 1 runs before committing against `HEAD` = C2 (sha logged); C8/§6 cite :726 and :763; C3 quotes README's attribution; C2 edits plan.js:66-67. |

Totals (count of rows above): 30 issues, 30 resolved, 0 rejected; one sub-item of #7 (the §5.4
anchor) is declined because the code shows the design was right.

---

## 9. Addendum: decisions taken at build time, after the regression audit

The v2 plan above was audited twice more before any code was written: a mechanical completeness
check (30 of 30 critique rows present; one resolution hollow) and an Opus audit for errors **the
revision itself introduced** (14 issues, each with evidence from a script it ran). Past this point
each plan revision fixed the last round and introduced its own, so the remaining items are settled
here and the tests take over as the verifier. Where this section and the body above disagree,
**this section wins**.

| # | issue (regression audit) | decision |
|---|---|---|
| 1 | §2.2 pushes radially, so an obstacle whose centre lies **on** the curve gets no sideways push — and that is the gate's own synthetic null subject, so C6a could not land. | When the radial direction is within 30° of the local tangent (neighbour-to-neighbour), push along the curve **normal** instead, on the side of the sample's offset; exact d = 0 breaks the tie to the left normal. The centred-disc synthetic stays, because it is the case that proves the fix. |
| 2 | The C8 1-px floor widens the drawn stroke **after** clearance, so a zoomed-out phone brings the false crossings back (3 uncertified at 4.5 u/px, 90 at 8). | **Cap the floor at the clearance budget**: drawn outer width = `min(max(w, u1px), w + 2·MARGIN)`. Clearance puts every sample at ≥ `r + hw + MARGIN` from a non-member centre, so a half-width ≤ `hw + MARGIN` cannot enter a non-member disc **by construction**. Beyond the cap a way may go sub-pixel, and the key says so. Test 7 uses the rendered (floored) width. |
| 3 | No derived fixture includes a bridged way, so every bridge assertion passes with nothing to test (zero opportunities is `unmeasured`, not `pass`). | smoke2d adds a fixture per type for the way with the most certified pinches, computed in-page by `wayCrossings`. If the page reports > 0 pinches but the fixture set exercises 0 bridges, smoke2d prints `unmeasured: bridges` and **fails**. |
| 4 | "No badge on a bridged hood" fails on correct code: in link 1 the bridged hoods are Belief blocks and must carry Belief's badge. | "No badge **for that way** on a hood it bridges." Tested per (way, hood). |
| 5 | Question row 3's `#2` breaks the draft generator's digit lint. | The issue number is a `{issue}` placeholder with one home (a constant in `docs/issue2-questions.json`). |
| 6 | `draft_issue2 --check` inside `npm run verify` couples a one-off comment draft to the map build and breaks the documented re-band procedure. | It moves to its own script, **`npm run verify:draft`**, which is **not** a prerequisite of `build`. A stale or false draft blocks the draft, never the map. The generator still asserts its own claims when it runs. |
| 7 | C8's fit ignores `preserveAspectRatio="xMidYMid meet"`, so a box sized to "svg minus key" centres in the whole svg; and `zoomCenter` forces `vb.h = vb.w·1000/1200`, so the first zoom after a fit jumps. | The fit keeps the vb aspect equal to the svg's client aspect, scales the box into the sub-rect the key leaves uncovered, and extends the vb over the key's share, anchored top-left. `zoomCenter` preserves the current vb aspect instead of forcing 1200:1000. |
| 8 | Bridges and badges paint above the hoods and take pointer events, so a bridged or badged block can no longer be clicked. | `pointer-events: none` on `.way`, `.way-bridge` and the badge group. smoke2d: `elementFromPoint` at a bridged hood's centre returns that hood's circle. |
| 9 | The pinch certificate tests the neck against `2·(hw + MARGIN)`, but the key says "no room between blocks"; a neck wider than the stroke but narrower than stroke + margin would be certified and misstated. | **Certify only when the gap < `2·hw`** — true no-room. A residual at a gap in `[2·hw, 2·(hw+MARGIN))` is uncertified, so the gate fails. The pinchable-type table is derived from stroke width, with the margin table printed beside it. All three signs residuals (gaps 8.0–8.4 u against 2·hw = 10.1 u) qualify under the stricter rule. |
| 10 | C3's provenance **typed** a commit subject for 4cb9bf8 that does not exist. | Printed, not typed: `git log -1 --format='%h %ad %s' --date=short 4cb9bf8` gives `4cb9bf8 2026-08-10 Initial build: interactive Gospel of John city map`. The command goes into the log beside its output. |
| 11 | The working tree already holds `scripts/smoke2d.mjs` (untracked) and a one-line `package.json` change, both C1's. | They are the session's own C1 work, read in full. C0 stages its docs by explicit path; C1 commits the two files together. The HEAD baseline was measured on a clean tree before either existed (verify, bundle and both 3D smoke runs green). |
| 12 | Several prose claims in the question templates are typed but not asserted. | Asserts added: `signs.way` is the widest type; `rest-sustenance.way == spiritual-empowerment.way`; `love-for-cosmos.verses` feeds a plural helper rather than a typed "verse". |
| 13 | Test 7 reads the annex as a plain circle while the gate uses its `r + 6` blob, and parses stub `A` arcs without saying how. | Test 7 reads `.annex-blob` for the annex and skips stubs; the gate owns stub overlaps. |
| 14 | `#hint` / `#waykey` visibility lives only in the view-switch handler, so a cold `?ways=` load and `×` on the last way leave it wrong. | One `syncChrome()` function owns both, called from `applyWays()` (boot, ×, toggles) and from the view handler. |
| C | (completeness audit) Stub widths were claimed measured but had no home, and the design's "all stubs ≤ 2.2 u wide" is false and unflagged. | `verify_ways` prints each stub's drawn width. C0's correction markers include the ≤ 2.2 u claim: two of the five stubs are 3.4 u semitae. |

**One scope note.** The draft to PaulDz is deliberately the last thing built, and it is short: one
link and one line per question. The diagnosis for his five-week silence is that the last reply was
211 lines with about twelve questions in it. Placement gets an ask read; the argument gets it
agreed. Four links he can click are the argument.
