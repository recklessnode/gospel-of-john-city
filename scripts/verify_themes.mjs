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

/* ---------- report ---------- */
const tops = TH.themes.filter(t => !t.parent);
console.log(`themes: ${TH.themes.length} (${tops.length} top-level, ${TH.themes.length - tops.length} sub-entries), ${refTotal} refs`);
if (orphanRefs.length) console.log(`refs in no block (expected: 8:20 only — invariant 4): ${[...new Set(orphanRefs)].join(", ")}`);
if (problems.length) {
  console.error(`\n${problems.length} problem(s):`);
  for (const p of problems) console.error("  ✗ " + p);
  process.exit(1);
}
console.log("✓ themes join intact — every way traces to data/themes-source.md");
