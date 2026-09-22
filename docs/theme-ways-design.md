> **Superseded in part — read `docs/theme-ways-slice1.md` first.** Slice 1's build decisions override this
> design's §1 routing, §2 focus/pin and §3 co-extension, and six factual claims below are marked inline where they are wrong.

## 1. The six way types, drawn

Scale anchor: the Way is `2 × ROAD_HALF = 18` plan units. Reading that as a real *via* (~12 m) fixes **1 plan unit ≈ 0.65 m**, which is what makes the *ambitus* number honest: 1.2 units = 0.78 m = 2.6 Roman feet, exactly PaulDz's "two to three feet".

Widths are **per band, not per theme** — do not interpolate width from the Greek count. The count is apportioned (an estimate), and PaulDz named six discrete types; the band *is* the encoding. `data/way-types.json` already derives the band from `minVerses`, so these numbers belong in that file as new fields (`widthPlan`, `y`, `kerb`, …) and nowhere else.

2D stroke = `widthPlan × 0.72`, the same ratio the existing Way uses (`.way-casing` 13 ÷ 18). That keeps the via at 10.1 against the Way's 13 — the Way stays primary in the 2D view, where it is *drawn narrower than its plan width*.

| type | width (plan u / m) | profile / section (3D y) | surface | kerb / gutter | 2D | 3D | dark mode |
|---|---|---|---|---|---|---|---|
| **via** | **14** / 9.1 | crowned: centre y 0.78, edges 0.62 | ashlar — transverse seam every 6 u + one longitudinal centre seam; recessed grate quad 2.2×1.4 u every 34 u on the centreline | raised kerb both sides, 0.6 u wide, top y 0.92 | casing 10.1 `--road-casing`, fill 8.3 `--road-fill`, centre dash `10 6` at 0.7; grate ticks | `ribbonMesh` + 2 kerb `LineSegments` + seam `LineSegments`; colonnade stubs (Ø1.1, h 4 u, every 18 u, both sides, 0.8 u outside the kerb) in slice 3 | grates invert: dark fill in light mode, 1 px lighter *rim* only in dark (a black hole on `#23221f` ground is invisible) |
| **vicus** | **9** / 5.9 | flat y 0.60, centre channel dips to 0.48 | polygonal basalt — jittered transverse seam every 3.5 u (jitter from `rnd(i)`, deterministic so parity holds); two cart ruts 0.5 u wide at ±1.3 u, recessed 0.06 | low kerb both sides, top y 0.86; shop counters = 1 u ledges at visited blocks (slice 3) | casing 6.5, fill 5.1, two rut hairlines 0.5; 3 stepping-stone ticks (2.4×1.6 u) at each block frontage | ribbon + kerbs + rut strips; stepping stones as 3 boxes 2.4×1.6×0.45 u | unchanged except kerb polarity (below) |
| **clivus** | **6** / 3.9 | deck y 0.60, gutters recessed to y 0.32 both sides | traction grooves transverse every 1.6 u; a chevron notch every 8 u pointing **downstream** (towards 21:25), which reads as slope | no kerb — the two 1.0 u gutters *are* the edges | casing 4.3, fill 3.1, plus a rung path `stroke-dasharray "0.8 5.2"` in `--road-seam`, and two 0.35 gutter hairlines | ribbon + 2 gutter ribbons at 0.32 + groove `LineSegments` | gutters read as light-catching channels: gutter line uses `roadEdge` in dark, `ink@40%` in light |
| **semita** | **3.4** / 2.2 | **raised**: deck y 1.05, vertical kerb face down to 0.60 | smooth flagstones, transverse seam every 3 u | heavy kerb 0.5 u wide on the street side; both sides when standalone | fill 2.4 + a 0.6 kerb line offset to the street side → reads as a double line | ribbon at 1.05 + a kerb strip mesh (the riser is what sells "raised") | kerb lighter than deck in dark, darker in light |
| **angiportus** | **2.2** / 1.4 | **sunken** y 0.40 | unpaved: no seams; 3–6 puddle quads per 40 u at y 0.41 in a matte darker material | none | 2.4 dark casing (`--ink` @0.35) under a 1.6 fill → "a lane with no light" | ribbon in `M.wayDirt`; overhead darkening plane at y 6.5, alpha 0.22 (slice 3) | **must invert**: on `#23221f` ground a dark alley is nothing. Fill goes *lighter* than ground (`roadEdge`), darkness is carried by the overhead plane and 0.7 opacity |
| **ambitus** | **1.2** / 0.78 | slit y 0.28; the building walls are its sides | none — two 0.15 u dark strips marking the wall bases; 4–8 weed tufts per 40 u (0.6 u stubs in `stone2`) | none | 0.9 stroke, `stroke-dasharray "1.6 2.4"`, weed ticks every 12 u | thin dark strip; **LOD-gated** — drawn only when focused/pinned or camera < 220 u | same inversion as angiportus, plus a 1 px lighter rim |

