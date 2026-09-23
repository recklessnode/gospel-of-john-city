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
import { app2dPlan, wayScale } from "./plan_slice.mjs";

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
const SCALE = wayScale(PLAN.ROAD_HALF);
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
    // visibility floor: no fainter than the Johannine Way's normal casing; primacy ceiling: the
    // Johannine Way as DRAWN now (its lifted edge) must out-contrast every layer of every way
    const jw = col(getComputedStyle(document.querySelector("#map .way-casing")).stroke);
    const con = Object.fromEntries(Object.entries(grounds).map(([n, gd]) => [n, { way: ratio(over(oc, gd), gd), floor: ratio(casing, gd),
      jw: ratio(jw, gd), loudest: Math.max(...[...g.querySelectorAll("path")].map(e => ratio(over(col(getComputedStyle(e).stroke), gd), gd))) }]));
    const roadTok = [css("--road-casing"), css("--road-fill")].map(c => JSON.stringify(col(c)));
    const usesRoadToken = [...g.querySelectorAll("path")].some(e => roadTok.includes(JSON.stringify(col(getComputedStyle(e).stroke))));
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
    const u1px = parseFloat(document.getElementById("map").style.getPropertyValue("--u1px")) || 1, cap = +g.dataset.cap;
    const want = TY(t.way).widthPlan * scale, wantDrawn = Math.min(Math.max(want, u1px), want + cap);
    const subNote = [...document.querySelectorAll("#waykey .wk-floor")].some(e => e.textContent.includes("still thinner"));
    return { k, type: t.way, typeDrawn: [...g.classList].find(c => c.startsWith("way-")).slice(4), sw, want, wantDrawn, u1px, cap,
      onScreen: sw / u1px, subNote,
      bbw: bb.width, bbh: bb.height, len: outer.getTotalLength(), con, badges: document.querySelectorAll(`#map .way-badge[data-way="${k}"]`).length,
      blocks: t.blocks.length, stub, crossed: crossed.sort(), bridges: bridges.sort(), badgeOnBridge, badgeContrast, usesRoadToken };
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
  // badges on one block never overlap on screen (centres ≥ one disc apart), and paint above labels
  const byBlock = new Map();
  for (const b of document.querySelectorAll("#map .way-badge")) {
    const r = b.querySelector("circle").getBoundingClientRect();
    if (!byBlock.has(b.dataset.badge)) byBlock.set(b.dataset.badge, []);
    byBlock.get(b.dataset.badge).push({ x: r.left + r.width / 2, y: r.top + r.height / 2, d: r.width });
  }
  let badgePairs = 0, badgeClash = [];
  for (const [id, list] of byBlock) for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    badgePairs++;
    if (Math.hypot(list[i].x - list[j].x, list[i].y - list[j].y) < Math.min(list[i].d, list[j].d) - 0.5) badgeClash.push(id);
  }
  const badgesOverLabels = before(document.querySelector("#map .layer-labels"), document.querySelector("#map .layer-way-badges"));
  // a dimmed block must recede: lower contrast on the page than every block that is on a way
  let dimMax = 0, litMin = Infinity;
  for (const e of hoods) {
    if (e.dataset.hood === "annex") continue;                 // its own 0.55 opacity is its meaning
    const r = ratio(col(getComputedStyle(e).fill), page);
    if (e.classList.contains("dimmed")) dimMax = Math.max(dimMax, r); else litMin = Math.min(litMin, r);
  }
  probeEl.remove();
  return { dimMax, litMin, badgePairs, badgeClash, badgesOverLabels, ways, dimmed: dimmed.length, expectDim: hoods.filter(e => !union.has(e.dataset.hood)).length, opChanged, orderOK,
    widths, ascending: widths.every((v, i) => !i || widths[i - 1] <= v), ptOpp, ptBad, ptHood };
}

