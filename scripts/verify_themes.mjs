#!/usr/bin/env node
/* Machine-check of the theme ways (CLAUDE.md invariant 5: nothing invented).

   data/themes.json is generated from data/themes-source.md — PaulDz's exhaustive
   verse lists, transcribed verbatim from his 2026-08-18 comment on issue #2. Every
   way the city draws is a claim about the text, so this script re-derives the join
   independently and fails if it has drifted:

     1. no invented refs — every ref in the JSON must be findable in the source
     2. no dropped themes — every bolded theme name in the source's "# Themes"
        region must have an entry
     3. every ref is a real verse of John (chapter 1–21, verse within its chapter)
     4. the measurements (verses, greek, blocks) recompute from john-data.json

   Coverage gaps are reported, never fatal: 8:20 sits in no block because Malina &
   Rohrbaugh's outline detaches 7:53–8:11 (invariant 4), and inventing a home for it
   is forbidden.

   Usage: node scripts/verify_themes.mjs        (exit 0 = join intact) */

import { readFileSync } from "node:fs";
import { ROAD_HALF } from "../src/plan.js";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TH = JSON.parse(readFileSync(join(ROOT, "data/themes.json"), "utf8"));
const JD = JSON.parse(readFileSync(join(ROOT, "data/john-data.json"), "utf8"));
const SRC = readFileSync(join(ROOT, "data/themes-source.md"), "utf8");

const problems = [];
const fail = m => problems.push(m);

const CH_VERSES = { 1: 51, 2: 25, 3: 36, 4: 54, 5: 47, 6: 71, 7: 53, 8: 59, 9: 41, 10: 42,
  11: 57, 12: 50, 13: 38, 14: 31, 15: 27, 16: 33, 17: 26, 18: 40, 19: 42, 20: 31, 21: 25 };
const HOODS = JD.districts.flatMap(d => d.wards.flatMap(w => w.hoods));
const absIdx = (c, v) => JD.chapterOffsets[String(c)] + v;

/* per-verse Greek apportionment — must match scripts/verse_weights.py */
const WEIGHT = new Map();
for (const h of HOODS) {
  const n = h.v1 - h.v0 + 1;
  for (let i = h.v0; i <= h.v1; i++) WEIGHT.set(i, (WEIGHT.get(i) || 0) + h.greek / n);
}

const expand = ref => {
  const m = /^(\d+):(\d+)(?:-(\d+))?$/.exec(ref);
  if (!m) return null;
  const c = +m[1], a = +m[2], b = m[3] ? +m[3] : +m[2];
  if (!CH_VERSES[c] || a < 1 || b > CH_VERSES[c] || a > b) return null;
  return Array.from({ length: b - a + 1 }, (_, k) => [c, a + k]);
};

/* ---------- 1. the source region, and what it names ---------- */
const themeRegion = SRC.slice(SRC.indexOf("\n# Themes"));
if (themeRegion.length < 1000) fail("could not locate the '# Themes' region of themes-source.md");
const bolded = new Set();
for (const m of themeRegion.matchAll(/^\s*\*?\s*\*\*(.+?)\*\*\s*$/gm)) bolded.add(m[1].trim());
for (const m of themeRegion.matchAll(/^\s*\*\s*\*\*(.+?):\*\*/gm)) bolded.add(m[1].trim());

const labels = new Set(TH.themes.map(t => t.label.replace(/:$/, "").trim()));
const missing = [...bolded].filter(b => {
  const n = b.replace(/:$/, "").trim();
  return !labels.has(n) && !/^Chapter \d+$/.test(n);
});
if (missing.length) fail(`themes named in the source but absent from themes.json: ${missing.join(" | ")}`);

/* ---------- 2/3. every ref valid, and traceable to the source ---------- */
let refTotal = 0, orphanRefs = [];
for (const t of TH.themes) {
  if (!t.key || !t.label) fail(`theme with no key/label: ${JSON.stringify(t).slice(0, 80)}`);
  for (const r of t.refs) {
    refTotal++;
    const vv = expand(r);
    if (!vv) { fail(`${t.key}: ref "${r}" is not a real verse span of John`); continue; }
    // traceability: the ref, or its bare verse part, must appear in the source text
    const [c, v] = r.split(":");
    const bare = v;
    if (!themeRegion.includes(r) && !new RegExp(`(^|[\\s,:])${bare.replace("-", "[-–—]")}([\\s,)]|$)`, "m").test(themeRegion))
      fail(`${t.key}: ref "${r}" does not appear in themes-source.md`);
    for (const [cc, vnum] of vv) if (!WEIGHT.has(absIdx(cc, vnum))) orphanRefs.push(`${t.key} ${cc}:${vnum}`);
  }
}

/* ---------- 4. measurements recompute ---------- */
for (const t of TH.themes) {
  const idx = new Set();
  for (const r of t.refs) for (const [c, v] of expand(r) || []) idx.add(absIdx(c, v));
  const verses = idx.size;
  const greek = Math.round([...idx].reduce((s, i) => s + (WEIGHT.get(i) || 0), 0));
  const blocks = HOODS.filter(h => [...idx].some(i => h.v0 <= i && i <= h.v1)).map(h => h.id);
  if (verses !== t.verses) fail(`${t.key}: verses ${t.verses} stored, ${verses} recomputed`);
  if (greek !== t.greek) fail(`${t.key}: greek ${t.greek} stored, ${greek} recomputed`);
  if (blocks.join() !== [...t.blocks].join()) fail(`${t.key}: blocks drifted (${t.blocks.length} stored, ${blocks.length} recomputed)`);
}

