/* One home for "evaluate a renderer's DOM-free plan section in node".
   verify_parity.mjs and verify_ways.mjs both slice a source file at a marker and run the
   part above it; keeping the slicer here stops the two from drifting apart. */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const APP2D_MARKER = "/* ---------- svg helpers ---------- */";

export function upTo(file, marker) {
  const src = readFileSync(join(ROOT, file), "utf8");
  const i = src.indexOf(marker);
  if (i < 0) throw new Error(`marker not found in ${file}: ${marker}`);
  return src.slice(0, i);
}

/* The 2D map's plan, laid out exactly as the page lays it out at boot, with the theme-way
   functions that live in the same section. */
export function app2dPlan(JOHN) {
  const body = upTo("scripts/app.js", APP2D_MARKER) +
    "\n;layoutOrganic(); buildWay();" +
    "\n;return { HOODS, AX: JOHN.annex, WAYPTS, byId, ROAD_HALF, catmullSample," +
    " WAY_ROUTE, wayStops, wayObstacles, wayRaw, wayRoute, wayCrossings, wayPinches, wayFloorCap, wayStub, wayGeometry };";
  return new Function("JOHN", body)(JOHN);
}

/* The theme ways' drawing scale: the Way's own casing width in the page CSS over its plan
   width (2 × ROAD_HALF). One home — the gate, the smoke test and the draft generator all read
   it here, so none can drift from the page. */
export function wayScale(ROAD_HALF) {
  const tpl = readFileSync(join(ROOT, "index.template.html"), "utf8");
  const m = /\.way-casing\s*\{[^}]*stroke-width:\s*([\d.]+)/.exec(tpl);
  if (!m) throw new Error("cannot find the .way-casing stroke-width in index.template.html");
  return parseFloat(m[1]) / (2 * ROAD_HALF);
}