/* Runs IN THE PAGE: is every shown block on screen, and clear of the key and the controls? */
function measureFit(keys) {
  const blocks = new Set(keys.flatMap(k => window.JOHN_WAYTHEMES.themes.find(x => x.key === k).blocks));
  const mw = document.getElementById("mapwrap").getBoundingClientRect(), key = document.getElementById("waykey");
  const ctl = document.getElementById("controls");
  const covers = [key && !key.hidden ? key.getBoundingClientRect() : null,
    ctl && getComputedStyle(ctl).display !== "none" && !ctl.classList.contains("hidden") ? ctl.getBoundingClientRect() : null].filter(r => r && r.width);
  const hits = (a, b) => !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top);
  const bad = [];
  let opp = 0;
  for (const c of document.querySelectorAll("#map circle.hood[data-hood]")) {
    if (!blocks.has(c.dataset.hood)) continue;
    opp++;
    const r = c.getBoundingClientRect();
    const inside = r.left >= mw.left - 0.5 && r.right <= mw.right + 0.5 && r.top >= mw.top - 0.5 && r.bottom <= mw.bottom + 0.5 &&
      r.right <= innerWidth + 0.5 && r.bottom <= innerHeight + 0.5;
    if (!inside || covers.some(k => hits(r, k))) bad.push(c.dataset.hood);
  }
  const svg = document.getElementById("map"), v = svg.viewBox.baseVal;
  return { opp, bad, vbAspect: v.height / v.width, svgAspect: svg.clientHeight / svg.clientWidth };
}

/* Runs IN THE PAGE: reads the way key back and recomputes what it should say. */
function measureKey(keys) {
  const key = document.getElementById("waykey"), status = window.JOHN_WAYS.status, types = window.JOHN_WAYS.types;
  const band = k => { const i = types.findIndex(t => t.key === k), lo = types[i].minVerses;
    return i === 0 ? `≥ ${lo}` : i === types.length - 1 ? `≤ ${types[i - 1].minVerses - 1}` : `${lo}–${types[i - 1].minVerses - 1}`; };
  const rows = [...key.querySelectorAll(".wk-row")].map(r => {
    const k = r.dataset.way, t = window.JOHN_WAYTHEMES.themes.find(x => x.key === k);
    const facts = r.querySelector(".wk-facts").textContent, m = /\(band ([^)]*)\)/.exec(facts);
    const pinchIds = [...new Set([...r.querySelectorAll("[data-pinch]")].flatMap(e => e.dataset.pinch.split("|")))].sort();
    const bridgeIds = [...document.querySelectorAll(`#map .way-bridge[data-way="${k}"]`)].map(e => e.dataset.bridge).sort();
    const x = r.querySelector(".wk-x");
    // shared-block notes must equal the intersection computed from the two block lists
    const sharedOK = keys.filter(o => o !== k).every(o => {
      const both = t.blocks.filter(b => window.JOHN_WAYTHEMES.themes.find(x => x.key === o).blocks.includes(b)).sort().join(",");
      const note = r.querySelector(`.wk-shared[data-with="${o}"]`);
      return both ? !!note && note.dataset.blocks === both : !note;
    });
    return { k, label: t.label, sharedOK, noDistance: !/\d+(\.\d+)? apart/.test(r.textContent),
      est: facts.includes("(est.)"), bandShown: m ? m[1] : null, bandWant: band(t.way),
      stubNote: !!r.querySelector(".wk-stub"), isStub: !!document.querySelector(`#map g.way[data-way="${k}"][data-stub]`),
      pinchIds, bridgeIds, xName: x ? (x.getAttribute("aria-label") || x.textContent) : "" };
  });
  // case-insensitive: "Proposed" typed anywhere is the same second home for the status
  const text = document.body.innerText.toLowerCase();
  const count = (h, n) => h.split(n.toLowerCase()).length - 1;
  const proposedOutside = count(text, "proposed") - count(text, status) * count(status, "proposed");
  const statusEl = key.querySelector(".wk-status"), firstRow = key.querySelector(".wk-row");
  const kb = key.getBoundingClientRect(), zb = document.getElementById("zoomctl").getBoundingClientRect();
  const hits = (a, b) => a.width && b.width && !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top);
  const caveats = Object.entries(WAY_TEXT).filter(([n]) => n !== "statusPrefix").filter(([, v]) => !key.textContent.includes(v)).map(([n]) => n);
  return { caveatsMissing: caveats, visible: !key.hidden && kb.width > 0, role: key.getAttribute("role"), hasStatus: key.textContent.includes(status),
    statusFirst: !!(statusEl && firstRow && (statusEl.compareDocumentPosition(firstRow) & Node.DOCUMENT_POSITION_FOLLOWING)),
    rowKeys: rows.map(r => r.k), rows, proposedOutside,
    hintDisplay: getComputedStyle(document.getElementById("hint")).display,
    inView: kb.left >= 0 && kb.top >= 0 && kb.right <= innerWidth + 0.5 && kb.bottom <= innerHeight + 0.5, hitsZoom: hits(kb, zb) };
}

