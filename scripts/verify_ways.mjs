#!/usr/bin/env node
/* Machine-check of the theme ways' geometry, in node, before any browser runs.

   A theme way joins its member blocks in verse order. Drawn naively, centre to centre, the
   line passes over blocks the theme does not touch — and on the map that reads as touching
   them, which would put a false picture in front of PaulDz on exactly the question he is
   being asked. scripts/app.js routes each way clear of every NON-member block; this checks
   that it worked, using app.js's own functions (the same slice verify_parity evaluates), so
   there is no second copy of the geometry to drift.

   FAILS (exit 1) on: an uncertified crossing (the router had room and did not use it), a
   moved stop, a route with more crossings than the naive curve, a stub touching a
   non-member block, a block list out of verse order, or a route so tight that rounding the
   drawn path could itself create a crossing (see ROUND_TOL below).
   REPORTS a certified pinch — two non-member blocks closer together than the way is wide —
   as a measured figure: no route exists there, so the map draws it as a bridge and says so.
   UNMEASURED (exit 2) if it examined no ways or no obstacles.

   The instrument is tested first: three synthetic cases must come out as expected, and
   `--naive` (routing disabled) must fail on the real data.

   Usage: node scripts/verify_ways.mjs [--naive]                                            */

import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT, app2dPlan, wayScale } from "./plan_slice.mjs";

const NAIVE = process.argv.includes("--naive");
const JOHN = JSON.parse(readFileSync(join(ROOT, "data/john-data.json"), "utf8"));
const TH = JSON.parse(readFileSync(join(ROOT, "data/themes.json"), "utf8")).themes;
const TYPES = JSON.parse(readFileSync(join(ROOT, "data/way-types.json"), "utf8")).types;
const P = app2dPlan(JOHN);
const R = P.WAY_ROUTE;

/* scale: the Way's own drawn casing over its plan width — derived from the page's CSS, never
   restated, so a change to either moves every theme way with it */
const SCALE = wayScale(P.ROAD_HALF);
const hwOf = type => TYPES.find(t => t.key === type).widthPlan * SCALE / 2;
/* The page floors a way's drawn width at one screen pixel so the narrowest stay visible. The
   floor is capped PER WAY by the clearance that way's route actually keeps from the blocks it
   does not touch (app.js wayFloorCap): widening by at most that much a side cannot reach a
   block. A route centred in a tight neck keeps only the slack the neck allows, so a fixed
   budget would be wrong. The page draws the route with coordinates rounded to 2 decimals
   (≤ 0.0071 u off); a route clearer than ROUND_TOL cannot be made to cross by that rounding. */
const ROUND_TOL = P.WAY_ROUTE.ROUND_TOL;

const problems = [];
const fail = m => problems.push(m);

/* ---------- 1. the instrument, on cases whose answers are known ---------- */
{
  const stops = [{ x: 0, y: 0 }, { x: 200, y: 0 }], hw = 5;
  const cross = (obs, routed) => P.wayCrossings(routed ? P.wayRoute(stops, obs, hw).pts : P.wayRaw(stops).pts, obs, hw);
  /* A block centred ON the line but BETWEEN samples is the case a purely radial push cannot
     clear: every sample's radial direction runs along the line, so pushes only slide samples
     apart and the segment between them still passes through the centre. (Measured: radial-only
     leaves 1 crossing here; with the normal push, 0.) A centre that lands exactly ON a sample
     would instead be rescued by the d = 0 tie-break and prove nothing about the normal push —
     so the case asserts it really is between samples. */
  const OFF_GRID = 100.37;
  const centred = [{ id: "c", x: OFF_GRID, y: 0, r: 15 }];
  const onSample = [{ id: "s", x: 100, y: 0, r: 15 }];
  const clear = [{ id: "k", x: 100, y: 40, r: 15 }];
  const pinch = [{ id: "a", x: 100, y: 12, r: 10 }, { id: "b", x: 100, y: -12, r: 10 }];
  const between = !P.wayRaw(stops).pts.some(p => Math.hypot(p[0] - OFF_GRID, p[1]) < 1e-6);
  const cases = [
    ["the on-line case really lies between samples (else it tests only the tie-break)", between],
    ["a block on the line, between samples: naive crosses it", cross(centred, false).length === 1],
    ["…and the router clears it (the case a purely radial push cannot)", cross(centred, true).length === 0],
    ["a block centred exactly on a sample is cleared too (the d = 0 tie-break)", cross(onSample, true).length === 0],
    ["a block well off the line is never crossed", cross(clear, false).length === 0 && cross(clear, true).length === 0],
    ["a true pinch (gap 4 < stroke 10) stays crossed, and is certified", (() => {
      const c = cross(pinch, true); return c.length > 0 && c.every(x => x.certifiedBy);
    })()],
  ];
  for (const [name, pass] of cases) if (!pass) fail(`instrument: ${name} — FAILED on a synthetic case, so nothing below can be trusted`);
}

