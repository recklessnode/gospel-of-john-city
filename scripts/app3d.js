/* ============ The Gospel of John as a City — 3D view ============
   Dependency-free Canvas renderer: perspective projection + painter's
   algorithm. World plan coordinates reuse the 2D map's layout exactly. */
"use strict";

/* ---------- data prep (same as 2D) ---------- */
const TOTAL = JOHN.totalVerses;
const HOODS = [], WARDS = [], DISTRICTS = JOHN.districts;
DISTRICTS.forEach(d => {
  d.wards.forEach(w => {
    w.district = d; WARDS.push(w);
    w.hoods.forEach(h => { h.ward = w; h.district = d; HOODS.push(h); });
  });
});
const byId = {}; HOODS.forEach(h => byId[h.id] = h);
const MAXG = Math.max(...HOODS.map(h => h.greek || 0));
function fmt(n) { return n == null ? "—" : n.toLocaleString("en-US"); }
function rnd(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

/* ---------- plan layout (identical constants to app.js) ---------- */
const W2 = 1200, CX = 585, CY = 505;
function wayPoint(t, r) {
  const phi = (84 + 258 * t) * Math.PI / 180;
  return [CX + r * Math.cos(phi), CY - r * Math.sin(phi)];
}
function convexHull(pts) {
  const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [], upper = [];
  for (const pt of p) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], pt) <= 0) lower.pop(); lower.push(pt); }
  for (let i = p.length - 1; i >= 0; i--) { const pt = p[i]; while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], pt) <= 0) upper.pop(); upper.push(pt); }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}
function layoutPlan() {
  const BASE_R = 315;
  HOODS.forEach((h, i) => {
    const t = h.mid / TOTAL;
    let r = BASE_R + ((i % 2 === 0) ? -1 : 1) * (42 + rnd(i) * 26);
    if (h.district.outside) r = 535 + rnd(i) * 18;
    const [x, y] = wayPoint(t, r);
    h.r = Math.max(7, 1.35 * Math.sqrt(h.greek || 25));
    h.x = h.tx = x; h.y = h.ty = y;
  });
  const AX = JOHN.annex;
  { const [x, y] = wayPoint(AX.mid / TOTAL, 470); AX.x = AX.tx = x; AX.y = AX.ty = y; AX.r = Math.max(7, 1.35 * Math.sqrt(AX.greek)); }
  const all = HOODS.concat([AX]);
  for (let it = 0; it < 220; it++) {
    for (let a = 0; a < all.length; a++) for (let b = a + 1; b < all.length; b++) {
      const A = all[a], B = all[b];
      const dx = B.x - A.x, dy = B.y - A.y;
      const d = Math.hypot(dx, dy) || 0.01, min = A.r + B.r + 5;
      if (d < min) {
        const push = (min - d) / 2, ux = dx / d, uy = dy / d;
        A.x -= ux * push; A.y -= uy * push; B.x += ux * push; B.y += uy * push;
      }
    }
    all.forEach(h => { h.x += (h.tx - h.x) * 0.02; h.y += (h.ty - h.y) * 0.02; });
  }
  {
    const at = AX.mid / TOTAL, aphi = (84 + 258 * at) * Math.PI / 180;
    let maxr = 0;
    HOODS.forEach(h => {
      if (h.district.outside) return;
      const hphi = Math.atan2(-(h.y - CY), h.x - CX);
      let dphi = Math.abs(hphi - aphi);
      if (dphi > Math.PI) dphi = 2 * Math.PI - dphi;
      if (dphi < 0.5) maxr = Math.max(maxr, Math.hypot(h.x - CX, h.y - CY) + h.r);
    });
    const [ax, ay] = wayPoint(at, maxr + 88);
    AX.x = ax; AX.y = ay;
  }
  WARDS.forEach(w => {
    w.cx = w.hoods.reduce((s, h) => s + h.x, 0) / w.hoods.length;
    w.cy = w.hoods.reduce((s, h) => s + h.y, 0) / w.hoods.length;
  });
}
layoutPlan();
const AX = JOHN.annex;

/* heights */
const HGT = g => 10 + (g || 12) / MAXG * 115;
HOODS.forEach(h => h.h = HGT(h.greek));
AX.h = HGT(AX.greek);

