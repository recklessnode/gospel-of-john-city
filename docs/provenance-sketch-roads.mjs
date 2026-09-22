// node docs/provenance-sketch-roads.mjs <commit-with-themeRoads>   — run from the repo root
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
const C = process.argv[2];
const J = JSON.parse(execSync(`git show ${C}:data/john-data.json`, { maxBuffer: 1 << 24 }).toString());
const T = JSON.parse(readFileSync("data/themes.json", "utf8")).themes;
const top = T.filter(t => !t.parent), kids = T.filter(t => t.parent);
const H = {}; J.districts.forEach(d => d.wards.forEach(w => w.hoods.forEach(h => H[h.id] = h)));
const nm = id => `${id} (${H[id] ? H[id].ref : "?"})`;
for (const [key, r] of Object.entries(J.themeRoads)) {
  console.log(`\n#### ${r.label}  —  ${r.note}`);
  console.log(`stops (${r.stops.length}): ${r.stops.join(", ")}`);
  console.log(`| stop | top-level themes containing it | sub-entries containing it |`);
  console.log(`|---|---|---|`);
  for (const s of r.stops) {
    const inTop = top.filter(t => t.blocks.includes(s)).map(t => t.key);
    const inKid = kids.filter(t => t.blocks.includes(s)).map(t => `${t.key} (sub-entry of ${t.parent})`);
    console.log(`| ${nm(s)} | ${inTop.join(", ") || "—"} | ${inKid.join(", ") || "—"} |`);
  }
  const same = top.find(t => t.key === key);
  if (same) {
    const off = same.blocks.filter(b => !r.stops.includes(b));
    const on = r.stops.filter(s => same.blocks.includes(s));
    console.log(`\nAgainst the measured theme \`${key}\`: ${on.length} of ${r.stops.length} road stops are among its ${same.blocks.length} blocks; ${off.length} of its blocks are not on the road (${off.join(", ")}).`);
  } else {
    console.log(`\nNo top-level measured theme is keyed \`${key}\`.`);
  }
}
