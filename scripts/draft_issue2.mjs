#!/usr/bin/env node
/* Generate docs/issue2-draft.md — the short reply to PaulDz on issue #2 — from
   docs/issue2-questions.json and the data. It is a DRAFT: nothing here posts it.

   Every figure in the draft is computed, never typed:
     - templates may not contain a digit outside a {placeholder} (a typed figure is a second
       home for a fact, and it would drift — the user's imperative 5);
     - each question's asserts must hold, or the prose would say something false;
     - the live-map base URL is read from README.md's "**Live map:**" line (its one home);
     - pinch counts come from the same geometry the map draws (scripts/plan_slice.mjs).

   Usage: node scripts/draft_issue2.mjs            write the draft
          node scripts/draft_issue2.mjs --check    regenerate in memory; fail if the file differs
   Wired as `npm run verify:draft`, deliberately NOT part of `npm run build`: a stale comment
   draft must never block publishing the map. */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";
import { ROOT, app2dPlan, wayScale } from "./plan_slice.mjs";

const CHECK = process.argv.includes("--check");
const Q = JSON.parse(readFileSync(join(ROOT, "docs/issue2-questions.json"), "utf8"));
const THEMES = JSON.parse(readFileSync(join(ROOT, "data/themes.json"), "utf8")).themes;
const WT = JSON.parse(readFileSync(join(ROOT, "data/way-types.json"), "utf8"));
const TYPES = WT.types;
const OUT = join(ROOT, "docs/issue2-draft.md");
const problems = [];
const fail = m => problems.push(m);

const live = /\*\*Live map:\*\*\s+(\S+)/.exec(readFileSync(join(ROOT, "README.md"), "utf8"));
if (!live) { console.error("✗ README.md has no **Live map:** line — the draft's links have no base"); process.exit(1); }
const BASE = live[1].replace(/\/?$/, "/");

const byKey = new Map(THEMES.map(t => [t.key, t]));
const typeOf = k => TYPES.find(t => t.key === k);
const PLAN = app2dPlan(JSON.parse(readFileSync(join(ROOT, "data/john-data.json"), "utf8")));
const SCALE = wayScale(PLAN.ROAD_HALF);
const band = k => PLAN.wayBandOf(TYPES, k);   // one home: the page's own band text
const fmt = n => n.toLocaleString("en-US");

const pinchesOf = k => {
  const t = byKey.get(k);
  return PLAN.wayPinches(PLAN.wayGeometry(t, typeOf(t.way).widthPlan * SCALE / 2).crossings).length;
};

function field(expr) {
  const [k, f] = expr.split(".");
  const t = byKey.get(k);
  if (!t) throw new Error(`unknown theme "${k}"`);
  switch (f) {
    case "label": return t.label;
    case "verses": return t.verses;
    case "greek": return t.greek;
    case "blocks": return t.blocks.length;
    case "chapters": return t.chapters.length;
    case "refs": return t.refs.join(", ");
    case "way": return t.way;
    case "type": return typeOf(t.way).label;
    case "gloss": return typeOf(t.way).gloss;
    case "band": return band(t.way);
    default: throw new Error(`unknown field "${f}" in {${expr}}`);
  }
}
/* the retired sketch roads, read from the commit that last carried them (the same source as
   docs/provenance-sketch-roads.mjs), measured against the question's own ways */
let SKETCH = null;
const sketchRoad = road => {
  if (!SKETCH) SKETCH = JSON.parse(execSync(`git show ${Q.sketchCommit}:data/john-data.json`, { cwd: ROOT, maxBuffer: 1 << 24 }).toString()).themeRoads;
  if (!SKETCH || !SKETCH[road]) throw new Error(`no sketch road "${road}" at ${Q.sketchCommit}`);
  return SKETCH[road].stops;
};
let CUR_WAYS = [];
const sketchSplit = road => {
  const stops = sketchRoad(road), mine = new Set(CUR_WAYS.flatMap(k => byKey.get(k).blocks));
  const H = {}; JSON.parse(readFileSync(join(ROOT, "data/john-data.json"), "utf8")).districts
    .forEach(d => d.wards.forEach(w => w.hoods.forEach(h => { H[h.id] = h; })));
  return { inside: stops.filter(s => mine.has(s)).length, total: stops.length, outside: stops.filter(s => !mine.has(s)).map(s => H[s] ? H[s].ref : s) };
};
const shared = pair => { const [a, b] = pair.split(","); const B = new Set(byKey.get(b).blocks); return byKey.get(a).blocks.filter(x => B.has(x)).length; };