/* the Way as a dense sampled polyline (catmull-rom through ward centers) */
function catmullSample(pts, per) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let s = 0; s < per; s++) {
      const t = s / per, t2 = t * t, t3 = t2 * t;
      out.push([
        0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}
const ordered = WARDS.slice().sort((a, b) => a.mid - b.mid);
/* The entrance runs in on a radial line so the wall stretch is straight, and
   ward control points are held to a band around the ring — the single-hood
   Cosmic Poem ward used to sit 46 units inside it and hairpinned the road.
   Identical to src/plan.js; verify_parity.mjs holds them together. */
const T_IN = -0.008;
const gatePt = wayPoint(T_IN, 462);
const portPt = wayPoint(1.028, 545);
const ringPt = w => {
  if (w.district.outside) return [w.cx, w.cy];
  const dx = w.cx - CX, dy = w.cy - CY, r = Math.hypot(dx, dy) || 1;
  const clamped = Math.max(315 - 25, Math.min(315 + 25, r));
  return [CX + dx / r * clamped, CY + dy / r * clamped];
};
const wayPts = [wayPoint(-0.036, 575),
                wayPoint(T_IN, 500), gatePt, wayPoint(T_IN, 415)]
  .concat(ordered.map(ringPt), [portPt]);
const WAY = catmullSample(wayPts, 24);           // ~350 points
// verse value along the way: gate = verse 1, port = verse 879 (linear by arc length)
const wayLen = []; let acc = 0;
for (let i = 0; i < WAY.length; i++) {
  if (i) acc += Math.hypot(WAY[i][0] - WAY[i - 1][0], WAY[i][1] - WAY[i - 1][1]);
  wayLen.push(acc);
}
const wayTotal = acc;
function wayAt(t) { // t in [0,1] by arc length -> {x, y, dirx, diry}
  const target = t * wayTotal;
  let lo = 0, hi = WAY.length - 1;
  while (lo < hi) { const m = (lo + hi) >> 1; if (wayLen[m] < target) lo = m + 1; else hi = m; }
  const i = Math.max(1, lo);
  const seg = wayLen[i] - wayLen[i - 1] || 1;
  const f = (target - wayLen[i - 1]) / seg;
  const x = WAY[i - 1][0] + (WAY[i][0] - WAY[i - 1][0]) * f;
  const y = WAY[i - 1][1] + (WAY[i][1] - WAY[i - 1][1]) * f;
  const dx = WAY[i][0] - WAY[i - 1][0], dy = WAY[i][1] - WAY[i - 1][1];
  const L = Math.hypot(dx, dy) || 1;
  return { x, y, dx: dx / L, dy: dy / L };
}

/* where the Way crosses the wall, as a fraction of arc length — John 1:1 belongs
   at the gate, not at the start of the approach road (set after GATES is built) */
let GATE_T = 0;

/* ---------- road clearance: the Way is a hard corridor ----------
   Buildings are pushed off the roadway (frozen from phase-1 ward centroids),
   then get a door facing their nearest road point. Identical in app.js so the
   2D and 3D plans stay the same city. */
const ROAD_HALF = 9;
(function roadClearance() {
  const CLEAR = ROAD_HALF + 4.5;
  const all = HOODS.concat([AX]);
  const nearestWay = h => {
    let best = Infinity, bi = 0;
    for (let i = 0; i < WAY.length; i += 2) {
      const dx = h.x - WAY[i][0], dy = h.y - WAY[i][1];
      const d2 = dx * dx + dy * dy;
      if (d2 < best) { best = d2; bi = i; }
    }
    return bi;
  };
  for (let it = 0; it < 90; it++) {
    for (let a = 0; a < all.length; a++) for (let b = a + 1; b < all.length; b++) {
      const A = all[a], B = all[b];
      const dx = B.x - A.x, dy = B.y - A.y;
      const d = Math.hypot(dx, dy) || 0.01, min = A.r + B.r + 8;
      if (d < min) {
        const push = (min - d) / 2, ux = dx / d, uy = dy / d;
        A.x -= ux * push; A.y -= uy * push; B.x += ux * push; B.y += uy * push;
      }
    }
    for (const h of all) {
      const bi = nearestWay(h);
      const dx = h.x - WAY[bi][0], dy = h.y - WAY[bi][1];
      const d = Math.hypot(dx, dy) || 0.01, min = h.r + CLEAR;
      if (d < min) { h.x += dx / d * (min - d); h.y += dy / d * (min - d); }
    }
  }
  all.forEach(h => {
    const bi = nearestWay(h);
    h.roadPt = WAY[bi];
    h.doorAng = Math.atan2(h.roadPt[1] - h.y, h.roadPt[0] - h.x);
  });
  WARDS.forEach(w => {
    w.cx = w.hoods.reduce((s, h) => s + h.x, 0) / w.hoods.length;
    w.cy = w.hoods.reduce((s, h) => s + h.y, 0) / w.hoods.length;
  });
})();

/* wall hull (plan) — after clearance so it hugs final positions */
const wallHull = convexHull(
  DISTRICTS.filter(d => !d.outside)
    .flatMap(d => d.wards.flatMap(w => w.hoods.flatMap(h => {
      const out = [];
      for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; out.push([h.x + (h.r + 46) * Math.cos(a), h.y + (h.r + 46) * Math.sin(a)]); }
      return out;
    }))));

/* ---------- wall segments with gate gaps where the Way crosses ---------- */
function segInt(p1, p2, p3, p4) {
  const d = (p2[0] - p1[0]) * (p4[1] - p3[1]) - (p2[1] - p1[1]) * (p4[0] - p3[0]);
  if (Math.abs(d) < 1e-9) return null;
  const t = ((p3[0] - p1[0]) * (p4[1] - p3[1]) - (p3[1] - p1[1]) * (p4[0] - p3[0])) / d;
  const u = ((p3[0] - p1[0]) * (p2[1] - p1[1]) - (p3[1] - p1[1]) * (p2[0] - p1[0])) / d;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return [p1[0] + t * (p2[0] - p1[0]), p1[1] + t * (p2[1] - p1[1])];
}
const GATE_GAP = 16;
/* A gate is a hole in the wall, but you walk through it along the *road*, and
   the wall hull is a coarse polygon whose edge here sits ~45 degrees off the
   road's normal. Shaping the road cannot fix that — so the gate is built square
   to the road (real gatehouses are), and the wall is cut wide enough along its
   own edge to clear the skewed opening. Identical to src/plan.js. */
const WALL_SEGS = [], GATES = [];
const wayDirAt = q => {
  let bi = 0, bd = Infinity;
  for (let i = 0; i < WAY.length; i++) {
    const d = (q[0] - WAY[i][0]) ** 2 + (q[1] - WAY[i][1]) ** 2;
    if (d < bd) { bd = d; bi = i; }
  }
  const a = WAY[Math.max(0, bi - 3)], b = WAY[Math.min(WAY.length - 1, bi + 3)];
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
  return [dx / L, dy / L];
};
(function buildWallWithGates() {
  for (let i = 0; i < wallHull.length; i++) {
    const a = wallHull[i], b = wallHull[(i + 1) % wallHull.length];
    let q = null;
    for (let j = 0; j < WAY.length - 1; j++) {
      q = segInt(a, b, WAY[j], WAY[j + 1]);
      if (q) break;
    }
    if (!q) { WALL_SEGS.push([a, b]); continue; }
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy);
    const ux = dx / L, uy = dy / L;
    const [rx, ry] = wayDirAt(q);
    const cross = Math.abs(ux * ry - uy * rx);                 // how obliquely the road meets the wall
    const gap = Math.max(16, Math.min(40, ROAD_HALF / Math.max(0.3, cross) + 10));
    const t = (q[0] - a[0]) * ux + (q[1] - a[1]) * uy;
    if (t - gap > 4) WALL_SEGS.push([a, [a[0] + ux * (t - gap), a[1] + uy * (t - gap)]]);
    if (L - (t + gap) > 4) WALL_SEGS.push([[a[0] + ux * (t + gap), a[1] + uy * (t + gap)], b]);
    GATES.push({ x: q[0], y: q[1], ux, uy, rx, ry, gap });
  }
  // order gates along the way (entrance first)
  const arc = g => {
    let best = Infinity, bi = 0;
    for (let i = 0; i < WAY.length; i += 2) {
      const d2 = (g.x - WAY[i][0]) ** 2 + (g.y - WAY[i][1]) ** 2;
      if (d2 < best) { best = d2; bi = i; }
    }
    return bi;
  };
  GATES.sort((a, b) => arc(a) - arc(b));
  if (GATES.length) {
    let bi = 0, bd = Infinity;
    for (let i = 0; i < WAY.length; i++) {
      const d = (GATES[0].x - WAY[i][0]) ** 2 + (GATES[0].y - WAY[i][1]) ** 2;
      if (d < bd) { bd = d; bi = i; }
    }
    GATE_T = wayLen[bi] / wayTotal;
  }
})();

/* ---------- shoreline + quay ----------
   The Sea of Tiberias blob (same centre as the 2D map) overlapped the land: in
   2D that was harmless — the city is painted over it — but in 3D you walked off
   the end of the Way into open water. The water is now carved back to a
   shoreline circle, and the last stretch of the Way runs out onto a stone quay.
   Kept here (not in render) so verify_parity.mjs can hold both renderers to the
   same geometry. */
const SEA_A0 = -42 * Math.PI / 180, SEA_A1 = 64 * Math.PI / 180;
function shoreR(a) {                       // how close the water comes, by bearing
  const deg = a * 180 / Math.PI;
  const t = Math.min(1, Math.max(0, (deg + 12) / 24));
  return 552 + 56 * t;                     // held back where the harbour quarter stands
}
const SEA_POLY = (() => {
  const N = 30, out = [];
  for (let k = 0; k <= N; k++) {            // the shoreline, swept back along the coast
    const a = SEA_A1 + (SEA_A0 - SEA_A1) * (k / N), r = shoreR(a);
    out.push([CX + r * Math.cos(a), CY + r * Math.sin(a)]);
  }
  for (let k = 0; k <= N; k++) {            // open water, running past the land's edge
    const a = SEA_A0 + (SEA_A1 - SEA_A0) * (k / N);
    const r = 1400 + 60 * Math.sin(a * 3.1 + 0.8);
    out.push([CX + r * Math.cos(a), CY + r * Math.sin(a)]);
  }
  return out;
})();
const QUAY_W = 20;
const QUAY_POLY = (() => {
  let i0 = WAY.length - 1;
  while (i0 > 1 && Math.hypot(WAY[i0 - 1][0] - CX, WAY[i0 - 1][1] - CY) > 500) i0--;
  const pts = WAY.slice(i0);
  const a = pts[pts.length - 2], b = pts[pts.length - 1];
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
  pts.push([b[0] + dx / L * 200, b[1] + dy / L * 200]);    // a jetty running out into the sea
  const l = [], r = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], q = pts[Math.min(i + 1, pts.length - 1)], o = pts[Math.max(0, i - 1)];
    let nx = -(q[1] - o[1]), ny = q[0] - o[0];
    const n = Math.hypot(nx, ny) || 1; nx /= n; ny /= n;
    l.push([p[0] + nx * QUAY_W, p[1] + ny * QUAY_W]);
    r.push([p[0] - nx * QUAY_W, p[1] - ny * QUAY_W]);
  }
  return l.concat(r.reverse());
})();

