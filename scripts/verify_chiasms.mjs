#!/usr/bin/env node
/* Machine-check of the chiasm join (CLAUDE.md invariant 5: nothing invented).

   data/chiasms.json is generated from data/chiasms-source.md (PaulDz's
   transcription of Malina & Rohrbaugh 1998) and joined to the city's blocks in
   data/john-data.json by cumulative verse span.  This script re-derives that
   join independently and fails if the stored join has drifted, so an edit to
   either file cannot silently orphan or misplace a chiasm.

   The join rule (must match scripts/build_chiasms.py resolve_hood):
     1. exact string match of unit.ref against a hood ref
     2. containment: hoods with h.v0 ≤ u.v0 and u.v1 ≤ h.v1 — when several
        candidates share a boundary verse that an a/b suffix splits, the
        suffix decides first; then NARROWEST (smallest v1−v0), ties to lower v0
     3. arc: hoodSpan = every hood fully contained in the span (the annex is
        never a candidate — invariant 4 keeps 7:53–8:11 detached)
     4. nearest hood by verse distance, ties to the lower v1
   Tripwires: the arc list must be exactly ["7:14b–8:59"], the nearest-hood
   list exactly ["8:20"], and the hood-coverage gap set exactly {357}.

   Integrity failures exit non-zero.  Coverage gaps (hoods the source has no
   chiasm for) are reported, never fatal — the source genuinely does not cover
   every block, and inventing coverage is forbidden.

   Usage: node scripts/verify_chiasms.mjs        (exit 0 = join intact) */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CH = JSON.parse(readFileSync(join(ROOT, "data/chiasms.json"), "utf8"));
const JD = JSON.parse(readFileSync(join(ROOT, "data/john-data.json"), "utf8"));

const problems = [];
const fail = (msg) => problems.push(msg);

/* ---------- verse arithmetic (the join key) ---------- */
const OFF = JD.chapterOffsets;
const REF_RE = /^(\d+):(\d+)([ab]?)(?:–(?:(\d+):)?(\d+)([ab]?))?$/;

function span(ref) {
  const m = REF_RE.exec(ref);
  if (!m) return null;
  const ch = +m[1], v = +m[2];
  const v0 = OFF[ch] + v;
  const s = v0 + (m[3] === "b" ? 0.5 : 0);
  if (m[5] === undefined) {
    return { v0, v1: v0, s, e: v0 + (m[3] === "a" ? 0.4 : 0.9) };
  }
  const ch2 = m[4] === undefined ? ch : +m[4];
  const v1 = OFF[ch2] + +m[5];
  return { v0, v1, s, e: v1 + (m[6] === "a" ? 0.4 : 0.9) };
}

/* ---------- hoods (annex excluded from verse arithmetic) ---------- */
const hoods = [];
for (const d of JD.districts)
  for (const w of d.wards)
    for (const h of w.hoods) hoods.push(h);
const byRef = new Map(hoods.map((h) => [h.ref, h.id]));
const byId = new Map(hoods.map((h) => [h.id, h]));

/* the arithmetic itself: every hood ref must re-parse to its stored v0/v1 */
for (const h of hoods.concat([JD.annex])) {
  const sp = span(h.ref);
  if (!sp) fail(`hood ${h.id} ref "${h.ref}" does not parse`);
  else if (sp.v0 !== h.v0 || sp.v1 !== h.v1)
    fail(`hood ${h.id} ref "${h.ref}" re-parses to ${sp.v0}–${sp.v1}, stored ${h.v0}–${h.v1}`);
}