Two shared dark-mode rules, so nobody has to think per type: **kerb polarity flips** (kerb darker than paving by day, lighter by night — the palette already has `roadEdge` for exactly this), and **no new hues**: add two greys, `--way-kerb` and `--way-shade`, derived from the existing `ink`/`roadEdge`.

Identity without hue, four channels: only ≤4 ways are visible at once; each carries a repeated inline label (`textPath` every 220 u in 2D; midpoint + endpoint labels registered with `labels.js` in 3D); the **focus** way gets a gold kerb line and gold halo rings on its blocks (`gold` exists in both palettes, already used by obelisks); pins get ①②③ cartouches at 60% opacity.

**Routing** (pure maths, belongs in `plan.js` beside `themeRoadPts`):
1. stops = `theme.blocks` in narrative order (verified: 0 out-of-order block pairs across all 51 entries — sort by `v0` anyway);
2. `catmullSample(stops, 16)`, **then push the final stop point** — the existing sampler drops it, so today's two roads already stop one sample short; **[Correction, slice 1: false — every `catmullSample` copy already pushes the endpoint; the real bug was the renderers' `i += 3` decimation, fixed in 8f3b2d7. Pushing again would duplicate the endpoint. See docs/theme-ways-slice1.md.]**
3. hood clearance: iteratively push any sample inside a hood circle out to `h.r + width/2 + 1.5`, same idiom as the road-clearance pass at `plan.js:172`;
4. Way clearance: drop samples within `ROAD_HALF + 0.5` of the Way and split the ribbon there. A lesser street does not paint over the *via sacra*; the gap reads as a junction and enforces the hard constraint;
5. single-block themes get a **stub**: an arc hugging the block at `r + w/2 + 0.6`, length `min(0.55·2πr, 34 u)`, centred on the bearing to the nearest neighbouring hood. Only 5 themes need it (`questioning-faith` n33, `conviction-truth` m16_4b-33, `incarnation` n3, `father-of-lies` n54, `love-for-cosmos` n14) and all are ≤2.2 u wide, so the stub rule is never asked to wrap a via. **[Correction, slice 1: false — two of the five are 3.4 u semitae (questioning-faith, conviction-truth). The stub still never wraps a via.]**

## 2. Collision / selection

**Default: no ways drawn.** One focus + up to three pins, chosen in a Ways panel.

- Panel replaces the two road checkboxes: search box, six type-filter chips, then 34 rows grouped by way type in `way-types.json` order, each row `[width glyph] label · verses · greek (est.) · n blocks`. The 17 sub-entries collapse under `signs` (9) and `i-am-statements` (8).
- Click = focus (exactly one, full strength, its blocks haloed, off-theme blocks dimmed via a `.dimmed` class: `filter: saturate(.15); opacity:.45`). Shift-click / pin icon = add, capped at 3, and the UI says why when refused.
- State in the URL (`?way=signs&pin=life,witness-testimony`) so PaulDz reviews by link.
- In 3D walk mode, a chip at each block lists the ways crossing it — that is how all 34 stay reachable without being drawn.

Why not all-at-once, and why not strictly one: `belief-eternal-life` alone touches 35 of 61 blocks, so 34 ways is mush at any width; but PaulDz's rule is *about relative size*, and size is only legible in comparison — 2–4 side by side. Four is also the ceiling at which the lateral-stacking algorithm below stays legible and at which four non-hue labels still fit.