/* theme road samples */
const themeRoadPts = {};
for (const key in JOHN.themeRoads) {
  const stops = JOHN.themeRoads[key].stops.map(id => byId[id]).filter(Boolean).map(h => [h.x, h.y]);
  themeRoadPts[key] = catmullSample(stops, 16);
}

/* I AM landmarks: obelisk positions beside their hood */
function iamHood(s) { return HOODS.find(h => h.v0 <= s.v && s.v <= h.v1); }
const OBELISKS = [];
JOHN.iam.forEach(s => {
  const h = iamHood(s); if (!h) return;
  const siblings = JOHN.iam.filter(z => iamHood(z) === h);
  const k = siblings.indexOf(s);
  const ang = -Math.PI / 3 + k * 0.85;
  OBELISKS.push({ s, h, x: h.x + (h.r + 10) * Math.cos(ang), y: h.y + (h.r + 10) * Math.sin(ang), hgt: s.minor ? 20 : 30 });
});

/* ---------- palettes ---------- */
const PAL = {
  light: {
    skyTop: "#cfe3ef", skyBot: "#efe5cf", ground: "#e2d9c0", groundEdge: "#cdc2a3",
    district: "rgba(120,112,96,0.10)", sea: "#bcd9e4", seaEdge: "#8fb6c4",
    road: "#ddd1b2", roadEdge: "#ab9f7d", roadSeam: "rgba(90,80,60,0.18)",
    quay: "#cfc3a2", quayEdge: "#9b8f6e",
    wall: "#7d7566", wallTop: "#948b7a",
    ink: "#3d3a35", label: "#52514e", halo: "rgba(252,252,251,0.85)",
    gold: "#d9a419", goldDark: "#a87b0a", fogColor: [214, 226, 235],
    themes: { witness: "#eda100", sign: "#1baf7a", discourse: "#2a78d6", controversy: "#e34948", love: "#e87ba4", passion: "#4a3aa7", resurrection: "#008300" },
  },
  dark: {
    skyTop: "#0b1626", skyBot: "#25272b", ground: "#23221f", groundEdge: "#2e2c27",
    district: "rgba(255,255,255,0.05)", sea: "#16303a", seaEdge: "#2c5666",
    road: "#413e33", roadEdge: "#5d5943", roadSeam: "rgba(0,0,0,0.28)",
    quay: "#3a382f", quayEdge: "#57523f",
    wall: "#5c5648", wallTop: "#6d6757",
    ink: "#d5d3c8", label: "#c3c2b7", halo: "rgba(20,20,19,0.85)",
    gold: "#e8b83a", goldDark: "#b8860b", fogColor: [16, 24, 36],
    themes: { witness: "#c98500", sign: "#199e70", discourse: "#3987e5", controversy: "#e66767", love: "#d55181", passion: "#9085e9", resurrection: "#2fb457" },
  },
};
let theme = "light";
function P() { return PAL[theme]; }

/* color helpers */
function hex2rgb(h) { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function shade(hex, f, fog) { // f = brightness factor; fog = 0..1 toward fog color
  const [r, g, b] = hex2rgb(hex);
  const fc = P().fogColor;
  const mix = (c, t) => c * (1 - fog) + t * fog;
  return `rgb(${mix(Math.min(255, r * f), fc[0]) | 0},${mix(Math.min(255, g * f), fc[1]) | 0},${mix(Math.min(255, b * f), fc[2]) | 0})`;
}

/* ---------- camera ---------- */
const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");
let VW = 0, VH = 0, DPR = 1;
function resize() {
  DPR = Math.min(2, window.devicePixelRatio || 1);
  VW = canvas.clientWidth; VH = canvas.clientHeight;
  canvas.width = VW * DPR; canvas.height = VH * DPR;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  needRender = true;
}
window.addEventListener("resize", resize);

let mode = "orbit";                    // 'orbit' | 'walk'
const cam = {
  target: [CX, 0, CY + 40], yaw: 1.5, pitch: 0.66, dist: 980,   // orbit params (south of the city, looking north — matches the 2D orientation)
  walkT: 0, eye: 6.2, lookYaw: 0, lookPitch: -0.15,
};
let FOCAL = 1;
function viewMatrix() {
  // returns eye position + basis vectors
  let ex, ey, ez, fx, fy, fz;
  if (mode === "orbit") {
    const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
    ex = cam.target[0] + cam.dist * cp * Math.cos(cam.yaw);
    ey = cam.target[1] + cam.dist * sp;
    ez = cam.target[2] + cam.dist * cp * Math.sin(cam.yaw);
    fx = cam.target[0] - ex; fy = cam.target[1] - ey; fz = cam.target[2] - ez;
  } else {
    const p = wayAt(cam.walkT);
    ex = p.x - p.dx * 26; ey = cam.eye + 7; ez = p.y - p.dy * 26;   // slightly behind & above
    const baseAng = Math.atan2(p.dy, p.dx);
    const ang = baseAng + cam.lookYaw;
    const cp2 = Math.cos(cam.lookPitch);
    fx = Math.cos(ang) * cp2; fy = Math.sin(cam.lookPitch); fz = Math.sin(ang) * cp2;
  }
  const fl = Math.hypot(fx, fy, fz); fx /= fl; fy /= fl; fz /= fl;
  // right = f × worldUp(0,1,0) = (-fz, 0, fx) — right-handed basis, so the
  // plan renders with the same orientation as the 2D map (N up, E right).
  let rx = -fz, ry = 0, rz = fx;
  const rl = Math.hypot(rx, ry, rz) || 1; rx /= rl; rz /= rl;
  // up = r x f
  const ux = ry * fz - rz * fy, uy = rz * fx - rx * fz, uz = rx * fy - ry * fx;
  FOCAL = (VH / 2) / Math.tan((55 * Math.PI / 180) / 2);
  return { ex, ey, ez, fx, fy, fz, rx, ry, rz, ux, uy, uz };
}
let V = null;
function project(x, y, z) {
  // world (x=planX, y=up, z=planY)
  const dx = x - V.ex, dy = y - V.ey, dz = z - V.ez;
  const cz = dx * V.fx + dy * V.fy + dz * V.fz;          // depth
  if (cz < 2) return null;
  const cx2 = dx * V.rx + dy * V.ry + dz * V.rz;
  const cy2 = dx * V.ux + dy * V.uy + dz * V.uz;
  return [VW / 2 + cx2 * FOCAL / cz, VH / 2 - cy2 * FOCAL / cz, cz];
}
function fogOf(depth) {
  const d0 = mode === "walk" ? 250 : 900, d1 = mode === "walk" ? 1400 : 3000;
  return Math.max(0, Math.min(0.82, (depth - d0) / (d1 - d0)));
}

/* ---------- drawing primitives ---------- */
function pathPoly(pts) {
  ctx.beginPath();
  pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
  ctx.closePath();
}
/* Ground-plane polygons (ground, sea, road, washes, walkways) are huge and wrap
   around the camera, so once you walk into the city part of every one of them is
   *behind* you. Projecting a behind-camera vertex is meaningless, so the polygon
   is first clipped against the camera's near plane in world space — otherwise a
   single bad vertex would drop the whole shape (the road vanished past the gate,
   and the ground fell away at the harbour). */
const NEARZ = 2.05;
function clipNear(planPts, hy) {
  const wp = planPts.map(p => [p[0], hy, p[1]]);
  const cz = wp.map(p => (p[0] - V.ex) * V.fx + (p[1] - V.ey) * V.fy + (p[2] - V.ez) * V.fz);
  const out = [];
  for (let i = 0; i < wp.length; i++) {
    const j = (i + 1) % wp.length;
    const inI = cz[i] >= NEARZ, inJ = cz[j] >= NEARZ;
    if (inI) out.push(wp[i]);
    if (inI !== inJ) {
      const t = (NEARZ - cz[i]) / (cz[j] - cz[i]);
      out.push([wp[i][0] + (wp[j][0] - wp[i][0]) * t,
                wp[i][1] + (wp[j][1] - wp[i][1]) * t,
                wp[i][2] + (wp[j][2] - wp[i][2]) * t]);
    }
  }
  return out.length >= 3 ? out : null;
}
function drawFlatPoly(planPts, fill, stroke, dash) {
  const clipped = clipNear(planPts, 0.35);
  if (!clipped) return;
  const pts = [];
  for (const p of clipped) { const q = project(p[0], p[1], p[2]); if (!q) return; pts.push(q); }
  pathPoly(pts);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) {
    ctx.strokeStyle = stroke; ctx.lineWidth = 1;
    if (dash) ctx.setLineDash(dash);
    ctx.stroke(); ctx.setLineDash([]);
  }
}
const SUN = (() => { const l = [0.48, 0.72, 0.52], n = Math.hypot(...l); return l.map(v => v / n); })();