const b = await chromium.launch();
const checks = [];
const ok = (cfg, name, pass, detail = "") => checks.push({ cfg, name, pass: !!pass, detail });

for (const cfg of CONFIGS) {
 try {
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
  const dvb = await page.evaluate(() => document.getElementById("map").getAttribute("viewBox"));
  ok(cfg.name, "no ?ways= → the default view, not a fit", dvb === "0 0 1200 1000", dvb);
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
      ok(cfg.name, `${L} width = widthPlan × scale, floored to 1px within its clearance`, Math.abs(w.sw - w.wantDrawn) < 0.01,
        `${w.sw.toFixed(3)} vs ${w.wantDrawn.toFixed(3)} (plan ${w.want.toFixed(3)}, 1px = ${w.u1px.toFixed(3)}, cap +${w.cap})`);
      ok(cfg.name, `${L} at least a screen pixel wide, or the key says why not`, w.onScreen >= 0.999 || w.subNote,   // 0.1%: stroke-width is written at 3 decimals, --u1px at 4
        `${w.onScreen.toFixed(2)}px on screen`);
      // length, not bbox area: a straight stub (e.g. a vertical dash) has a zero-width bbox
      ok(cfg.name, `${L} has geometry`, w.len > 0, `length ${w.len.toFixed(1)}, bbox ${w.bbw.toFixed(1)}×${w.bbh.toFixed(1)}`);
      for (const [gname, c] of Object.entries(w.con)) {
        ok(cfg.name, `${L} contrast on ${gname} ≥ the Way's own casing`, c.way >= c.floor - 1e-6, `${c.way.toFixed(2)} vs floor ${c.floor.toFixed(2)}`);
        ok(cfg.name, `${L} the Johannine Way out-contrasts it on ${gname}`, c.jw > c.loudest, `JW ${c.jw.toFixed(2)} vs loudest layer ${c.loudest.toFixed(2)}`);
      }
      ok(cfg.name, `${L} uses none of the Johannine Way's road tokens`, !w.usesRoadToken);
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
    ok(cfg.name, `${tag} dimmed blocks recede below every block on a way`, M.dimMax < M.litMin,
      `dimmed ≤ ${M.dimMax.toFixed(2)}:1, lit ≥ ${M.litMin.toFixed(2)}:1 on the page`);
    ok(cfg.name, `${tag} layer order: ways under wall/Way/blocks; bridges and badges over blocks`, M.orderOK);
    ok(cfg.name, `${tag} ways painted narrowest first`, M.ascending, `widths ${M.widths.join(",")}`);
    ok(cfg.name, `${tag} no two badges on one block overlap on screen`, M.badgeClash.length === 0,
      M.badgePairs ? `${M.badgePairs} pair(s) checked; clashing at [${[...new Set(M.badgeClash)]}]` : "no block with two badges here");
    ok(cfg.name, `${tag} badges paint above the labels`, M.badgesOverLabels);
    ok(cfg.name, `${tag} way layers never take the pointer`, M.ptOpp > 0 && M.ptBad === 0,
      M.ptOpp ? `${M.ptBad} of ${M.ptOpp} probes hit a way layer; ${M.ptHood} bridged-block probes reached the block` : "unmeasured: no probe point on the map");
    const F = await page.evaluate(measureFit, keys);
    ok(cfg.name, `${tag} fit: every shown block on screen, clear of the key and the controls`, F.opp > 0 && F.bad.length === 0,
      F.opp ? `${F.opp} blocks; off or covered: [${F.bad.join(",")}]` : "unmeasured: no shown block");
    ok(cfg.name, `${tag} fit keeps the svg's aspect (no letterbox)`, Math.abs(F.vbAspect - F.svgAspect) < 1e-3,
      `viewBox ${F.vbAspect.toFixed(4)} svg ${F.svgAspect.toFixed(4)}`);
    await page.click("#z-in", { timeout: 2000 }).catch(() => {}); await page.waitForTimeout(150);
    const Z = await page.evaluate(() => { const v = document.getElementById("map").viewBox.baseVal; return v.height / v.width; });
    ok(cfg.name, `${tag} zooming after a fit keeps its aspect`, Math.abs(Z - F.vbAspect) < 1e-3, `${F.vbAspect.toFixed(4)} → ${Z.toFixed(4)}`);
    await page.click("#z-out", { timeout: 2000 }).catch(() => {}); await page.waitForTimeout(150);
    const K = await page.evaluate(measureKey, keys);
    ok(cfg.name, `${tag} key is shown, as a labelled region`, K.visible && K.role === "region", `visible ${K.visible}, role ${K.role}`);
    ok(cfg.name, `${tag} key states the status verbatim (from the page's own data)`, K.hasStatus);
    ok(cfg.name, `${tag} key states the status BEFORE any way row`, K.statusFirst);
    ok(cfg.name, `${tag} key states every caveat`, K.caveatsMissing.length === 0, `missing: [${K.caveatsMissing}]`);
    ok(cfg.name, `${tag} key: one row per shown way, in order`, JSON.stringify(K.rowKeys) === JSON.stringify(keys), `rows [${K.rowKeys}]`);
    for (const r of K.rows) {
      const L = `[${r.k}]`;
      ok(cfg.name, `${L} key row labels the Greek count an estimate`, r.est);
      ok(cfg.name, `${L} key row's band = the range the types' floors give`, r.bandShown === r.bandWant, `shown "${r.bandShown}", want "${r.bandWant}"`);
      ok(cfg.name, `${L} key row notes a stub exactly when drawn as one`, r.stubNote === r.isStub, `note ${r.stubNote}, stub ${r.isStub}`);
      ok(cfg.name, `${L} key row names exactly the blocks drawn as bridges`, JSON.stringify(r.pinchIds) === JSON.stringify(r.bridgeIds), `named [${r.pinchIds}] bridged [${r.bridgeIds}]`);
      ok(cfg.name, `${L} remove button names the theme`, r.xName.includes(r.label), `"${r.xName}"`);
      ok(cfg.name, `${L} shared-block notes match the block lists`, r.sharedOK);
      ok(cfg.name, `${L} no unitless distances in the key`, r.noDistance);
    }
    ok(cfg.name, `${tag} "proposed" appears only inside the status string`, K.proposedOutside === 0, `${K.proposedOutside} stray`);
    ok(cfg.name, `${tag} the hint yields to the key`, K.hintDisplay === "none", `hint display ${K.hintDisplay}`);
    ok(cfg.name, `${tag} key inside the viewport, clear of the zoom buttons`, K.inView && !K.hitsZoom, `in view ${K.inView}, overlaps zoom ${K.hitsZoom}`);
    if (shots) await page.screenshot({ path: `${shots}/${keys.join("+")}-${cfg.name}.png` });
  }

  // key behaviour: rejects are shown as inert text, the cap holds, × edits the URL, views hide it
  {
    const tops = JSON.parse(DISK.themes).themes.filter(t => !t.parent), child = JSON.parse(DISK.themes).themes.find(t => t.parent);
    const k0 = FIXTURES[0][0], k1 = FIXTURES[0][1] || tops.find(t => t.key !== k0).key;
    const load = async q => { await page.goto(url + "?ways=" + q); await page.waitForTimeout(500); };
    const drawn = () => page.evaluate(() => [...document.querySelectorAll("#map .way")].map(e => e.dataset.way));
    const rejects = () => page.evaluate(() => [...document.querySelectorAll("#waykey .wk-reject")].map(e => e.textContent));
    await load(`nope,${k0}`);
    const r1 = await rejects(), d1 = await drawn();
    ok(cfg.name, "unknown key: the known one is drawn, the unknown one is named", d1.length === 1 && d1[0] === k0 && r1.some(t => t.includes("nope")), `drawn [${d1}] notes ${JSON.stringify(r1)}`);
    await load(`%3Cb%3Ex%3C%2Fb%3E,${k0}`);
    const inj = await page.evaluate(() => ({ b: document.querySelectorAll("#waykey b").length,
      text: [...document.querySelectorAll("#waykey .wk-reject")].map(e => e.textContent).join(" ") }));
    ok(cfg.name, "a crafted key is shown as text, never as markup", inj.b === 0 && inj.text.includes("<b>"), `<b> elements ${inj.b}; note "${inj.text}"`);
    await load(`${k0},${k0}`);
    ok(cfg.name, "a duplicate key draws once and is noted", (await drawn()).length === 1 && (await rejects()).some(t => t.includes("twice")));
    await load(tops.slice(0, 5).map(t => t.key).join(","));
    ok(cfg.name, "more than the cap: the cap is drawn and the rest is noted", (await drawn()).length === 4 && (await rejects()).some(t => t.includes("At most")));
    await load(`${child.key},${k0}`);
    ok(cfg.name, "a sub-entry is not drawn; the note names its parent", !(await drawn()).includes(child.key) &&
      (await rejects()).some(t => t.includes(tops.find(t => t.key === child.parent).label)));
    await load(`${k0},${k1}`);
    const before = (await drawn()).length;
    const clickedX = await page.click(`#waykey .wk-row[data-way="${k0}"] .wk-x`, { timeout: 2000 }).then(() => true, () => false);
    ok(cfg.name, "× button present and clickable", clickedX);
    await page.waitForTimeout(400);
    const after = await drawn();
    const inUrl = await page.evaluate(() => (new URLSearchParams(location.search).get("ways") || "").split(",").filter(Boolean));
    ok(cfg.name, "× removes that way from the map and from the URL", after.length === before - 1 && !after.includes(k0) &&
      JSON.stringify(inUrl) === JSON.stringify(after.slice().sort((a, b) => [k0, k1].indexOf(a) - [k0, k1].indexOf(b))), `map [${after}] url [${inUrl}]`);
    for (const v of ["linear", "index"]) {
      await page.click(`#viewseg button[data-view="${v}"]`, { timeout: 2000 }).catch(() => {}); await page.waitForTimeout(250);
      ok(cfg.name, `key hidden in the ${v} view`, await page.evaluate(() => document.getElementById("waykey").hidden));
    }
    await page.click(`#viewseg button[data-view="organic"]`, { timeout: 2000 }).catch(() => {}); await page.waitForTimeout(400);
    ok(cfg.name, "key back on the map view", await page.evaluate(() => !document.getElementById("waykey").hidden));
  }
  // the index view's Ways table: complete, operable by keyboard, capped, and the phone path works
  {
    await page.goto(url); await page.waitForTimeout(400);
    await page.click('#viewseg button[data-view="index"]', { timeout: 2000 }).catch(() => {}); await page.waitForTimeout(300);
    const T = await page.evaluate(() => {
      const all = window.JOHN_WAYTHEMES.themes;
      const rows = document.querySelectorAll("#ways-index tr.way-row, #ways-index tr.way-child").length;
      const toggles = [...document.querySelectorAll("#ways-index .way-toggle")];
      const iv = document.getElementById("indexview").getBoundingClientRect();
      const t0 = toggles[0] && toggles[0].getBoundingClientRect();
      const withOpen = document.querySelectorAll("#ways-index [data-open]").length;
      const sec = document.getElementById("ways-index");
      const firstInView = !!(sec && document.getElementById("indexview").firstElementChild === sec);
      return { rows, want: all.length, toggles: toggles.length, wantT: all.filter(t => t.way).length,
        inX: toggles.every(b => { const r = b.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth; }),
        firstOnScreen: !!t0 && t0.top >= iv.top && t0.bottom <= Math.min(iv.bottom, innerHeight), withOpen, firstInView,
        names: toggles.every(b => /^Show .+ on map$/.test(b.getAttribute("aria-label") || "")) };
    });
    ok(cfg.name, "Ways table: one row per theme and sub-entry (from the data)", T.rows === T.want, `${T.rows} rows, ${T.want} in data`);
    ok(cfg.name, "Ways table: one toggle per way (sub-entries get none)", T.toggles === T.wantT, `${T.toggles} toggles, ${T.wantT} ways`);
    ok(cfg.name, "Ways table comes first in the index view", T.firstInView);
    ok(cfg.name, "Ways toggles never open a block (no data-open)", T.withOpen === 0, `${T.withOpen}`);
    ok(cfg.name, "every toggle has an accessible name", T.names);
    ok(cfg.name, "every toggle is within the screen width", T.inX);
    ok(cfg.name, "the first toggle is on the first screen, no scrolling", T.firstOnScreen);
    // null subject for the width check: a wide cell BEFORE the toggles must push them off screen
    const nullW = await page.evaluate(() => {
      const tr = document.querySelector("#ways-index tr.way-row"), td = document.createElement("td");
      td.style.minWidth = "1500px"; td.textContent = "x"; tr.prepend(td);
      const b = tr.querySelector(".way-toggle").getBoundingClientRect(), off = !(b.left >= 0 && b.right <= innerWidth);
      td.remove(); return off;
    });
    ok(cfg.name, "…and that width check can fail (a wide cell pushes a toggle off screen)", nullW);
    const tops = JSON.parse(DISK.themes).themes.filter(t => !t.parent).map(t => t.key);
    // keyboard: focus a toggle and press Space
    await page.focus(`#ways-index .way-toggle[data-way="${tops[0]}"]`).catch(() => {});
    await page.keyboard.press("Space"); await page.waitForTimeout(150);
    const pressed = await page.evaluate(k => document.querySelector(`#ways-index .way-toggle[data-way="${k}"]`).getAttribute("aria-pressed"), tops[0]);
    ok(cfg.name, "Space on a focused toggle adds that way (aria-pressed)", pressed === "true", `aria-pressed ${pressed}`);
    for (const k of tops.slice(1, 4)) await page.click(`#ways-index .way-toggle[data-way="${k}"]`, { timeout: 2000 }).catch(() => {});
    await page.click(`#ways-index .way-toggle[data-way="${tops[4]}"]`, { timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(150);
    const cap = await page.evaluate(k => ({ live: document.querySelector("#ways-index .ways-live").textContent,
      p5: document.querySelector(`#ways-index .way-toggle[data-way="${k}"]`).getAttribute("aria-pressed") }), tops[4]);
    ok(cfg.name, "a fifth toggle is refused, with a visible reason", cap.p5 === "false" && /At most/.test(cap.live), `"${cap.live}"`);
    // the phone path: index → toggles → Show → the map, with the key up and the hint gone
    await page.click("#ways-show", { timeout: 2000 }).catch(() => {}); await page.waitForTimeout(700);
    const P = await page.evaluate(() => {
      const key = document.getElementById("waykey"), kb = key.getBoundingClientRect();
      const hits = (a, b) => a.width && b.width && !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top);
      return { ways: [...document.querySelectorAll("#map .way")].map(e => e.dataset.way),
        url: (new URLSearchParams(location.search).get("ways") || "").split(",").filter(Boolean),
        keyShown: !key.hidden && kb.width > 0, hint: getComputedStyle(document.getElementById("hint")).display,
        clear: !hits(kb, document.getElementById("zoomctl").getBoundingClientRect()),
        inView: kb.left >= 0 && kb.right <= innerWidth + 0.5 && kb.bottom <= innerHeight + 0.5 };
    });
    const want = tops.slice(0, 4);
    ok(cfg.name, "Show on map: the picked ways are drawn, in order, and in the URL",
      JSON.stringify(P.ways.slice().sort()) === JSON.stringify(want.slice().sort()) && JSON.stringify(P.url) === JSON.stringify(want),
      `map [${P.ways}] url [${P.url}]`);
    ok(cfg.name, "after the phone path the key is up, in view, clear of the zoom buttons", P.keyShown && P.inView && P.clear);
    ok(cfg.name, "after the phone path the hint has yielded", P.hint === "none", `hint ${P.hint}`);
  }

  // a pinch exists in the data, so the bridge assertions must have had something to measure
  ok(cfg.name, "bridge assertions measured at least one bridge", !pinched.length || bridgesMeasured > 0,
    pinched.length ? `${bridgesMeasured} bridge(s) measured` : "no pinch in the data");
  await page.goto(url); await page.waitForTimeout(300);


  ok(cfg.name, "no page errors", errors.length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
 } catch (e) {
  // a failure keeps its evidence: record it and keep every result already collected
  ok(cfg.name, "harness ran to completion", false, String(e && e.message || e).split("\n")[0]);
 }
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