/* ---------- the join rule ---------- */
function resolve(ref) {
  if (byRef.has(ref)) return { hood: byRef.get(ref), by: "exact" };
  const sp = span(ref);
  if (!sp) return { by: null };
  let inside = hoods.filter((h) => h.v0 <= sp.v0 && sp.v1 <= h.v1);
  if (inside.length > 1) {
    const halves = inside.filter((h) => {
      const hs = span(h.ref);
      return hs.s <= sp.s && sp.e <= hs.e;
    });
    if (halves.length) inside = halves;
  }
  if (inside.length) {
    inside.sort((a, b) => (a.v1 - a.v0) - (b.v1 - b.v0) || a.v0 - b.v0);
    return { hood: inside[0].id, by: "contain" };
  }
  const contained = hoods.filter((h) => sp.v0 <= h.v0 && h.v1 <= sp.v1);
  if (contained.length >= 2)
    return { hoodSpan: contained.map((h) => h.id), by: "arc" };
  const dist = (h) => Math.max(h.v0 - sp.v1, sp.v0 - h.v1, 0);
  const near = [...hoods].sort((a, b) => dist(a) - dist(b) || a.v1 - b.v1)[0];
  return { hood: near.id, by: "nearest" };
}

/* ---------- structural integrity ---------- */
const seen = new Set();
for (const u of CH.units) {
  if (seen.has(u.id)) fail(`duplicate unit id ${u.id}`);
  seen.add(u.id);
  if (!u.rows.length && !u.label) fail(`unit ${u.id} is empty (no rows, no label)`);
  const inRange = (i) => Number.isInteger(i) && i >= 0 && i < u.rows.length;
  for (const r of u.rows)
    if (r.type === "rung" && !r.tag) fail(`unit ${u.id} rung at line ${r.line} has no tag`);
  for (const c of u.chiasms) {
    if (!c.rows.length) fail(`chiasm ${c.id} has no rows`);
    if (c.parentRow !== null && !inRange(c.parentRow))
      fail(`chiasm ${c.id} parentRow ${c.parentRow} out of range`);
    for (const i of c.rows)
      if (!inRange(i) || u.rows[i].type !== "rung")
        fail(`chiasm ${c.id} row index ${i} is not a rung of ${u.id}`);
    const ctr = c.centre;
    for (const i of [...ctr.rows, ...(ctr.pair || []), ...ctr.enclosed])
      if (!inRange(i)) fail(`chiasm ${c.id} centre index ${i} out of range`);
    for (const i of [...ctr.rows, ...(ctr.pair || [])])
      if (inRange(i) && u.rows[i].type !== "rung")
        fail(`chiasm ${c.id} centre index ${i} is not a rung`);
    if (ctr.pair !== null && ctr.pair.length !== 2)
      fail(`chiasm ${c.id} centre pair has ${ctr.pair.length} members`);
  }
}
for (const s of CH.sections) {
  if (!s.chiasm) continue;
  const n = s.chiasm.rungs.length;
  for (const r of s.chiasm.rungs) {
    if (!r.tag) fail(`section ${s.id} rung at line ${r.line} has no tag`);
    if (r.hood && !byId.has(r.hood)) fail(`section ${s.id} rung hood ${r.hood} unknown`);
  }
  for (const i of s.chiasm.centre.rungs)
    if (!(Number.isInteger(i) && i >= 0 && i < n))
      fail(`section ${s.id} centre rung index ${i} out of range`);
}

/* ---------- re-derive the join, diff against stored ---------- */
const arcs = [], nearest = [];
for (const u of CH.units) {
  let want;
  if (u.kind === "note") want = { hood: JD.annex.id, by: "annex-id" };
  else if (u.ref === null) want = { by: null };
  else want = resolve(u.ref);
  if (want.by === "arc") arcs.push(u.ref);
  if (want.by === "nearest") nearest.push(u.ref);
  const eq = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
  if (!eq(want.hood, u.hood) || !eq(want.hoodSpan, u.hoodSpan))
    fail(`unit ${u.id} ("${u.ref}") stored hood=${u.hood}/${JSON.stringify(u.hoodSpan)} ` +
         `but the rule derives ${want.hood}/${JSON.stringify(want.hoodSpan ?? null)}`);
  if (u.hood && u.hood !== JD.annex.id && !byId.has(u.hood))
    fail(`unit ${u.id} hood ${u.hood} not in john-data.json`);
  if (u.hoodSpan)
    for (const hid of u.hoodSpan) {
      if (hid === JD.annex.id) fail(`unit ${u.id} arc includes the annex (invariant 4)`);
      else if (!byId.has(hid)) fail(`unit ${u.id} arc hood ${hid} unknown`);
    }
}