/* renderable list built per frame: {depth, draw()} */
let R = [];
function addCylinder(x, z, r, hgt, colorHex, opts = {}) {
  const dxe = x - V.ex, dze = z - V.ez;
  const depth = Math.hypot(dxe, (hgt / 2) - V.ey, dze);
  R.push({
    depth,
    draw() {
      const N = 26, bot = [], top = [];
      for (let i = 0; i <= N; i++) {
        const a = i / N * Math.PI * 2;
        const px = x + r * Math.cos(a), pz = z + r * Math.sin(a);
        const b = project(px, 0, pz), t = project(px, hgt, pz);
        if (!b || !t) return;
        bot.push(b); top.push(t);
      }
      const fog = fogOf(bot[0][2]);
      // side quads (only camera-facing)
      for (let i = 0; i < N; i++) {
        const a = (i + 0.5) / N * Math.PI * 2;
        const nx = Math.cos(a), nz = Math.sin(a);
        const vx = (x + r * nx) - V.ex, vz = (z + r * nz) - V.ez;
        if (nx * vx + nz * vz > 0) continue;          // backface
        const lit = 0.62 + 0.38 * Math.max(0, nx * SUN[0] + nz * SUN[2]);
        ctx.fillStyle = shade(colorHex, lit, fog);
        ctx.beginPath();
        ctx.moveTo(bot[i][0], bot[i][1]); ctx.lineTo(bot[i + 1][0], bot[i + 1][1]);
        ctx.lineTo(top[i + 1][0], top[i + 1][1]); ctx.lineTo(top[i][0], top[i][1]);
        ctx.closePath(); ctx.fill();
      }
      // roof
      pathPoly(top);
      ctx.fillStyle = shade(colorHex, opts.selected ? 1.35 : 1.12, fog);
      ctx.fill();
      if (opts.ring) { ctx.strokeStyle = P().gold; ctx.lineWidth = 1.6; ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]); }
      if (opts.selected) { ctx.strokeStyle = P().ink; ctx.lineWidth = 2; ctx.stroke(); }
      // arched doorway facing the road
      if (opts.doorAng != null) {
        const ang = opts.doorAng;
        const dnx = Math.cos(ang), dnz = Math.sin(ang);
        const dvx = (x + r * dnx) - V.ex, dvz = (z + r * dnz) - V.ez;
        if (dnx * dvx + dnz * dvz < 0) {           // door face is camera-visible
          const dW = Math.min(6.5, r * 0.75), dH = Math.min(11, hgt * 0.7), dA = dW / r / 2;
          const b1 = project(x + r * Math.cos(ang - dA), 0, z + r * Math.sin(ang - dA));
          const b2 = project(x + r * Math.cos(ang + dA), 0, z + r * Math.sin(ang + dA));
          const t1 = project(x + r * Math.cos(ang - dA), dH, z + r * Math.sin(ang - dA));
          const t2 = project(x + r * Math.cos(ang + dA), dH, z + r * Math.sin(ang + dA));
          const tm = project(x + r * dnx, dH + dW * 0.5, z + r * dnz);
          if (b1 && b2 && t1 && t2 && tm) {
            ctx.fillStyle = shade(colorHex, 0.30, fog);
            ctx.beginPath();
            ctx.moveTo(b1[0], b1[1]); ctx.lineTo(t1[0], t1[1]);
            ctx.quadraticCurveTo(tm[0], tm[1], t2[0], t2[1]);
            ctx.lineTo(b2[0], b2[1]); ctx.closePath(); ctx.fill();
            if (opts.ring) {   // landmark buildings get gold portal trim
              ctx.strokeStyle = P().gold; ctx.lineWidth = 1.4;
              ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]);
            }
          }
        }
      }
      if (opts.dashed) { pathPoly(bot); ctx.strokeStyle = P().label; ctx.setLineDash([3, 4]); ctx.lineWidth = 1.2; ctx.stroke(); ctx.setLineDash([]); }
      // screen-space pick info
      const c = project(x, hgt, z);
      if (c) { opts.owner._pick = { x: c[0], y: c[1], r: Math.max(10, r * FOCAL / c[2]), depth: c[2] }; }
    },
  });
}
function addObelisk(o) {
  const depth = Math.hypot(o.x - V.ex, o.hgt / 2 - V.ey, o.y - V.ez);
  R.push({
    depth,
    draw() {
      const w = 3.4, cap = o.hgt * 0.22;
      const corners = [[-w, -w], [w, -w], [w, w], [-w, w]];
      const bot = corners.map(c => project(o.x + c[0], 0, o.y + c[1]));
      const top = corners.map(c => project(o.x + c[0] * 0.55, o.hgt - cap, o.y + c[1] * 0.55));
      const apex = project(o.x, o.hgt, o.y);
      if (bot.some(p => !p) || top.some(p => !p) || !apex) return;
      const fog = fogOf(bot[0][2]);
      for (let i = 0; i < 4; i++) {
        const j = (i + 1) % 4;
        const nx = (corners[i][0] + corners[j][0]) / 2, nz = (corners[i][1] + corners[j][1]) / 2;
        const vx = o.x + nx - V.ex, vz = o.y + nz - V.ez;
        if (nx * vx + nz * vz > 0) continue;
        const nl = Math.hypot(nx, nz) || 1;
        const lit = 0.6 + 0.4 * Math.max(0, (nx / nl) * SUN[0] + (nz / nl) * SUN[2]);
        ctx.fillStyle = shade(P().gold, lit, fog);
        ctx.beginPath();
        ctx.moveTo(bot[i][0], bot[i][1]); ctx.lineTo(bot[j][0], bot[j][1]);
        ctx.lineTo(top[j][0], top[j][1]); ctx.lineTo(top[i][0], top[i][1]);
        ctx.closePath(); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(top[i][0], top[i][1]); ctx.lineTo(top[j][0], top[j][1]);
        ctx.lineTo(apex[0], apex[1]); ctx.closePath();
        ctx.fillStyle = shade(P().goldDark, lit + 0.15, fog); ctx.fill();
      }
      o._pick = { x: apex[0], y: apex[1], r: 12, depth: apex[2] };
    },
  });
}
function addPrism(cx, cz, hw, ux, uy, hgt, colorFn, yBase = 0) {
  // square-ish prism footprint oriented along (ux,uy); returns corner list drawer
  const px = -uy, py = ux;
  const C = [
    [cx - ux * hw - px * hw, cz - uy * hw - py * hw],
    [cx + ux * hw - px * hw, cz + uy * hw - py * hw],
    [cx + ux * hw + px * hw, cz + uy * hw + py * hw],
    [cx - ux * hw + px * hw, cz - uy * hw + py * hw],
  ];
  const bot = C.map(c => project(c[0], yBase, c[1]));
  const top = C.map(c => project(c[0], yBase + hgt, c[1]));
  if (bot.some(p => !p) || top.some(p => !p)) return;
  const fog = fogOf(bot[0][2]);
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    const nx = (C[i][0] + C[j][0]) / 2 - cx, nz = (C[i][1] + C[j][1]) / 2 - cz;
    const vx = (C[i][0] + C[j][0]) / 2 - V.ex, vz = (C[i][1] + C[j][1]) / 2 - V.ez;
    if (nx * vx + nz * vz > 0) continue;
    const nl = Math.hypot(nx, nz) || 1;
    const lit = 0.55 + 0.45 * Math.max(0, (nx / nl) * SUN[0] + (nz / nl) * SUN[2]);
    ctx.fillStyle = colorFn(lit, fog);
    ctx.beginPath();
    ctx.moveTo(bot[i][0], bot[i][1]); ctx.lineTo(bot[j][0], bot[j][1]);
    ctx.lineTo(top[j][0], top[j][1]); ctx.lineTo(top[i][0], top[i][1]);
    ctx.closePath(); ctx.fill();
  }
  pathPoly(top);
  ctx.fillStyle = colorFn(1.12, fog); ctx.fill();
}
function addGate(g, label) {
  // square to the road, not the wall edge (see the gate note in the plan section)
  const gux = g.rx != null ? -g.ry : g.ux, guy = g.rx != null ? g.rx : g.uy;
  const depth = Math.hypot(g.x - V.ex, 14 - V.ey, g.y - V.ez);
  R.push({
    depth,
    draw() {
      const wallColor = (lit, fog) => shade(P().wall, lit, fog);
      // two flanking towers just outside the road gap
      const t1x = g.x - gux * GATE_GAP, t1y = g.y - guy * GATE_GAP;
      const t2x = g.x + gux * GATE_GAP, t2y = g.y + guy * GATE_GAP;
      addPrism(t1x, t1y, 6.5, gux, guy, 30, wallColor);
      addPrism(t2x, t2y, 6.5, gux, guy, 30, wallColor);
      // lintel spanning the road, high enough to walk under
      const px = -guy, py = gux;
      const L1 = [g.x - gux * (GATE_GAP - 4), g.y - guy * (GATE_GAP - 4)];
      const L2 = [g.x + gux * (GATE_GAP - 4), g.y + guy * (GATE_GAP - 4)];
      const Y0 = 21, Y1 = 27;
      const quads = [
        // front + back faces (across the road direction)
        [[L1[0] + px * 3, L1[1] + py * 3], [L2[0] + px * 3, L2[1] + py * 3]],
        [[L1[0] - px * 3, L1[1] - py * 3], [L2[0] - px * 3, L2[1] - py * 3]],
      ];
      for (const [A, B] of quads) {
        const nx = (A[0] + B[0]) / 2 - g.x, nz = (A[1] + B[1]) / 2 - g.y;
        const vx = (A[0] + B[0]) / 2 - V.ex, vz = (A[1] + B[1]) / 2 - V.ez;
        if (nx * vx + nz * vz > 0) continue;
        const a0 = project(A[0], Y0, A[1]), a1 = project(A[0], Y1, A[1]);
        const b0 = project(B[0], Y0, B[1]), b1 = project(B[0], Y1, B[1]);
        if (!a0 || !a1 || !b0 || !b1) continue;
        const fog = fogOf(a0[2]);
        ctx.fillStyle = shade(P().wall, 0.9, fog);
        ctx.beginPath();
        ctx.moveTo(a0[0], a0[1]); ctx.lineTo(b0[0], b0[1]);
        ctx.lineTo(b1[0], b1[1]); ctx.lineTo(a1[0], a1[1]);
        ctx.closePath(); ctx.fill();
      }
      // lintel top
      const c1 = project(L1[0] + px * 3, Y1, L1[1] + py * 3), c2 = project(L2[0] + px * 3, Y1, L2[1] + py * 3);
      const c3 = project(L2[0] - px * 3, Y1, L2[1] - py * 3), c4 = project(L1[0] - px * 3, Y1, L1[1] - py * 3);
      if (c1 && c2 && c3 && c4) {
        ctx.fillStyle = shade(P().wallTop, 1.1, fogOf(c1[2]));
        ctx.beginPath();
        ctx.moveTo(c1[0], c1[1]); ctx.lineTo(c2[0], c2[1]); ctx.lineTo(c3[0], c3[1]); ctx.lineTo(c4[0], c4[1]);
        ctx.closePath(); ctx.fill();
      }
    },
  });
}
function addWall() {
  const H = 16;
  for (const [a, b] of WALL_SEGS) {
    const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
    const depth = Math.hypot(mx - V.ex, H / 2 - V.ey, mz - V.ez);
    R.push({
      depth,
      draw() {
        const pa = project(a[0], 0, a[1]), pb = project(b[0], 0, b[1]);
        const ta = project(a[0], H, a[1]), tb = project(b[0], H, b[1]);
        if (!pa || !pb || !ta || !tb) return;
        const fog = fogOf(pa[2]);
        // face normal (outward = away from city center)
        let nx = -(b[1] - a[1]), nz = b[0] - a[0];
        const cxv = mx - CX, czv = mz - CY;
        if (nx * cxv + nz * czv < 0) { nx = -nx; nz = -nz; }
        const nl = Math.hypot(nx, nz) || 1;
        const vx = mx - V.ex, vz = mz - V.ez;
        const facing = (nx * vx + nz * vz) < 0;
        const lit = 0.55 + 0.45 * Math.max(0, (nx / nl) * SUN[0] + (nz / nl) * SUN[2]);
        ctx.fillStyle = shade(facing ? P().wall : P().wall, facing ? lit : lit * 0.8, fog);
        ctx.beginPath();
        ctx.moveTo(pa[0], pa[1]); ctx.lineTo(pb[0], pb[1]);
        ctx.lineTo(tb[0], tb[1]); ctx.lineTo(ta[0], ta[1]);
        ctx.closePath(); ctx.fill();
        // top ridge
        ctx.strokeStyle = shade(P().wallTop, 1.05, fog); ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(ta[0], ta[1]); ctx.lineTo(tb[0], tb[1]); ctx.stroke();
      },
    });
  }
}