/* ---------- 4a. themes.json is generated from the committed parse ---------- */
// data/themes-parsed.json is the audited parse (it once lived only in a /tmp scratchpad,
// which a restart cleared). Every generated theme must match its parse entry, and nothing
// may exist in one without the other.
{
  const PARSED = JSON.parse(readFileSync(join(ROOT, "data/themes-parsed.json"), "utf8"));
  if (!PARSED.length) fail("data/themes-parsed.json is empty");
  const P = new Map(PARSED.map(t => [t.key, t]));
  const umbrella = new Set(PARSED.filter(t => t.parent).map(t => t.parent));
  for (const t of TH.themes) {
    const q = P.get(t.key);
    if (!q) { fail(`${t.key}: in themes.json but not in themes-parsed.json`); continue; }
    if (q.label !== t.label || q.group !== t.group || (q.parent || null) !== (t.parent || null))
      fail(`${t.key}: label/group/parent drifted from themes-parsed.json`);
    const want = umbrella.has(t.key) ? PARSED.filter(c => c.parent === t.key).flatMap(c => c.refs) : q.refs;
    if (JSON.stringify(want) !== JSON.stringify(t.refs)) fail(`${t.key}: refs drifted from themes-parsed.json`);
  }
  for (const k of P.keys()) if (!TH.themes.some(t => t.key === k)) fail(`${k}: in themes-parsed.json but not generated`);
}

/* ---------- 4b. one home for theme extents ---------- */
// The sketch's two hand-drawn "theme roads" were retired 2026-09-22 (conversations.md keeps
// them verbatim). Theme extents live only in data/themes.json; a second list in the city data
// would be two representations of one fact, and they would diverge.
if ("themeRoads" in JD) fail("john-data.json carries themeRoads — theme extents live only in data/themes.json");

/* ---------- 5. way bands are derivable, not hand-tagged ---------- */
const WAYS = JSON.parse(readFileSync(join(ROOT, "data/way-types.json"), "utf8")).types;
// drawing widths: one per type, strictly narrowing in band order, and the widest theme way
// narrower than the Johannine Way itself (2 × ROAD_HALF, imported — never restated here),
// so the narrative spine stays visually primary.
for (const w of WAYS) if (typeof w.widthPlan !== "number" || !(w.widthPlan > 0)) fail(`way type ${w.key}: widthPlan missing or not a positive number`);
for (let i = 1; i < WAYS.length; i++)
  if (!(WAYS[i].widthPlan < WAYS[i - 1].widthPlan)) fail(`way widths not strictly decreasing: ${WAYS[i - 1].key} ${WAYS[i - 1].widthPlan} → ${WAYS[i].key} ${WAYS[i].widthPlan}`);
if (WAYS.length && !(WAYS[0].widthPlan < 2 * ROAD_HALF)) fail(`${WAYS[0].key} widthPlan ${WAYS[0].widthPlan} is not narrower than the Way (2 × ROAD_HALF = ${2 * ROAD_HALF})`);
for (let i = 1; i < WAYS.length; i++)
  if (WAYS[i].minVerses >= WAYS[i - 1].minVerses)
    fail(`way bands out of order: ${WAYS[i - 1].key} minVerses ${WAYS[i - 1].minVerses} <= ${WAYS[i].key} ${WAYS[i].minVerses}`);
for (const t of TH.themes) {
  if (t.parent) {
    if (t.way) fail(`${t.key}: sub-entries must not carry a way (its verses are already inside ${t.parent}'s)`);
    continue;
  }
  const want = WAYS.find(w => t.verses >= w.minVerses);
  if (!t.way) fail(`${t.key}: no way assigned`);
  else if (t.way !== want.key) fail(`${t.key}: way "${t.way}" is not what the bands derive (${want.key}, ${t.verses} verses)`);
}
// the bands must partition monotonically: no way's smallest theme may be smaller than
// a lesser way's largest. This is what proves the mapping was derived, not hand-placed.
const tops2 = TH.themes.filter(t => !t.parent);
for (let i = 1; i < WAYS.length; i++) {
  const hi = tops2.filter(t => t.way === WAYS[i - 1].key).map(t => t.verses);
  const lo = tops2.filter(t => t.way === WAYS[i].key).map(t => t.verses);
  if (hi.length && lo.length && Math.min(...hi) <= Math.max(...lo))
    fail(`${WAYS[i - 1].key}/${WAYS[i].key} bands overlap in verse count`);
}

/* ---------- report ---------- */
const tops = TH.themes.filter(t => !t.parent);
console.log(`themes: ${TH.themes.length} (${tops.length} top-level, ${TH.themes.length - tops.length} sub-entries), ${refTotal} refs`);
console.log("ways: " + WAYS.map(w => `${w.key} ${tops.filter(t => t.way === w.key).length}`).join(" · "));
if (orphanRefs.length) console.log(`refs in no block (expected: 8:20 only — invariant 4): ${[...new Set(orphanRefs)].join(", ")}`);
if (problems.length) {
  console.error(`\n${problems.length} problem(s):`);
  for (const p of problems) console.error("  ✗ " + p);
  process.exit(1);
}
console.log("✓ themes join intact — every way traces to data/themes-source.md");