function fill(tpl, ctx) {
  // the lint first: strip every placeholder; any digit left over was typed
  const bare = tpl.replace(/\{[^}]*\}/g, "");
  if (/\d/.test(bare)) fail(`typed figure in template (${ctx}): "${bare.match(/.{0,20}\d.{0,20}/)[0]}"`);
  return tpl.replace(/\{([^}]*)\}/g, (_, p) => {
    try {
      if (p === "status") return WT.status;
      if (p === "issue") return String(Q.issue);
      if (p.startsWith("pinches:")) {
        const n = pinchesOf(p.slice(8));
        return n ? ` (The ${typeOf(byKey.get(p.slice(8)).way).label.toLowerCase()} is also wider than ${n === 1 ? "one gap" : fmtN(n) + " gaps"} between blocks it is not on, so at each it passes over two blocks that are not in the theme; the key names them.)` : "";
      }
      if (p.startsWith("sketch:")) { const q = sketchSplit(p.slice(7)); return `${fmt(q.inside)} of ${fmt(q.total)}`; }
      if (p.startsWith("sketch-rest:")) {
        const q = sketchSplit(p.slice(12));
        return !q.outside.length ? "" : q.outside.length === 1 ? `; the other, ${q.outside[0]}, is in neither` : `; the other ${fmtN(q.outside.length)}, ${q.outside.join(", ")}, are in neither`;
      }
      if (p.startsWith("an:")) return /^[aeiou]/i.test(String(field(p.slice(3)))) ? "an" : "a";
      if (p.startsWith("plural:")) {
        const parts = p.split(":");
        const [n, word] = parts[1] === "shared" ? [shared(parts[2]), parts[3]] : [field(parts[1]), parts[2]];
        return `${fmt(n)} ${n === 1 ? word : word + "s"}`;
      }
      const v = field(p);
      return typeof v === "number" ? fmt(v) : v;
    } catch (e) { fail(`${ctx}: {${p}} — ${e.message}`); return `{${p}}`; }
  });
}
const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
const fmtN = n => WORDS[n] || fmt(n);

function check(a, ctx) {
  const v = e => field(e);
  const ok = a.eq ? v(a.eq[0]) === v(a.eq[1]) : a.ne ? v(a.ne[0]) !== v(a.ne[1]) : a.gt ? v(a.gt[0]) > v(a.gt[1])
    : a.widest ? byKey.get(a.widest).way === TYPES[0].key : a.narrowest ? byKey.get(a.narrowest).way === TYPES[TYPES.length - 1].key : null;
  if (ok === null) fail(`${ctx}: unknown assert ${JSON.stringify(a)}`);
  else if (!ok) fail(`${ctx}: assert false — ${JSON.stringify(a)}; the prose would not be true`);
}

const lines = [fill(Q.intro, "intro"), ""];
Q.questions.forEach((q, i) => {
  const ctx = `question ${i + 1}`;
  for (const k of q.ways) { const t = byKey.get(k); if (!t) fail(`${ctx}: unknown way "${k}"`); else if (t.parent) fail(`${ctx}: "${k}" is a sub-entry and has no way`); }
  for (const a of q.asserts || []) check(a, ctx);
  CUR_WAYS = q.ways;
  const link = `${BASE}?ways=${q.ways.join(",")}`;
  lines.push(`${i + 1}. **${fill(q.title, ctx + " title")}** — ${link}  `);
  lines.push(`   ${fill(q.template, ctx)}`);
  lines.push("");
});
const draft = lines.join("\n").replace(/\n+$/, "\n");

if (problems.length) {
  console.error(`${problems.length} problem(s) — draft not written:`);
  for (const p of problems) console.error("  ✗ " + p);
  process.exit(1);
}
if (CHECK) {
  const have = existsSync(OUT) ? readFileSync(OUT, "utf8") : null;
  if (have !== draft) { console.error("✗ docs/issue2-draft.md is stale or hand-edited — run node scripts/draft_issue2.mjs"); process.exit(1); }
  console.log("✓ issue-#2 draft is current: every figure in it is computed from the data");
} else {
  writeFileSync(OUT, draft);
  console.log(`wrote ${OUT.replace(ROOT + "/", "")} (${Q.questions.length} questions, not posted)`);
}