**Nothing is dropped**: the index view gains a Ways table listing all 34 + 17 children with type, verses, Greek (labelled *est.*), blocks and chapters. Exhaustiveness lives in text; geometry shows four.

The 17 children are not extra roads — they draw as **stations** on their parent (a stone marker at the block), so the Signs via has 9 milestones and the I AM clivus 8. That honours invariant 5 without inventing 17 streets.

## 3. Two themes on the same stretch

Detect from data, not geometry: two visible ways share a stretch when they contain the same *consecutive* block pair.

Rank visible ways by (width desc, verses desc, key asc). Rank 0 keeps the centreline; the rest are shouldered off it along the local normal, alternating sides:

```
off(0)=0;  off(1)=+((w0+w1)/2 + 1.2);  off(2)=-((w0+w2)/2 + 1.2)
off(3)=off(1) + (w1+w3)/2 + 1.2
```

Applied per sample where the overlap mask is 1, eased with a 13-sample cosine window (±6) so ways glide in and out of company instead of kinking. Slice 1 may apply the offset globally (constant per way) — simpler, and harmless.

Three consequences worth naming:

- **The semita case is free and is the point.** When a footpath shares a stretch with a bigger way it is *already* drawn raised with a kerb on the street side — offsetting it turns it into that street's sidewalk, which is literally PaulDz's definition. `honest-doubt` beside the Belief via at 20:24-29, and `prayer-jesus-name` running the length of the Holy Spirit clivus through 14–16, come out right with no special code.
- **Paint order** is ascending width — narrower first, wider on top — so the greater street stays continuous through a junction. At each crossing drop a junction node: a square of the wider way's paving.
- **Exact co-extension** (`rest-sustenance` / `spiritual-empowerment`, tied on both measures) resolves as ±1 sides at equal width: a matched pair of alleys either side of the same line. Likewise 3:16's *ambitus* runs against the very wall the `born-again` semita passes, both in n14 Nicodemus Assembly — a good screenshot for PaulDz. **[Correction, slice 1: false — measured, no two of the 34 top-level themes have identical block lists (0 of 561 pairs); rest-sustenance and spiritual-empowerment share only n46.]**

## 4. First slice

**Ship (2D + data + plan only):**

1. `data/way-types.json` gains the drawing numbers per type. One file, re-bandable, matching the existing "derived, never hand-tagged" idiom.
2. `scripts/build.py` injects `themes.json` and `way-types.json` as `window.JOHN_THEMES` / `window.JOHN_WAYS`, exactly mirroring the `JOHN_CHIASMS` prefix at build.py:43-52. (Neither file reaches the pages today.)
3. `src/plan.js`: export `themeWayPts(key)` implementing routing steps 1-5; mirror it into `scripts/app.js` above its parity marker; extend `verify_parity.mjs` to diff all 34 across the two.
4. `scripts/app.js` + `index.template.html`: the six CSS treatments, focus + 3 pins, the Ways panel, URL state, block dimming, and the Ways table in the index view.
5. Retire the two hand-authored roads (§5.1).

**Slice 2:** Three.js flat ribbons + kerbs + gold halo rings + the walk-mode block chip. **Slice 3:** furniture — colonnades, grates, stepping stones, ruts, gutter channels, weeds, overhead alley darkening.

**Do not build, and say so out loud:**

- No width interpolation inside a band, and no per-theme hue. Both over-claim precision the Greek estimate doesn't have.
- **No re-layout to make room for ways.** It breaks invariant 1's machine check and every existing screenshot.
- No textures or image assets — the pages are single-file (index.html 270 KB, city3d-three.html 831 KB); everything is geometry + line segments.
- No ways for the 17 children.
- No walk-along-a-theme camera mode, no animated processions or flowing water.
- No 3D per-building dimming in slice 1 — halo rings only (see §5.9).
- No `scripts/app3d.js` way drawing at all. It is the classic fallback; parity is checked on *positions*, not on drawing. It only needs its two dead roads removed.
- No chiasm × way interaction.

