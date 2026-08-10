#!/usr/bin/env node
/* Headless QA screenshots for the 3D pages, at the walkthrough positions from
   docs/phase2-ancient-city.md. Drives the real UI controls (no test hooks in
   the app), so what it captures is what a visitor sees.

   node scripts/shots.mjs city3d.html out/canvas [--dark] */

import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const page_ = process.argv[2] || "city3d.html";
const outDir = process.argv[3] || "shots";
const dark = process.argv.includes("--dark");
const WALK_T = [0.03, 0.18, 0.40, 0.62, 0.80, 0.97];

mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
    "--ignore-gpu-blocklist", "--enable-webgl"],
});
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  colorScheme: dark ? "dark" : "light",
});
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", e => errors.push(String(e)));
page.on("console", m => { if (m.type() === "error") errors.push("console: " + m.text()); });

await page.goto("file://" + resolve(page_));
await page.waitForTimeout(1200);

const tag = dark ? "dark" : "light";
const shot = name => page.screenshot({ path: `${outDir}/${name}-${tag}.png` });

await shot("orbit-default");

// top-down: drag downward to push the pitch to its clamp, then back
await page.mouse.move(720, 500);
await page.mouse.down();
for (let i = 0; i < 12; i++) await page.mouse.move(720, 500 + i * 25);
await page.mouse.up();
await page.waitForTimeout(300);
await shot("orbit-topdown");
await page.reload();
await page.waitForTimeout(1000);

// walk the Way
await page.click('#modeseg button[data-mode="walk"]');
await page.waitForTimeout(400);
for (const t of WALK_T) {
  await page.$eval("#walkpos", (el, v) => {
    el.value = String(Math.round(v * 1000));
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }, t);
  await page.waitForTimeout(350);
  await shot(`walk-${String(Math.round(t * 100)).padStart(2, "0")}`);
}

await browser.close();
if (errors.length) { console.error("page errors:\n" + errors.join("\n")); process.exit(1); }
console.log(`shots written to ${outDir}/ (${tag})`);