/* ---------- 2. the real ways ---------- */
const tops = TH.filter(t => !t.parent);
const rows = [], stubs = [], keep = {};
let naiveTotal = 0, residualTotal = 0, certifiedTotal = 0, uncertifiedTotal = 0, obstaclesSeen = 0, pinchTotal = 0;
for (const t of tops) {
  const hw = hwOf(t.way);
  const stops = P.wayStops(t);
  for (let i = 1; i < stops.length; i++)
    if (stops[i].v0 < stops[i - 1].v0) fail(`${t.key}: stops out of verse order at ${stops[i].id}`);
  const obs = P.wayObstacles(t);
  obstaclesSeen += obs.length;
  if (stops.length === 1) {
    const g = P.wayGeometry(t, hw), s = g.stub;
    if (g.crossings.length) fail(`${t.key}: its stub touches non-member block(s) ${g.crossings.map(c => c.id).join(", ")}`);
    if (g.crossings.clearMin < ROUND_TOL) fail(`${t.key}: stub clearance ${g.crossings.clearMin.toFixed(3)} < ${ROUND_TOL} — rounding the drawn stub could cross`);
    // the Johannine Way paints over the ways: a stub under it would be hidden
    if (s.wayClear < R.MARGIN) fail(`${t.key}: stub within ${s.wayClear.toFixed(2)} of the Johannine Way — it would be painted over`);
    // outside every ring the block can carry (I AM ring r+3.5, chiasm rings to r+9.6)
    const ringGap = s.R - hw - stops[0].r;
    if (ringGap < 9.6) fail(`${t.key}: stub ${ringGap.toFixed(2)} beyond the rim — inside the block's rings`);
    stubs.push({ key: t.key, type: t.way, block: stops[0].id, width: (2 * hw).toFixed(2), R: s.R.toFixed(2),
      L: s.L.toFixed(1), capBinds: s.capBinds, bearing: Math.round(s.bearing * 180 / Math.PI), wayClear: s.wayClear.toFixed(1),
      overlaps: g.crossings.length, clear: g.crossings.clearMin.toFixed(2) });
    continue;
  }
  const naive = P.wayCrossings(P.wayRaw(stops).pts, obs, hw);
  const route = NAIVE ? P.wayRaw(stops) : P.wayRoute(stops, obs, hw);
  const got = P.wayCrossings(route.pts, obs, hw);
  // stops never move: each pinned sample is bit-identical to its member centre
  let k = 0;
  route.pts.forEach((p, i) => {
    if (!route.pinned[i]) return;
    const h = stops[k++];
    if (!h || p[0] !== h.x || p[1] !== h.y) fail(`${t.key}: a stop moved (${h ? h.id : "?"})`);
  });
  if (k !== stops.length) fail(`${t.key}: ${k} pinned samples for ${stops.length} stops`);
  if (got.length > naive.length) fail(`${t.key}: routing made it worse (${naive.length} → ${got.length})`);
  const unc = got.filter(c => !c.certifiedBy), cert = got.filter(c => c.certifiedBy);
  if (unc.length) { fail(`${t.key}: ${unc.length} uncertified crossing(s): ${unc.map(c => c.id).join(", ")}`); keep[t.key] = route.pts; }
  if (!NAIVE && got.clearMin < ROUND_TOL) { fail(`${t.key}: clearance ${got.clearMin.toFixed(3)} < ${ROUND_TOL} — rounding the drawn path could cross`); keep[t.key] = route.pts; }
  naiveTotal += naive.length; residualTotal += got.length; certifiedTotal += cert.length; uncertifiedTotal += unc.length;
  rows.push({ key: t.key, type: t.way, blocks: stops.length, naive: naive.length, residual: got.length,
    pinches: P.wayPinches(got).map(q => `${q.a}|${q.b} gap ${q.gap.toFixed(1)}`), clear: got.clearMin });
  pinchTotal += P.wayPinches(got).length;
}

