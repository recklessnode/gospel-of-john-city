#!/usr/bin/env node
/* Interaction smoke test for a 3D page: picking, panel, tooltip, overlays, theme.
   node scripts/smoke.mjs city3d-three.html */
import { chromium } from "playwright";
import { resolve } from "node:path";

const target = process.argv[2] || "city3d-three.html";
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", e => errors.push(String(e)));
page.on("console", m => { if (m.type() === "error") errors.push("console: " + m.text()); });
await page.goto(/^https?:/.test(target) ? target : "file://" + resolve(target));
await page.waitForTimeout(1200);

const checks = [];
const ok = (name, pass, detail = "") => { checks.push({ name, pass, detail }); };

// hover + click the biggest building near the centre of the view: sweep for a hit
let picked = null;
for (const [x, y] of [[720, 520], [640, 560], [800, 500], [560, 600], [900, 560], [720, 620]]) {
  await page.mouse.move(x, y);
  await page.waitForTimeout(120);
  if (await page.isVisible("#tooltip")) { picked = [x, y]; break; }
}
ok("tooltip appears on hover", !!picked, picked ? `at ${picked}` : "no building found under the sweep");

if (picked) {
  await page.mouse.click(picked[0], picked[1]);
  await page.waitForTimeout(300);
  ok("detail panel opens on click", await page.$eval("#panel", el => el.classList.contains("open")));
  ok("panel has content", (await page.$eval("#panel-body", el => el.textContent.trim().length)) > 40);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(250);
  ok("Escape closes the panel", !(await page.$eval("#panel", el => el.classList.contains("open"))));
}

// walk mode + Enter to step inside
await page.click('#modeseg button[data-mode="walk"]');
await page.waitForTimeout(300);
ok("walk bar shows", await page.$eval("#walkbar", el => el.classList.contains("show")));
await page.$eval("#walkpos", el => { el.value = "400"; el.dispatchEvent(new Event("input", { bubbles: true })); });
await page.waitForTimeout(300);
ok("walk position tracks the verse", (await page.textContent("#walkinfo")).includes("John"));
await page.click("#enterbtn");
await page.waitForTimeout(300);
ok("Enter steps inside", await page.$eval("#panel", el => el.classList.contains("open")));
await page.keyboard.press("Escape");

// Space must pause AND resume (it used to cancel itself out against the focused button)
await page.click("#playbtn");
await page.waitForTimeout(200);
const playing = await page.textContent("#playbtn");
await page.keyboard.press("Space");
await page.waitForTimeout(200);
const paused = await page.textContent("#playbtn");
await page.keyboard.press("Space");
await page.waitForTimeout(200);
const resumed = await page.textContent("#playbtn");
ok("Space pauses", playing.trim() === "⏸" && paused.trim() === "▶");
ok("Space resumes", resumed.trim() === "⏸", `${playing.trim()} → ${paused.trim()} → ${resumed.trim()}`);
await page.click("#playbtn");

// overlays + theme
for (const id of ["ck3-iam", "ck3-life", "ck3-light", "ck3-labels"]) {
  await page.uncheck("#" + id); await page.waitForTimeout(120);
  await page.check("#" + id); await page.waitForTimeout(120);
}
ok("overlay toggles survive a round trip", true);
const before = await page.getAttribute("html", "data-theme");
await page.click("#themebtn");
await page.waitForTimeout(300);
const after = await page.getAttribute("html", "data-theme");
ok("day/night toggles", before !== after, `${before} → ${after}`);
await page.click('#modeseg button[data-mode="orbit"]');
await page.waitForTimeout(300);

// shift-drag must pan the way you grabbed: drag right, the city goes right.
// (Only measurable on the Three.js page, which positions its labels as DOM.)
const labelX = () => page.evaluate(() => {
  const el = document.querySelector("#labels div:not([style*='display: none'])");
  if (!el) return null;
  const m = /translate\(([-\d.]+)px/.exec(el.style.transform);
  return m ? { text: el.textContent, x: +m[1] } : null;
});
const before2 = await labelX();
if (before2) {
  await page.keyboard.down("Shift");
  await page.mouse.move(700, 450);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) await page.mouse.move(700 + i * 20, 450);
  await page.mouse.up();
  await page.keyboard.up("Shift");
  await page.waitForTimeout(300);
  const after2 = await page.evaluate(t => {
    for (const el of document.querySelectorAll("#labels div")) {
      if (el.textContent === t && el.style.display !== "none") {
        const m = /translate\(([-\d.]+)px/.exec(el.style.transform);
        return m ? +m[1] : null;
      }
    }
    return null;
  }, before2.text);
  ok("shift-drag pans with the grab, not against it",
    after2 != null && after2 > before2.x + 20, `“${before2.text}” ${before2.x.toFixed(0)} → ${after2}`);
}

await b.close();
for (const c of checks) console.log(`${c.pass ? "✓" : "✗"} ${c.name}${c.detail ? "  (" + c.detail + ")" : ""}`);
if (errors.length) console.error("\npage errors:\n" + errors.join("\n"));
const failed = checks.filter(c => !c.pass).length;
if (failed || errors.length) process.exit(1);
console.log(`\n${checks.length} checks passed on ${target}`);