## 5. Where this fights the code

1. **`data/john-data.json` `themeRoads`** is two hand-picked stop lists ("water, bread, and resurrection sites") that are not the measured block lists — against the "measured, never estimated by eye" convention. Worse, "Light & Witness" conflates two themes that the measurement now separates (`light-vs-darkness`, clivus, 8 blocks; `witness-testimony`, vicus, 15 blocks). Delete the key from `john-data.json` and `build_data.py`; keep the stop lists quoted in `conversations.md` as provenance. `life` survives as the measured vicus (18 blocks).
2. **`src/scene.js:189` and `:278`** — `const trColor = { life: pal.themes.sign, light: pal.themes.witness }`. Any new key yields `undefined` and `THREE.Color.set(undefined)` throws. Both copies must go.
3. **`src/main.js:409-410`** — checkboxes wired to `city.themeRoads.life/.light`; throws once those keys are gone.
4. **`index.template.html:328-329` + `scripts/app.js:686`** — `applyOverlays()` reads `#ck-life`/`#ck-light` by id; removing the markup without the JS is a null deref. Delete together.
5. **`src/plan.js:264-268` and `scripts/app3d.js:309-313`** both iterate `JOHN.themeRoads` and will silently produce `{}`. **[Correction, slice 1: now src/plan.js:274-279 and scripts/app3d.js:316-320; both copies are deleted in slice 1.]**
6. **`scripts/verify_parity.mjs`** slices sources with `upTo(file, marker)` — `"/* ---------- svg helpers ---------- */"` in app.js, `"/* ---------- palettes ---------- */"` in app3d.js. New way maths in app.js must sit *above* that marker and stay DOM-free. Note the verifier currently checks nothing about theme roads at all.
7. **Geometry budget.** Measured on the real plan: minimum edge-to-edge gap between hood circles is exactly **8.00** plan units, with 45 pairs under 15; `CLEAR = ROAD_HALF + 4.5 = 13.5` (plan.js:172). A 14 u via **cannot** fit between two blocks. Hence the clearance-push routing, hence a via visibly bulges around tight pairs — accepted, that is what a real via does — and hence the Way-corridor clip in step 4 rather than an over-paint.
8. **`index.template.html:122-123`** — the 2D Way is `stroke-width: 13` casing / `9.5` fill, *not* `2 × ROAD_HALF = 18`. Drawing theme ways at raw plan widths would make the via look wider than the Way in 2D and break the primacy constraint. Hence the ×0.72 rule.
9. **`src/scene.js:216-234`** — buildings are per-hood groups but share one `kitMats` set, merged per material. Per-building dimming therefore needs a parallel *dim* material set with the same `body:/roof:/accent:` keys and a group-level `mesh.material` swap (cheap: ~21 extra materials, not 61×), and CLAUDE.md's rule applies — register in both the material set **and** `applyTheme`, or it sticks in day colours at night. Deferred to slice 2.
10. **`src/labels.js`** — way labels must join the nearest-first culling or they will overprint block labels.
11. **Linear view, `scripts/app.js:625-646`** — theme roads are lanes at `y = 74 + lane*30`; 34 lanes is ~1020 px in a 1000-unit viewBox. Cap to focus + pins (≤4 lanes); the rest lives in the index table. **[Correction, slice 1: now app.js:624-639; the legacy lanes are deleted, not capped.]**
12. **`scripts/app.js:424-431`** — `key === "life" ? var(--t-sign) : var(--t-witness)`. The hue-per-road idiom is what the colour constraint forbids; replace with `class="way way-<type>"`.
13. **`scripts/build_themes.py:80-88`** derives `way` from `way-types.json` `minVerses`. Drawing code must read `t.way` and never re-derive from Greek, or the band and the width can drift apart.
14. **Size:** `themes.json` is 21.9 KB and rides into all three single-file pages (+8% on index.html). Acceptable; `refs` is needed by the panel, `malformed` can be stripped at injection. **[Correction, slice 1: injected compact (≈15 KB) into index.html only; the 3D pages carry none until slice 2.]**