/* ---------- labels (screen space, after 3D) ---------- */
let SIGN_RECTS = [];
function drawSign(h) {
  // a name-board hung over the doorway, visible from the street side
  if (h.doorAng == null) return;
  const dH = Math.min(11, (h.h || 20) * 0.7);
  const nx = Math.cos(h.doorAng), nz = Math.sin(h.doorAng);
  const ax = h.x + nx * (h.r + 1.2), az = h.y + nz * (h.r + 1.2);
  const ay = Math.min((h.h || 20) + 3, dH + 8);
  if (nx * (ax - V.ex) + nz * (az - V.ez) > 0) return;   // wrong side of the building
  const p = project(ax, ay, az);
  if (!p || p[2] > (mode === "walk" ? 340 : 1500)) return;
  ctx.font = "600 11px system-ui, sans-serif";
  ctx.textAlign = "center";
  const w = ctx.measureText(h.short).width;
  const bx = p[0] - w / 2 - 5, by = p[1] - 8, bw = w + 10, bh = 16;
  // nearest sign wins a spot: skip if it would overlap one already drawn
  for (const r of SIGN_RECTS) {
    if (bx < r[0] + r[2] && bx + bw > r[0] && by < r[1] + r[3] && by + bh > r[1]) return;
  }
  SIGN_RECTS.push([bx, by, bw, bh]);
  // hanger bracket
  ctx.strokeStyle = P().roadEdge; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(p[0], by); ctx.lineTo(p[0], by - 4); ctx.stroke();
  ctx.fillStyle = P().road;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(bx, by, bw, bh, 3); else ctx.rect(bx, by, bw, bh);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = P().ink;
  ctx.fillText(h.short, p[0], by + 12);
}
function drawLabel(x, y3, z, text, size, color, always) {
  const p = project(x, y3, z);
  if (!p) return;
  if (!always && p[2] > (mode === "walk" ? 330 : 2400)) return;
  ctx.font = `600 ${size}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.lineJoin = "round";
  ctx.strokeStyle = P().halo; ctx.lineWidth = 4;
  ctx.strokeText(text, p[0], p[1]);
  ctx.fillStyle = color; ctx.fillText(text, p[0], p[1]);
}

/* ---------- render ---------- */
let needRender = true;
function render() {
  V = viewMatrix();
  // sky
  const g = ctx.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, P().skyTop); g.addColorStop(1, P().skyBot);
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);

  // ground disc (big blob around everything)
  const groundPts = [];
  for (let k = 0; k < 40; k++) {
    const a = k / 40 * Math.PI * 2;
    const r = 900 + 60 * Math.sin(a * 3 + 1.7);
    groundPts.push([CX + r * Math.cos(a) + 110, CY + r * Math.sin(a) + 40]);
  }
  drawFlatPoly(groundPts, P().ground, P().groundEdge);

  // sea (carved back to the shoreline) and the quay carrying the Way onto it
  drawFlatPoly(SEA_POLY, P().sea, P().seaEdge);
  drawFlatPoly(QUAY_POLY, P().quay, P().quayEdge);

  // district washes (per-ward lobes, flat)
  DISTRICTS.forEach(d => d.wards.forEach(w => {
    const pts = [];
    const hull = convexHull(w.hoods.flatMap(h => {
      const out = [];
      for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; out.push([h.x + (h.r + 18) * Math.cos(a), h.y + (h.r + 18) * Math.sin(a)]); }
      return out;
    }));
    drawFlatPoly(hull, P().district, null);
  }));

  // the Way (road ribbon)
  const ROADW = ROAD_HALF;
  const left = [], right = [];
  for (let i = 0; i < WAY.length - 1; i++) {
    const [x1, y1] = WAY[i], [x2, y2] = WAY[i + 1];
    let nx = -(y2 - y1), ny = x2 - x1;
    const L = Math.hypot(nx, ny) || 1; nx /= L; ny /= L;
    left.push([x1 + nx * ROADW, y1 + ny * ROADW]);
    right.push([x1 - nx * ROADW, y1 - ny * ROADW]);
  }
  drawFlatPoly(left.concat(right.reverse()), P().road, P().roadEdge);
  // paving seams across the road + dashed center line
  ctx.strokeStyle = P().roadSeam; ctx.lineWidth = 1;
  for (let i = 4; i < WAY.length - 1; i += 5) {
    const [x1, y1] = WAY[i], [x2, y2] = WAY[i + 1];
    let nx = -(y2 - y1), ny = x2 - x1;
    const L = Math.hypot(nx, ny) || 1; nx /= L; ny /= L;
    const a = project(x1 + nx * (ROADW - 1.2), 0.5, y1 + ny * (ROADW - 1.2));
    const b = project(x1 - nx * (ROADW - 1.2), 0.5, y1 - ny * (ROADW - 1.2));
    if (a && b && a[2] < 1600) { ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
  }
  ctx.strokeStyle = P().roadEdge; ctx.lineWidth = 1.2;
  for (let i = 0; i < WAY.length - 3; i += 6) {
    const a = project(WAY[i][0], 0.5, WAY[i][1]);
    const b = project(WAY[i + 3][0], 0.5, WAY[i + 3][1]);
    if (a && b) { ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
  }

  // entry walkways: road edge → each doorway
  HOODS.concat([AX]).forEach(h => {
    if (!h.roadPt) return;
    const bx = h.x + Math.cos(h.doorAng) * h.r, by = h.y + Math.sin(h.doorAng) * h.r;
    const dx = bx - h.roadPt[0], dy = by - h.roadPt[1];
    const L = Math.hypot(dx, dy);
    if (L > 150 || L < 2) return;
    const ux = dx / L, uy = dy / L;
    const sx = h.roadPt[0] + ux * (ROADW - 1), sy = h.roadPt[1] + uy * (ROADW - 1);
    const px2 = -uy * 2.1, py2 = ux * 2.1;
    drawFlatPoly([[sx + px2, sy + py2], [bx + px2 + ux * 1.5, by + py2 + uy * 1.5],
                  [bx - px2 + ux * 1.5, by - py2 + uy * 1.5], [sx - px2, sy - py2]],
                 P().road, P().roadEdge);
  });

  // theme roads (dotted)
  const trColors = { life: P().themes.sign, light: P().themes.witness };
  for (const key in themeRoadPts) {
    if (!document.getElementById("ck3-" + key).checked) continue;
    ctx.fillStyle = trColors[key];
    for (let i = 0; i < themeRoadPts[key].length; i += 3) {
      const p = project(themeRoadPts[key][i][0], 1.4, themeRoadPts[key][i][1]);
      if (!p) continue;
      const rr = Math.max(0.8, 2.6 * FOCAL / p[2] * 3);
      ctx.beginPath(); ctx.arc(p[0], p[1], Math.min(4, rr), 0, Math.PI * 2); ctx.fill();
    }
  }

  // 3D objects
  R = [];
  addWall();
  GATES.forEach(addGate);
  HOODS.forEach(h => {
    h._pick = null;
    addCylinder(h.x, h.y, h.r, h.h, P().themes[h.theme] || "#888",
      { ring: !!h.landmark || !!h.center, selected: selectedId === h.id, owner: h, doorAng: h.doorAng });
  });
  AX._pick = null;
  addCylinder(AX.x, AX.y, AX.r, AX.h, P().themes.controversy, { dashed: true, owner: AX, doorAng: AX.doorAng });
  if (document.getElementById("ck3-iam").checked) OBELISKS.forEach(addObelisk);
  R.sort((a, b) => b.depth - a.depth);
  R.forEach(o => o.draw());

  // labels
  if (document.getElementById("ck3-labels").checked) {
    const DN = { d1: "PROLOGUE", d10: "BOOK OF SIGNS", d80: "BOOK OF GLORY", d97: "THE HARBOR" };
    if (mode === "orbit") DISTRICTS.forEach(d => {
      const cx2 = d.wards.reduce((s, w) => s + w.cx, 0) / d.wards.length;
      const cz2 = d.wards.reduce((s, w) => s + w.cy, 0) / d.wards.length;
      drawLabel(cx2, 150, cz2, DN[d.id] || d.short, 15, P().label, true);
    });
    WARDS.forEach(w => {
      const hmax = Math.max(...w.hoods.map(h => h.h));
      drawLabel(w.cx, hmax + 26, w.cy, w.short, 11.5, P().label);
    });
    if (mode === "walk" || cam.dist < 520) {
      SIGN_RECTS = [];
      // draw nearest signs first so they win overlap contests
      HOODS.concat([AX])
        .slice().sort((a, b) =>
          ((a.x - V.ex) ** 2 + (a.y - V.ez) ** 2) - ((b.x - V.ex) ** 2 + (b.y - V.ez) ** 2))
        .forEach(drawSign);
      OBELISKS.forEach(o => drawLabel(o.x, o.hgt + 8, o.y, "✦ " + o.s.label, 9.5, P().goldDark));
    }
    GATES.forEach((g, i) => drawLabel(g.x, 34, g.y, i === 0 ? "CITY GATE" : "WATER GATE", 10, P().label));
    drawLabel(gatePt[0], 24, gatePt[1], "WEST GATE · 1:1", 10.5, P().label);
    drawLabel(portPt[0], 20, portPt[1], "THE HARBOR · 21:25", 10.5, P().label);
    const seaLbl = [CX + 740 * Math.cos(0.17), CY + 740 * Math.sin(0.17)];   // out in the bay
    drawLabel(seaLbl[0], 2, seaLbl[1], "SEA OF TIBERIAS", 11, P().seaEdge);
  }
}

/* ---------- picking / tooltip / panel ---------- */
const tooltip = document.getElementById("tooltip");
let selectedId = null;
const themeLabel = k => (JOHN.themes[k] || { label: k }).label;
function hoodTooltip(h) {
  return `<div class="tt-name">${h.short}</div>
    <div class="tt-ref">John ${h.ref}${h.chiasm ? " · chiasm " + h.chiasm : ""}</div>
    <div class="tt-path">${h.district ? h.district.short + " › " + h.ward.short : "Outside the wall"}</div>
    <div class="tt-stats"><span><b>${fmt(h.verses)}</b> vv</span><span><b>${fmt(h.greek)}</b> Greek</span><span><b>${fmt(h.eng)}</b> English</span></div>
    <div class="tt-theme"><span class="swatch" style="background:var(--t-${h.theme})"></span>${themeLabel(h.theme)}</div>`;
}
function pickAt(mx, my) {
  let best = null;
  const consider = o => {
    if (!o._pick) return;
    const d = Math.hypot(mx - o._pick.x, my - o._pick.y);
    if (d < o._pick.r + 6 && (!best || o._pick.depth < best._pick.depth)) best = o;
  };
  HOODS.forEach(consider); consider(AX);
  return best;
}
canvas.addEventListener("pointermove", ev => {
  if (dragging) return;
  const h = pickAt(ev.offsetX, ev.offsetY);
  if (h) {
    tooltip.innerHTML = hoodTooltip(h);
    tooltip.style.display = "block";
    const st = document.getElementById("stage").getBoundingClientRect();
    let x = ev.clientX - st.left + 14, y = ev.clientY - st.top + 14;
    if (x + tooltip.offsetWidth > st.width - 8) x = ev.clientX - st.left - tooltip.offsetWidth - 12;
    if (y + tooltip.offsetHeight > st.height - 8) y = ev.clientY - st.top - tooltip.offsetHeight - 12;
    tooltip.style.left = x + "px"; tooltip.style.top = y + "px";
    canvas.style.cursor = "pointer";
  } else { tooltip.style.display = "none"; canvas.style.cursor = dragging ? "grabbing" : "grab"; }
});

const panel = document.getElementById("panel");
const panelBody = document.getElementById("panel-body");
function closePanel() { panel.classList.remove("open"); selectedId = null; needRender = true; }
window.closePanel = closePanel;
function statBlock(o) {
  return `<div class="statrow">
    <div class="stat"><b>${fmt(o.verses)}</b><span>verses</span></div>
    <div class="stat"><b>${fmt(o.greek)}</b><span>Greek words</span></div>
    <div class="stat"><b>${fmt(o.eng)}</b><span>English words</span></div></div>`;
}
function buildingKind(g) {
  if (g == null) return "";
  if (g >= 500) return "Mega-complex / Forum";
  if (g >= 250) return "Civic hall";
  if (g >= 150) return "Commercial block";
  return "Pocket park / gatehouse";
}
function openHood(h) {
  selectedId = h.id; needRender = true;
  let html = `<div class="crumb">${h.district ? h.district.short + " › " + h.ward.short : "Outside the city wall"}</div>
    <h2>${h.short}</h2><div class="ref">John ${h.ref} · ${buildingKind(h.greek)}</div>
    <div class="themechip"><span class="swatch" style="background:var(--t-${h.theme})"></span>${themeLabel(h.theme)}${h.chiasm ? " · chiasm " + h.chiasm : ""}</div>
    ${statBlock(h)}<div class="full-desc">${h.desc}</div>`;
  if (h.note) html += `<div class="note">${h.note}</div>`;
  if (h.details && h.details.length) {
    html += `<h3>Inside this block</h3>` + h.details.map(d =>
      `<div class="detail-item"><span>${d.desc}</span><span class="g">${d.greek != null ? d.greek + " gw" : ""}</span></div>`).join("");
  }
  if (h.ward) {
    const chi = h.ward.hoods.filter(x => x.chiasm);
    if (chi.length) {
      html += `<h3>Chiasm plaza — ${h.ward.short}</h3><div class="ladder">` + h.ward.hoods.map(x => {
        if (!x.chiasm) return "";
        const cur = x.id === h.id ? " current" : "", cen = x.center ? " center" : "";
        return `<div class="rung${cur}${cen}" data-open="${x.id}"><span class="tag">${x.center ? "◈ " + x.chiasm : x.chiasm}</span><span>${x.short} <span style="color:var(--muted)">· ${x.ref}</span></span></div>`;
      }).join("") + `</div>`;
      if (h.ward.chiasmNote) html += `<div class="note" style="margin-top:10px">${h.ward.chiasmNote}</div>`;
    }
  }
  panelBody.innerHTML = html;
  panelBody.querySelectorAll("[data-open]").forEach(r =>
    r.addEventListener("click", () => openHood(byId[r.dataset.open])));
  panel.classList.add("open");
}

/* ---------- input ---------- */
let dragging = null;
canvas.addEventListener("pointerdown", ev => {
  dragging = { x: ev.clientX, y: ev.clientY, moved: false, shift: ev.shiftKey || ev.button === 2 };
  canvas.setPointerCapture(ev.pointerId);
});
canvas.addEventListener("contextmenu", ev => ev.preventDefault());
canvas.addEventListener("pointermove", ev => {
  if (!dragging) return;
  const dx = ev.clientX - dragging.x, dy = ev.clientY - dragging.y;
  if (Math.abs(dx) + Math.abs(dy) > 3) dragging.moved = true;
  if (!dragging.moved) return;
  canvas.classList.add("panning");
  if (mode === "orbit") {
    if (dragging.shift) {
      // pan target in plan space along camera right/forward
      const s = cam.dist / FOCAL;
      cam.target[0] -= (dx * V.rx - dy * V.fx / Math.max(0.35, Math.cos(cam.pitch))) * s;
      cam.target[2] -= (dx * V.rz - dy * V.fz / Math.max(0.35, Math.cos(cam.pitch))) * s;
    } else {
      cam.yaw += dx * 0.0055;
      // pitch clamp: from street-grazing (≈6°) up to near-top-down (≈89°) —
      // the camera can never dip under the ground plane or flip the map over
      cam.pitch = Math.max(0.10, Math.min(1.55, cam.pitch + dy * 0.004));
    }
  } else {
    // free look while walking
    cam.lookYaw = Math.max(-2.7, Math.min(2.7, cam.lookYaw + dx * 0.0045));
    cam.lookPitch = Math.max(-0.7, Math.min(0.7, cam.lookPitch - dy * 0.0035));
  }
  dragging.x = ev.clientX; dragging.y = ev.clientY;
  needRender = true;
});
canvas.addEventListener("pointerup", ev => {
  canvas.classList.remove("panning");
  if (dragging && !dragging.moved) {
    const h = pickAt(ev.offsetX, ev.offsetY);
    if (h) openHood(h); else closePanel();
  }
  dragging = null;
});
canvas.addEventListener("dblclick", ev => {
  const h = pickAt(ev.offsetX, ev.offsetY);
  if (h && mode === "orbit") {
    cam.target = [h.x, 0, h.y];
    cam.dist = Math.max(220, cam.dist * 0.55);
    needRender = true;
  }
});
canvas.addEventListener("wheel", ev => {
  ev.preventDefault();
  if (mode === "orbit") {
    cam.dist = Math.max(130, Math.min(2100, cam.dist * Math.pow(1.0015, ev.deltaY)));
  } else {
    cam.walkT = Math.max(0, Math.min(1, cam.walkT + ev.deltaY * 0.00012));
    syncWalkUI();
  }
  needRender = true;
}, { passive: false });

/* ---------- walk mode UI ---------- */
const walkbar = document.getElementById("walkbar");
const walkpos = document.getElementById("walkpos");
const walkinfo = document.getElementById("walkinfo");
const playbtn = document.getElementById("playbtn");
const enterbtn = document.getElementById("enterbtn");
const pacectl = document.getElementById("pacectl");
const paceval = document.getElementById("paceval");
let playing = false;
let pace = 1;
pacectl.addEventListener("input", () => {
  pace = +pacectl.value;
  paceval.textContent = (pace % 1 ? pace.toFixed(2).replace(/0$/, "") : pace) + "×";
});
function currentWalkHood() { return hoodOfVerse(verseAt(cam.walkT)); }
function enterCurrent() {
  const h = currentWalkHood();
  if (h) { playing = false; playbtn.textContent = "▶"; openHood(h); }
}
enterbtn.addEventListener("click", enterCurrent);
function verseAt(t) {   // the approach outside the wall is pre-1:1
  const u = GATE_T >= 1 ? t : Math.max(0, (t - GATE_T) / (1 - GATE_T));
  return Math.max(1, Math.min(TOTAL, Math.round(u * (TOTAL - 1) + 1)));
}
function chapterVerseOf(v) {
  let ch = 1;
  for (let c = 1; c <= 21; c++) { if (JOHN.chapterOffsets[c] < v) ch = c; }
  return ch + ":" + (v - JOHN.chapterOffsets[ch]);
}
function hoodOfVerse(v) { return HOODS.find(h => h.v0 <= v && v <= h.v1); }
function syncWalkUI() {
  walkpos.value = Math.round(cam.walkT * 1000);
  const v = verseAt(cam.walkT);
  const h = hoodOfVerse(v);
  walkinfo.innerHTML = `<b>${cam.walkT < GATE_T ? "Approaching the West Gate" : (h ? h.short : "The Way")}</b>John ${chapterVerseOf(v)}${h ? " · " + h.ward.short : ""}`;
}
walkpos.addEventListener("input", () => { cam.walkT = walkpos.value / 1000; playing = false; playbtn.textContent = "▶"; syncWalkUI(); needRender = true; });
function togglePlay() {
  playing = !playing;
  playbtn.textContent = playing ? "⏸" : "▶";
  if (playing) { cam.lookYaw = 0; cam.lookPitch = -0.15; }   // face forward when setting off
  needRender = true;
}
playbtn.addEventListener("click", togglePlay);
document.querySelectorAll("#modeseg button").forEach(b => b.addEventListener("click", () => {
  mode = b.dataset.mode;
  document.querySelectorAll("#modeseg button").forEach(x => x.classList.toggle("on", x === b));
  walkbar.classList.toggle("show", mode === "walk");
  if (mode === "walk") { syncWalkUI(); cam.lookYaw = 0; cam.lookPitch = -0.15; }
  document.getElementById("hint3d").textContent = mode === "walk"
    ? "drag or ← → to look around · ↑ ↓ / wheel to walk · PgUp/PgDn to look up/down · Enter to step inside"
    : "drag to orbit · shift-drag to pan · scroll to zoom · double-click a building to focus · click for detail";
  playing = false; playbtn.textContent = "▶";
  needRender = true;
}));

/* ---------- legend + toggles ---------- */
(function buildLegend() {
  const lg = document.getElementById("legend");
  for (const key in JOHN.themes) {
    const lab = document.createElement("label");
    lab.innerHTML = `<span class="swatch" style="background:var(--t-${key})"></span>${JOHN.themes[key].label}`;
    lg.appendChild(lab);
  }
  const mk = (id, txt, checked) => {
    const lab = document.createElement("label");
    lab.innerHTML = `<input type="checkbox" id="${id}" ${checked ? "checked" : ""}> ${txt}`;
    lg.appendChild(lab);
    lab.querySelector("input").addEventListener("change", () => needRender = true);
  };
  const t = document.createElement("div");
  t.className = "grp-title"; t.textContent = "Overlays"; lg.appendChild(t);
  mk("ck3-iam", "“I AM” obelisks", true);
  mk("ck3-life", "Life & Water road", true);
  mk("ck3-light", "Light & Witness road", true);
  mk("ck3-labels", "Labels", true);
})();

/* ---------- theme ---------- */
(function initTheme() {
  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  theme = prefersDark ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", theme);
  document.getElementById("themebtn").addEventListener("click", () => {
    theme = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", theme);
    needRender = true;
  });
})();
document.addEventListener("keydown", ev => {
  if (ev.key === "Escape") closePanel();
  if (mode !== "walk") return;
  // Space pauses *and* resumes. preventDefault matters: without it the browser
  // also "clicks" the focused play button, and the two toggles cancel out.
  if (ev.code === "Space") { ev.preventDefault(); togglePlay(); return; }
  if (ev.key === "Enter" && !panel.classList.contains("open")) enterCurrent();
  if (ev.key === "ArrowLeft") { cam.lookYaw = Math.max(-2.7, cam.lookYaw - 0.07); ev.preventDefault(); needRender = true; }
  if (ev.key === "ArrowRight") { cam.lookYaw = Math.min(2.7, cam.lookYaw + 0.07); ev.preventDefault(); needRender = true; }
  if (ev.key === "ArrowUp") { cam.walkT = Math.min(1, cam.walkT + 0.0022); ev.preventDefault(); syncWalkUI(); needRender = true; }
  if (ev.key === "ArrowDown") { cam.walkT = Math.max(0, cam.walkT - 0.0022); ev.preventDefault(); syncWalkUI(); needRender = true; }
  if (ev.key === "PageUp") { cam.lookPitch = Math.min(0.7, cam.lookPitch + 0.06); ev.preventDefault(); needRender = true; }
  if (ev.key === "PageDown") { cam.lookPitch = Math.max(-0.7, cam.lookPitch - 0.06); ev.preventDefault(); needRender = true; }
});

/* ---------- main loop ---------- */
function loop() {
  if (playing && mode === "walk") {
    cam.walkT += 0.00035 * pace;
    if (cam.walkT >= 1) { cam.walkT = 1; playing = false; playbtn.textContent = "▶"; }
    syncWalkUI();
    needRender = true;
  }
  if (needRender) { needRender = false; render(); }
  requestAnimationFrame(loop);
}
resize();
requestAnimationFrame(loop);
