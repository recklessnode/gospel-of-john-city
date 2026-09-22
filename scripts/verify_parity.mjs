#!/usr/bin/env node
/* Machine-check of CLAUDE.md invariant 1: app.js (2D), app3d.js (canvas 3D) and
   src/plan.js (Three.js 3D) must lay the city out in exactly the same place.

   Each renderer's plan section is pure math, so we evaluate the three of them
   over a fresh copy of the data and diff the results numerically.

   Usage: node scripts/verify_parity.mjs        (exit 0 = identical) */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { buildPlan, catmullSample } from "../src/plan.js";
import { upTo } from "./plan_slice.mjs";   // one home for slicing a renderer's plan section

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const raw = readFileSync(join(ROOT, "data/john-data.json"), "utf8");
const fresh = () => JSON.parse(raw);


/* --- 1. the canvas 3D renderer (runs its layout at load) --- */
function planFromApp3d() {
  const body = upTo("scripts/app3d.js", "/* ---------- palettes ---------- */") +
    "\n;return { HOODS, AX, WAY, WALL_SEGS, GATES, OBELISKS, wayAt, SEA_POLY, QUAY_POLY };";
  return new Function("JOHN", body)(fresh());
}

/* --- 2. the 2D map (layout is called from boot, so call it here) --- */
function planFromApp2d() {
  const body = upTo("scripts/app.js", "/* ---------- svg helpers ---------- */") +
    "\n;layoutOrganic(); buildWay();" +
    "\n;return { HOODS, AX: JOHN.annex, WAY: catmullSample(WAYPTS, 24) };";
  return new Function("JOHN", body)(fresh());
}

/* --- 3. the Three.js module --- */
function planFromModule() { return buildPlan(fresh()); }

/* ---------- comparison ---------- */
const EPS = 1e-9;
let failures = 0;
function fail(msg) { failures++; console.error("  ✗ " + msg); }

function cmpNum(label, a, b) {
  if (!(Math.abs(a - b) <= EPS)) fail(`${label}: ${a} ≠ ${b}`);
}
function cmpHoods(label, A, B, fields) {
  if (A.length !== B.length) return fail(`${label}: ${A.length} hoods vs ${B.length}`);
  for (let i = 0; i < A.length; i++) {
    if (A[i].id !== B[i].id) { fail(`${label}[${i}]: id ${A[i].id} ≠ ${B[i].id}`); continue; }
    for (const f of fields) cmpNum(`${label} ${A[i].id}.${f}`, A[i][f], B[i][f]);
  }
}
function cmpPts(label, A, B) {
  if (A.length !== B.length) return fail(`${label}: ${A.length} points vs ${B.length}`);
  for (let i = 0; i < A.length; i++) {
    cmpNum(`${label}[${i}].x`, A[i][0], B[i][0]);
    cmpNum(`${label}[${i}].y`, A[i][1], B[i][1]);
  }
}

const a3 = planFromApp3d();
const a2 = planFromApp2d();
const m = planFromModule();
const FIELDS = ["x", "y", "r", "doorAng"];

console.log("plan parity — src/plan.js vs scripts/app3d.js (canvas 3D)");
cmpHoods("hood", a3.HOODS, m.HOODS, FIELDS.concat(["h"]));
cmpHoods("annex", [a3.AX], [m.AX], FIELDS.concat(["h"]));
cmpPts("WAY", a3.WAY, m.WAY);
if (a3.WALL_SEGS.length !== m.WALL_SEGS.length) fail(`wall segs: ${a3.WALL_SEGS.length} vs ${m.WALL_SEGS.length}`);
else a3.WALL_SEGS.forEach((s, i) => cmpPts(`wallseg[${i}]`, s, m.WALL_SEGS[i]));
if (a3.GATES.length !== m.GATES.length) fail(`gates: ${a3.GATES.length} vs ${m.GATES.length}`);
else a3.GATES.forEach((g, i) => {
  for (const f of ["x", "y", "ux", "uy"]) cmpNum(`gate[${i}].${f}`, g[f], m.GATES[i][f]);
});
if (a3.OBELISKS.length !== m.OBELISKS.length) fail(`obelisks: ${a3.OBELISKS.length} vs ${m.OBELISKS.length}`);
else a3.OBELISKS.forEach((o, i) => {
  for (const f of ["x", "y", "hgt"]) cmpNum(`obelisk[${i}].${f}`, o[f], m.OBELISKS[i][f]);
});
cmpPts("SEA_POLY", a3.SEA_POLY, m.SEA_POLY);
cmpPts("QUAY_POLY", a3.QUAY_POLY, m.QUAY_POLY);
// the walk path must sample identically too
for (let t = 0; t <= 1.0001; t += 0.05) {
  const p = a3.wayAt(Math.min(1, t)), q = m.wayAt(Math.min(1, t));
  for (const f of ["x", "y", "dx", "dy"]) cmpNum(`wayAt(${t.toFixed(2)}).${f}`, p[f], q[f]);
}

console.log("plan parity — src/plan.js vs scripts/app.js (2D map)");
cmpHoods("hood", a2.HOODS, m.HOODS, FIELDS);
cmpHoods("annex", [a2.AX], [m.AX], FIELDS);
cmpPts("WAY", a2.WAY, m.WAY);

if (failures) { console.error(`\n${failures} mismatch(es) — the city plans have drifted apart.`); process.exit(1); }
console.log(`\n✓ all three renderers agree: ${m.HOODS.length} hoods + annex, ${m.WAY.length} way points, ` +
  `${m.WALL_SEGS.length} wall segments, ${m.GATES.length} gates, ${m.OBELISKS.length} obelisks.`);
