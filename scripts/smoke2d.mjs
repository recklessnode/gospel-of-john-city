#!/usr/bin/env node
/* Interaction smoke test for the 2D page (index.html) — the only page smoke.mjs never covered.
   Loops over light/dark × 1440/400 unless --config is given.

     node scripts/smoke2d.mjs index.html [--config dark-400] [--shots <dir>]

   The instrument is tested before it is trusted: run it on the unbuilt template
   (`node scripts/smoke2d.mjs index.template.html`), whose __DATA__ placeholder is a syntax
   error, and it must go red. A harness that cannot say no proves nothing. */
import { chromium } from "playwright";
import { resolve } from "node:path";
import { mkdirSync } from "node:fs";

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

const url = (/^https?:/.test(target) ? target : "file://" + resolve(target));
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

  if (shots) await page.screenshot({ path: `${shots}/default-${cfg.name}.png` });
  ok(cfg.name, "no page errors", errors.length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}

await b.close();
let failed = 0;
for (const c of checks) {
  if (!c.pass) failed++;
  console.log(`${c.pass ? "✓" : "✗"} [${c.cfg}] ${c.name}${c.detail ? "  (" + c.detail + ")" : ""}`);
}
if (failed) { console.error(`\n${failed} of ${checks.length} checks FAILED on ${target}`); process.exit(1); }
console.log(`\n${checks.length} checks passed on ${target} (${CONFIGS.map(c => c.name).join(", ")})`);