/* ---------- tripwires ---------- */
const orphans = CH.units.filter((u) => !u.hood && !u.hoodSpan);
if (orphans.length)
  fail(`units matching nothing: ${orphans.map((u) => `${u.id} "${u.ref}"`).join(", ")}`);
if (JSON.stringify(arcs) !== JSON.stringify(["7:14b–8:59"]))
  fail(`arc list is ${JSON.stringify(arcs)}, expected exactly ["7:14b–8:59"]`);
if (JSON.stringify(nearest) !== JSON.stringify(["8:20"]))
  fail(`nearest-hood list is ${JSON.stringify(nearest)}, expected exactly ["8:20"]`);
const covered = new Set();
for (const h of hoods.concat([JD.annex]))
  for (let v = h.v0; v <= h.v1; v++) covered.add(v);
const gaps = [];
for (let v = 1; v <= JD.totalVerses; v++) if (!covered.has(v)) gaps.push(v);
if (JSON.stringify(gaps) !== JSON.stringify([357]))
  fail(`hood-coverage gap set is {${gaps}}, expected exactly {357} (= 8:20)`);

/* ---------- stored index must agree with the units ---------- */
for (const u of CH.units) {
  const idx = CH.index.byUnit[u.id];
  if (!idx) fail(`unit ${u.id} missing from index.byUnit`);
  else if (idx.hood !== u.hood) fail(`index.byUnit[${u.id}].hood disagrees with unit`);
  if (u.hood && !(CH.index.byHood[u.hood]?.units || []).includes(u.id))
    fail(`index.byHood[${u.hood}] does not list ${u.id}`);
  if (u.hoodSpan)
    for (const hid of u.hoodSpan)
      if (!(CH.index.byHood[hid]?.arcs || []).includes(u.id))
        fail(`index.byHood[${hid}].arcs does not list ${u.id}`);
}

/* ---------- coverage report (informational, never fatal) ---------- */
const receivers = hoods.map((h) => h.id).concat([JD.annex.id]);
const perHood = Object.fromEntries(receivers.map((id) => [id, { chiasms: 0, units: 0 }]));
let topChiasms = 0, subChiasms = 0;
for (const u of CH.units) {
  if (u.hood && perHood[u.hood]) {
    perHood[u.hood].units++;
    for (const c of u.chiasms)
      if (c.parentRow === null) perHood[u.hood].chiasms++;
  }
  for (const c of u.chiasms) c.parentRow === null ? topChiasms++ : subChiasms++;
}
const distn = {};
for (const id of receivers) distn[perHood[id].chiasms] = (distn[perHood[id].chiasms] || 0) + 1;
const noChiasm = receivers.filter((id) => perHood[id].chiasms === 0);
const noUnit = receivers.filter((id) => perHood[id].units === 0 &&
  !(CH.index.byHood[id]?.arcs || []).length);

console.log(`chiasm join: ${CH.units.length} units → ${topChiasms} chiasms + ${subChiasms} sub-chiasms over ${receivers.length} blocks (${hoods.length} hoods + annex)`);
console.log(`chiasms per block: ${Object.entries(distn).map(([k, v]) => `${k}×${v}`).join("  ")}`);
console.log(`blocks with no chiasm (source has none — shown as-is, never filled): ${noChiasm.join(", ")}`);
console.log(`blocks receiving no unit at all: ${noUnit.length ? noUnit.join(", ") : "none"}`);
console.log(`source units matching nothing: ${orphans.length ? orphans.map((u) => u.id).join(", ") : "none"}`);
console.log(`arc: "7:14b–8:59" spans 9 blocks · nearest-hood fallback: "8:20" → n49 · coverage gap: verse 357 only`);

if (problems.length) {
  console.error(`\nchiasm verify FAILED — ${problems.length} problem(s):`);
  for (const p of problems) console.error("  ✗ " + p);
  process.exit(1);
}
console.log("chiasm verify OK — join re-derived with zero drift, structure intact");
