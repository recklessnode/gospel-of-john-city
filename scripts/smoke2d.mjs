#!/usr/bin/env node
/* Interaction smoke test for the 2D page (index.html) — the only page smoke.mjs never covered.
   Loops over light/dark × 1440/400 unless --config is given.

     node scripts/smoke2d.mjs index.html [--config dark-400] [--shots <dir>]

   The instrument is tested before it is trusted: run it on the unbuilt template
   (`node scripts/smoke2d.mjs index.template.html`), whose __DATA__ placeholder is a syntax
   error, and it must go red. A harness that cannot say no proves nothing. */
import { chromium } from "playwright";
import { resolve, join, dirname } from "node:path";
import { mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { app2dPlan } from "./plan_slice.mjs";

const argv = process.argv.slice(2);
const VALUED = new Set(["--config", "--shots"]);
const flag = n => { const i = argv.indexOf(n); return i < 0 ? null : argv[i + 1]; };
const positional = argv.filter((a, i) => !a.startsWith("--") && !VALUED.has(argv[i - 1]));
const target = positional[0] || "index.html";
const shots = flag("--shots");
const only = flag("--config");
const CONFIGS = [
  { name: "light-1440", scheme: "light", width: 1440, height: 900 },
  { name: "dark-1440", scheme: "dark", width: 1440, height: 900 },
  { name: "light-400", scheme: "light", width: 400, height: 860 },
  { name: "dark-400", scheme: "dark", width: 400, height: 860 },
].filter(c => !only || c.name === only);
if (!CONFIGS.length) { console.error(`unknown --config ${only}`); process.exit(2); }
if (shots) mkdirSync(shots, { recursive: true });

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DISK = {
  themes: readFileSync(join(ROOT, "data/themes.json"), "utf8"),
  ways: readFileSync(join(ROOT, "data/way-types.json"), "utf8"),
};
/* ---------- theme-way fixtures, DERIVED so a re-band can only shrink coverage visibly ----------
   Per type present in the data: the multi-block way with the most blocks, and a single-block
   (stub) way where one exists; plus the way with the most certified pinches, so the bridge
   assertions always have something to measure. Computed with the node gate's own functions. */
const WT = JSON.parse(DISK.themes).themes.filter(t => !t.parent);
const TY = JSON.parse(DISK.ways).types;
const PLAN = app2dPlan(JSON.parse(readFileSync(join(ROOT, "data/john-data.json"), "utf8")));
const TPL = readFileSync(join(ROOT, "index.template.html"), "utf8");
const SCALE = parseFloat(/\.way-casing\s*\{[^}]*stroke-width:\s*([\d.]+)/.exec(TPL)[1]) / (2 * PLAN.ROAD_HALF);
const hwOf = t => TY.find(y => y.key === t.way).widthPlan * SCALE / 2;
const fixtureKeys = [], unmeasured = [];
for (const ty of TY) {
  const mine = WT.filter(t => t.way === ty.key);
  if (!mine.length) { unmeasured.push(`${ty.key}: no theme of this type in the data`); continue; }
  const multi = mine.filter(t => t.blocks.length > 1).sort((a, b) => b.blocks.length - a.blocks.length)[0];
  const single = mine.find(t => t.blocks.length === 1);
  if (multi) fixtureKeys.push(multi.key); else unmeasured.push(`${ty.key}: no multi-block way`);
  if (single) fixtureKeys.push(single.key); else unmeasured.push(`${ty.key} stub: no single-block ${ty.key}`);
}
const pinched = WT.map(t => ({ t, n: PLAN.wayPinches(PLAN.wayGeometry(t, hwOf(t)).crossings).length }))
  .filter(x => x.n > 0).sort((a, b) => b.n - a.n);
if (pinched.length && !fixtureKeys.includes(pinched[0].t.key)) fixtureKeys.push(pinched[0].t.key);
const FIXTURES = [];
for (let i = 0; i < fixtureKeys.length; i += 4) FIXTURES.push(fixtureKeys.slice(i, i + 4));

const url = (/^https?:/.test(target) ? target : "file://" + resolve(target));
/* Runs IN THE PAGE. Measures the rendered theme ways; every expected value is computed from the
   page's own globals (JOHN_WAYTHEMES, JOHN_WAYS, ROAD_HALF, CSS tokens), never typed here. */
function measureWays(keys) {
  const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const probeEl = document.createElement("div"); document.body.appendChild(probeEl);
  const col = c => { probeEl.style.color = ""; probeEl.style.color = c; const m = getComputedStyle(probeEl).color.match(/[\d.]+/g).map(Number);
    return { r: m[0], g: m[1], b: m[2], a: m[3] === undefined ? 1 : m[3] }; };
  const over = (f, b) => ({ r: f.r * f.a + b.r * (1 - f.a), g: f.g * f.a + b.g * (1 - f.a), b: f.b * f.a + b.b * (1 - f.a), a: 1 });
  const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const page = col(css("--page"));
  const grounds = { page, "district wash": over(col(css("--district-wash")), page), water: col(css("--water")) };
  const casing = col(css("--road-casing"));
  const scale = parseFloat(getComputedStyle(document.querySelector("#map .way-casing")).strokeWidth) / (2 * ROAD_HALF);
  const T = k => window.JOHN_WAYTHEMES.themes.find(x => x.key === k);
  const TY = k => window.JOHN_WAYS.types.find(x => x.key === k);
  const segd = (px, py, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy;
    let t = L2 ? ((px - a[0]) * dx + (py - a[1]) * dy) / L2 : 0; t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (a[0] + t * dx), py - (a[1] + t * dy)); };
  const ways = keys.map(k => {
    const t = T(k), g = document.querySelector(`#map g.way[data-way="${k}"]`);
    if (!g) return { k, missing: true };
    const outer = g.querySelector(".wl-outer"), cs = getComputedStyle(outer);
    const sw = parseFloat(cs.strokeWidth), bb = outer.getBBox();
    let op = parseFloat(cs.strokeOpacity);
    for (let e = outer; e && e.id !== "map"; e = e.parentElement) op *= parseFloat(getComputedStyle(e).opacity);
    const oc = col(cs.stroke); oc.a *= op;
    const con = Object.fromEntries(Object.entries(grounds).map(([n, gd]) => [n, { way: ratio(over(oc, gd), gd), floor: ratio(casing, gd) }]));
    const stub = g.hasAttribute("data-stub");
    let crossed = [];
    if (!stub) {
      const pts = outer.getAttribute("d").slice(1).split("L").map(q => q.split(",").map(Number));
      const mine = new Set(t.blocks);
      const disks = [...document.querySelectorAll("#map circle.hood[data-hood]")]
        .filter(c => c.dataset.hood !== "annex" && !mine.has(c.dataset.hood))
        .map(c => ({ id: c.dataset.hood, x: +c.getAttribute("cx"), y: +c.getAttribute("cy"), r: +c.getAttribute("r") }));
      const ab = document.querySelector("#map circle.annex-blob");   // the annex as drawn, as the gate models it
      if (ab && !mine.has("annex")) disks.push({ id: "annex", x: +ab.getAttribute("cx"), y: +ab.getAttribute("cy"), r: +ab.getAttribute("r") });
      for (const o of disks) {
        let best = Infinity;
        for (let i = 1; i < pts.length; i++) best = Math.min(best, segd(o.x, o.y, pts[i - 1], pts[i]));
        if (best < o.r + sw / 2) crossed.push(o.id);
      }
    }
    const bridges = [...document.querySelectorAll(`#map .way-bridge[data-way="${k}"]`)].map(e => e.dataset.bridge);
    const badgeOnBridge = bridges.filter(id => document.querySelector(`#map .way-badge[data-way="${k}"][data-badge="${id}"]`)).length;
    const bdg = document.querySelector(`#map .way-badge[data-way="${k}"]`);
    const badgeContrast = bdg ? ratio(col(getComputedStyle(bdg.querySelector("text")).fill), col(getComputedStyle(bdg.querySelector("circle")).fill)) : null;
    return { k, type: t.way, typeDrawn: [...g.classList].find(c => c.startsWith("way-")).slice(4), sw, want: TY(t.way).widthPlan * scale,
      bbw: bb.width, bbh: bb.height, con, badges: document.querySelectorAll(`#map .way-badge[data-way="${k}"]`).length,
      blocks: t.blocks.length, stub, crossed: crossed.sort(), bridges: bridges.sort(), badgeOnBridge, badgeContrast };
  });
  const hoods = [...document.querySelectorAll("#map .hood[data-hood]")];
  const union = new Set(keys.flatMap(k => T(k).blocks));
  const dimmed = hoods.filter(e => e.classList.contains("dimmed"));
  let opChanged = 0;
  for (const e of dimmed) { const a = getComputedStyle(e).opacity; e.classList.remove("dimmed"); const b = getComputedStyle(e).opacity; e.classList.add("dimmed"); if (a !== b) opChanged++; }
  const first = sel => document.querySelector("#map " + sel);
  const drawn = [...document.querySelectorAll("#map .way")];
  const before = (a, b) => !!(a && b && (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING));
  const lastHood = hoods[hoods.length - 1];
  const orderOK = drawn.length > 0 && drawn.every(w => before(w, first(".wall")) && before(w, first(".way-casing")) && before(w, first(".hood")))
    && [...document.querySelectorAll("#map .way-bridge, #map .way-badge")].every(e => before(lastHood, e));
  const widths = drawn.map(w => TY(T(w.dataset.way).way).widthPlan);
  const wayish = e => !!(e && e.closest && e.closest(".way, .way-bridge, .layer-way-badges"));
  const map = document.getElementById("map"), mr = document.getElementById("mapwrap").getBoundingClientRect();
  let ptOpp = 0, ptBad = 0, ptHood = 0;
  const probe = (x, y, hood) => {
    if (x < mr.left || x > mr.right || y < mr.top || y > mr.bottom) return;
    const e = document.elementFromPoint(x, y);
    if (!e || (!map.contains(e) && !wayish(e))) return;          // covered by page chrome: not an opportunity
    ptOpp++; if (wayish(e)) ptBad++; if (hood && e.dataset && e.dataset.hood === hood) ptHood++;
  };
  for (const b of document.querySelectorAll("#map .way-bridge")) {
    const c = document.querySelector(`#map circle.hood[data-hood="${b.dataset.bridge}"]`), r = c.getBoundingClientRect();
    probe(r.left + r.width / 2, r.top + r.height / 2, b.dataset.bridge);
  }
  for (const b of document.querySelectorAll("#map .way-badge")) { const r = b.getBoundingClientRect(); probe(r.left + r.width / 2, r.top + r.height / 2, null); }
  probeEl.remove();
  return { ways, dimmed: dimmed.length, expectDim: hoods.filter(e => !union.has(e.dataset.hood)).length, opChanged, orderOK,
    widths, ascending: widths.every((v, i) => !i || widths[i - 1] <= v), ptOpp, ptBad, ptHood };
}