/* ---------- 3. why pinches can exist at all, derived rather than asserted ---------- */
const H = P.HOODS;
let minGap = Infinity;
for (let a = 0; a < H.length; a++) for (let b = a + 1; b < H.length; b++)
  minGap = Math.min(minGap, Math.hypot(H[a].x - H[b].x, H[a].y - H[b].y) - H[a].r - H[b].r);
const pinchTable = TYPES.map(ty => {
  const stroke = ty.widthPlan * SCALE;
  let narrower = 0;
  for (let a = 0; a < H.length; a++) for (let b = a + 1; b < H.length; b++)
    if (Math.hypot(H[a].x - H[b].x, H[a].y - H[b].y) - H[a].r - H[b].r < stroke) narrower++;
  return { type: ty.key, stroke: stroke.toFixed(2), corridor: (stroke + 2 * R.MARGIN).toFixed(2), pinchable: stroke > minGap, narrower };
});

/* ---------- report ---------- */
if (!tops.length || !obstaclesSeen) { console.error("unmeasured: examined 0 ways or 0 obstacles"); process.exit(2); }
for (const r of rows)
  console.log(`  ${r.key.padEnd(28)} ${r.type.padEnd(10)} ${String(r.blocks).padStart(2)} blocks  naive ${String(r.naive).padStart(2)} → ${r.residual}` +
    `  clear ≥ ${r.clear === Infinity ? "∞" : r.clear.toFixed(2)}${r.pinches.length ? "  pinches: " + r.pinches.join("; ") : ""}`);
for (const s of stubs)
  console.log(`  ${s.key.padEnd(28)} ${s.type.padEnd(10)} stub on ${s.block}: width ${s.width}, R ${s.R}, L ${s.L}${s.capBinds ? " (cap binds)" : ""}, bearing ${s.bearing}°, Way ≥ ${s.wayClear}, overlaps ${s.overlaps}, clear ≥ ${s.clear}`);
console.log(`\n  pinchable by stroke width (min hood edge gap ${minGap.toFixed(2)}):`);
for (const p of pinchTable)
  console.log(`    ${p.type.padEnd(10)} stroke ${p.stroke.padStart(5)}  corridor ${p.corridor.padStart(5)}  ${p.pinchable ? `PINCHABLE — ${p.narrower} hood pairs narrower than the stroke` : "always fits"}`);
console.log(`\n  ways ${tops.length} · naive ${naiveTotal} · residual ${residualTotal} (certified ${certifiedTotal} at ${pinchTotal} pinches, uncertified ${uncertifiedTotal}) · stubs ${stubs.length}, overlaps ${stubs.reduce((n, s) => n + s.overlaps, 0)}${NAIVE ? "  [--naive: routing disabled]" : ""}`);

if (problems.length) {
  if (Object.keys(keep).length) {
    // a failure keeps its evidence until it has been turned into a better test
    const dir = join(ROOT, "build/verify_ways");
    mkdirSync(dir, { recursive: true });
    for (const [key, pts] of Object.entries(keep)) writeFileSync(join(dir, `${key}.json`), JSON.stringify(pts));
    console.error(`  (offending polylines kept in build/verify_ways/)`);
  }
  console.error(`\n${problems.length} problem(s):`);
  for (const p of problems.slice(0, 20)) console.error("  ✗ " + p);
  if (problems.length > 20) console.error(`  … and ${problems.length - 20} more`);
  process.exit(1);
}
console.log("✓ theme ways clear every block they do not touch; the pinches that remain are certified");