const b = await chromium.launch();
const checks = [];
const ok = (cfg, name, pass, detail = "") => checks.push({ cfg, name, pass: !!pass, detail });

for (const cfg of CONFIGS) {
  const ctx = await b.newContext({ viewport: { width: cfg.width, height: cfg.height }, colorScheme: cfg.scheme });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(String(e)));
  page.on("console", m => { if (m.type() === "error") errors.push("console: " + m.text()); });
  await page.goto(url);
  await page.waitForTimeout(500);

  // JOHN is a top-level `const` (index.template.html), a global lexical binding and NOT a
  // property of window — so test the binding, not window.JOHN.
  const booted = await page.evaluate(() => typeof JOHN === "object" && !!document.querySelector("#map .hood"));
  ok(cfg.name, "page boots (JOHN defined, map drawn)", booted);

  const scheme = await page.getAttribute("html", "data-theme");
  ok(cfg.name, `colour scheme applied`, cfg.scheme === "dark" ? scheme === "dark" : scheme !== "dark", `data-theme=${scheme}`);

  const stamp = await page.$eval(".build", el => el.textContent.trim()).catch(() => null);
  ok(cfg.name, "build stamp present", !!stamp && /^build \d{4}-\d{2}-\d{2}/.test(stamp), stamp || "missing");

  // hood count is COMPUTED from the data the page itself carries, never typed here
  const counts = await page.evaluate(() => {
    if (typeof JOHN !== "object") return null;
    const want = JOHN.districts.reduce((n, d) => n + d.wards.reduce((m, w) => m + w.hoods.length, 0), 0) + (JOHN.annex ? 1 : 0);
    return { want, got: document.querySelectorAll("#map .hood[data-hood]").length };
  });
  ok(cfg.name, "every block is drawn", counts && counts.want > 0 && counts.got === counts.want,
    counts ? `${counts.got} drawn / ${counts.want} in data` : "no data");

  for (const view of ["linear", "index", "organic"]) {
    const before = errors.length;
    const clicked = await page.click(`#viewseg button[data-view="${view}"]`, { timeout: 2000 }).then(() => true, () => false);
    await page.waitForTimeout(250);
    ok(cfg.name, `switch to ${view} view`, clicked && errors.length === before, clicked ? "" : "button not clickable");
  }

  // the injected way data is exactly the committed files: same keys, same order, same values
  const inj = await page.evaluate(() => ({
    themes: typeof window.JOHN_WAYTHEMES === "object" ? JSON.stringify(window.JOHN_WAYTHEMES) : null,
    ways: typeof window.JOHN_WAYS === "object" ? JSON.stringify(window.JOHN_WAYS) : null,
  }));
  const same = k => inj[k] !== null && inj[k] === JSON.stringify(JSON.parse(DISK[k]));
  ok(cfg.name, "way data injected verbatim from data/", same("themes") && same("ways"),
    `JOHN_WAYTHEMES ${inj.themes === null ? "missing" : same("themes") ? "=" : "≠"} themes.json, JOHN_WAYS ${inj.ways === null ? "missing" : same("ways") ? "=" : "≠"} way-types.json`);

  // the legacy theme roads were retired: no control, and nothing drawn in either view (the
  // linear view re-renders the svg, so each view is measured while it is the one shown)
  const legacyIn = async view => {
    await page.click(`#viewseg button[data-view="${view}"]`).catch(() => {});
    await page.waitForTimeout(200);
    return page.evaluate(() => document.querySelectorAll(".theme-road, .theme-road-dots, [data-road]").length);
  };
  const legacy = { ctl: await page.evaluate(() => document.querySelectorAll("#ck-life, #ck-light").length),
                   linear: await legacyIn("linear"), organic: await legacyIn("organic") };
  ok(cfg.name, "legacy theme roads are gone", legacy.ctl === 0 && legacy.linear === 0 && legacy.organic === 0,
    `controls ${legacy.ctl}, drawn organic ${legacy.organic} / linear ${legacy.linear}`);

  // The page chrome itself must never scroll sideways (this cannot see inside #indexview, which
  // has its own scroller; that gets the reachability check below).
  const docW = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth }));
  ok(cfg.name, "page chrome has no horizontal scroll", docW.sw <= docW.iw, `${docW.sw} ≤ ${docW.iw}`);

  // Chiasm bridges: hidden by default, and they follow #ck-chiasm. Guards the neighbour of the
  // legacy-road lines in applyOverlays, which a by-line-number deletion would take out. Driven
  // through the change event because #controls is display:none under 700px; what is tested is
  // the wiring, not the control's visibility. Zero chiasm elements would make "all hidden"
  // vacuous, so the opportunity count must be > 0.
  const chi = async () => page.evaluate(() => {
    const els = [...document.querySelectorAll("#map .layer-chiasm")];
    return { n: els.length, shown: els.filter(e => getComputedStyle(e).display !== "none").length };
  });
  const setChiasm = on => page.evaluate(v => {
    const el = document.getElementById("ck-chiasm");
    el.checked = v; el.dispatchEvent(new Event("change"));
  }, on);
  const c0 = await chi();
  ok(cfg.name, "chiasm bridges hidden by default", c0.n > 0 && c0.shown === 0, `${c0.shown} of ${c0.n} shown`);
  await setChiasm(true); const c1 = await chi();
  await setChiasm(false); const c2 = await chi();
  ok(cfg.name, "chiasm bridges follow #ck-chiasm both ways", c1.n > 0 && c1.shown === c1.n && c2.shown === 0,
    `on: ${c1.shown}/${c1.n} shown, off: ${c2.shown}/${c2.n}`);

  // The index view lives in #indexview (overflow:auto inside an overflow:hidden #stage), so a
  // document-level scrollWidth test can never fail. A wide table is allowed to scroll in its own
  // container; what must hold is that content wider than the view can actually be reached.
  await page.click(`#viewseg button[data-view="index"]`).catch(() => {});
  await page.waitForTimeout(200);
  const ix = await page.evaluate(() => {
    const el = document.getElementById("indexview");
    if (!el) return null;
    const ox = getComputedStyle(el).overflowX;
    return { sw: el.scrollWidth, cw: el.clientWidth, ox };
  });
  ok(cfg.name, "index view content is reachable", ix && (ix.sw <= ix.cw + 1 || /auto|scroll/.test(ix.ox)),
    ix ? `content ${ix.sw}px in ${ix.cw}px, overflow-x ${ix.ox}` : "no #indexview");
  await page.click(`#viewseg button[data-view="organic"]`).catch(() => {});
  await page.waitForTimeout(200);

  // the default page shows no theme way and dims nothing
  const dflt = await page.evaluate(() => ({ ways: document.querySelectorAll("#map .way").length,
    dim: document.querySelectorAll("#map .dimmed").length, br: document.querySelectorAll("#map .way-bridge").length,
    badges: document.querySelectorAll("#map .way-badge").length }));
  ok(cfg.name, "no ?ways= → nothing drawn, nothing dimmed", !dflt.ways && !dflt.dim && !dflt.br && !dflt.badges, JSON.stringify(dflt));
  if (shots) await page.screenshot({ path: `${shots}/default-${cfg.name}.png` });

  let bridgesMeasured = 0;
  for (const keys of FIXTURES) {
    await page.goto(url + "?ways=" + keys.join(","));
    await page.waitForTimeout(700);
    const M = await page.evaluate(measureWays, keys);
    const tag = `?ways=${keys.join(",")}`;
    for (const w of M.ways) {
      const L = `[${w.k}]`;
      if (w.missing) { ok(cfg.name, `${L} is drawn`, false, tag); continue; }
      ok(cfg.name, `${L} drawn as its data's type (${w.type})`, w.typeDrawn === w.type, `drawn ${w.typeDrawn}`);
      ok(cfg.name, `${L} width = widthPlan × scale`, Math.abs(w.sw - w.want) < 0.01, `${w.sw.toFixed(3)} vs ${w.want.toFixed(3)}`);
      ok(cfg.name, `${L} has geometry`, w.bbw > 0 && w.bbh > 0, `bbox ${w.bbw.toFixed(1)}×${w.bbh.toFixed(1)}`);
      for (const [gname, c] of Object.entries(w.con))
        ok(cfg.name, `${L} contrast on ${gname} ≥ the Way's own casing`, c.way >= c.floor - 1e-6, `${c.way.toFixed(2)} vs floor ${c.floor.toFixed(2)}`);
      ok(cfg.name, `${L} one badge per block it touches`, w.badges === w.blocks, `${w.badges} badges, ${w.blocks} blocks`);
      ok(cfg.name, `${L} drawn as a stub exactly when it has one block`, w.stub === (w.blocks === 1), `stub ${w.stub}, blocks ${w.blocks}`);
      if (!w.stub) {
        ok(cfg.name, `${L} the blocks its drawn path crosses are exactly its bridges`,
          JSON.stringify(w.crossed) === JSON.stringify(w.bridges), `crossed [${w.crossed}] bridges [${w.bridges}]`);
        ok(cfg.name, `${L} no badge of its own on a block it only bridges`, w.badgeOnBridge === 0, `${w.badgeOnBridge}`);
      }
      bridgesMeasured += w.bridges.length;
      ok(cfg.name, `${L} badge text contrast ≥ 4.5`, w.badgeContrast === null || w.badgeContrast >= 4.5,
        w.badgeContrast === null ? "no badge" : w.badgeContrast.toFixed(2));
    }
    ok(cfg.name, `${tag} dims exactly the blocks on no shown way`, M.dimmed === M.expectDim, `${M.dimmed} dimmed, ${M.expectDim} expected`);
    ok(cfg.name, `${tag} dimming never changes opacity`, M.opChanged === 0, `${M.opChanged} changed`);
    ok(cfg.name, `${tag} layer order: ways under wall/Way/blocks; bridges and badges over blocks`, M.orderOK);
    ok(cfg.name, `${tag} ways painted narrowest first`, M.ascending, `widths ${M.widths.join(",")}`);
    ok(cfg.name, `${tag} way layers never take the pointer`, M.ptOpp > 0 && M.ptBad === 0,
      M.ptOpp ? `${M.ptBad} of ${M.ptOpp} probes hit a way layer; ${M.ptHood} bridged-block probes reached the block` : "unmeasured: no probe point on the map");
    if (shots) await page.screenshot({ path: `${shots}/${keys.join("+")}-${cfg.name}.png` });
  }
  // a pinch exists in the data, so the bridge assertions must have had something to measure
  ok(cfg.name, "bridge assertions measured at least one bridge", !pinched.length || bridgesMeasured > 0,
    pinched.length ? `${bridgesMeasured} bridge(s) measured` : "no pinch in the data");
  await page.goto(url); await page.waitForTimeout(300);


  ok(cfg.name, "no page errors", errors.length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}

await b.close();
for (const u of unmeasured) console.log(`– unmeasured: ${u}`);
console.log(`  fixtures: ${FIXTURES.map(f => f.join(",")).join("  |  ")}`);
let failed = 0;
for (const c of checks) {
  if (!c.pass) failed++;
  console.log(`${c.pass ? "✓" : "✗"} [${c.cfg}] ${c.name}${c.detail ? "  (" + c.detail + ")" : ""}`);
}
if (failed) { console.error(`\n${failed} of ${checks.length} checks FAILED on ${target}`); process.exit(1); }
console.log(`\n${checks.length} checks passed on ${target} (${CONFIGS.map(c => c.name).join(", ")})`);
