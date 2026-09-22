/* ============ The Gospel of John as a City — map application ============ */
"use strict";

/* ---------- data prep ---------- */
const TOTAL = JOHN.totalVerses;
const HOODS = [];           // flat list of neighborhoods with parent links
const WARDS = [];
const DISTRICTS = JOHN.districts;
DISTRICTS.forEach((d, di) => {
  d.index = di;
  d.wards.forEach(w => {
    w.district = d;
    WARDS.push(w);
    w.hoods.forEach(h => { h.ward = w; h.district = d; HOODS.push(h); });
  });
});
const byId = {};
HOODS.forEach(h => byId[h.id] = h);
const MAXG = Math.max(...HOODS.map(h => h.greek || 0));

function themeColor(t) {
  return getComputedStyle(document.documentElement).getPropertyValue("--t-" + t).trim();
}
function fmt(n) { return n == null ? "—" : n.toLocaleString("en-US"); }
function rnd(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

/* ---------- geometry helpers ---------- */
const W = 1200, H = 1000, CX = 585, CY = 505;
function wayPoint(t, r) { // t in [0,1] along the narrative; r = radius from center
  const phi = (84 + 258 * t) * Math.PI / 180;
  return [CX + r * Math.cos(phi), CY - r * Math.sin(phi)];
}
function catmull(points, closed = false) {
  // Catmull-Rom to cubic bezier path
  const p = points.slice();
  if (p.length < 2) return "";
  if (closed) p.push(p[0], p[1], p[2]);
  let d = `M${p[0][0].toFixed(1)},${p[0][1].toFixed(1)}`;
  for (let i = 0; i < p.length - (closed ? 3 : 1); i++) {
    const p0 = p[Math.max(0, i - 1)], p1 = p[i], p2 = p[i + 1], p3 = p[Math.min(p.length - 1, i + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  if (closed) d += "Z";
  return d;
}
function convexHull(pts) {
  const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [], upper = [];
  for (const pt of p) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], pt) <= 0) lower.pop();
    lower.push(pt);
  }
  for (let i = p.length - 1; i >= 0; i--) {
    const pt = p[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], pt) <= 0) upper.pop();
    upper.push(pt);
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}
function blobAround(circles, pad) {
  // sample points around each circle, hull, wobble, smooth
  const pts = [];
  circles.forEach((c, ci) => {
    for (let k = 0; k < 10; k++) {
      const a = k / 10 * Math.PI * 2;
      pts.push([c.x + (c.r + pad) * Math.cos(a), c.y + (c.r + pad) * Math.sin(a)]);
    }
  });
  let hull = convexHull(pts);
  // wobble outward a touch for a hand-drawn feel
  const cx = hull.reduce((s, p) => s + p[0], 0) / hull.length;
  const cy = hull.reduce((s, p) => s + p[1], 0) / hull.length;
  hull = hull.map((p, i) => {
    const dx = p[0] - cx, dy = p[1] - cy, L = Math.hypot(dx, dy) || 1;
    const w = 1 + (rnd(i * 7 + cx) - 0.5) * 0.05;
    return [cx + dx * w, cy + dy * w];
  });
  return catmull(hull, true);
}

/* ---------- organic layout ---------- */
function layoutOrganic() {
  const BASE_R = 315;
  HOODS.forEach((h, i) => {
    const t = h.mid / TOTAL;
    let r = BASE_R + ((i % 2 === 0) ? -1 : 1) * (42 + rnd(i) * 26);
    if (h.district.outside) r = 535 + rnd(i) * 18;      // harbor: beyond the wall
    const [x, y] = wayPoint(t, r);
    h.r = Math.max(7, 1.35 * Math.sqrt(h.greek || 25));
    h.x = h.tx = x; h.y = h.ty = y;
  });
  // annex
  const AX = JOHN.annex;
  { const [x, y] = wayPoint(AX.mid / TOTAL, 470); AX.x = AX.tx = x; AX.y = AX.ty = y; AX.r = Math.max(7, 1.35 * Math.sqrt(AX.greek)); }
  // collision relaxation (deterministic)
  const all = HOODS.concat([AX]);
  for (let it = 0; it < 220; it++) {
    for (let a = 0; a < all.length; a++) {
      for (let b = a + 1; b < all.length; b++) {
        const A = all[a], B = all[b];
        const dx = B.x - A.x, dy = B.y - A.y;
        const d = Math.hypot(dx, dy) || 0.01, min = A.r + B.r + 5;
        if (d < min) {
          const push = (min - d) / 2, ux = dx / d, uy = dy / d;
          A.x -= ux * push; A.y -= uy * push;
          B.x += ux * push; B.y += uy * push;
        }
      }
    }
    all.forEach(h => { h.x += (h.tx - h.x) * 0.02; h.y += (h.ty - h.y) * 0.02; });
  }
  // pin the annex just outside the wall at its own angle
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

/* ---------- the Way as a hard corridor (identical to app3d.js) ---------- */
const ROAD_HALF = 9;
let WAYPTS = null;
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
function buildWay() {
  const AX = JOHN.annex;
  const ordered = WARDS.slice().sort((a, b) => a.mid - b.mid);
  const T_IN = -0.008;
  const gate = wayPoint(T_IN, 462);
  const port = wayPoint(1.028, 545);
  // radial entry + ring-clamped ward control points — identical to app3d.js and
  // src/plan.js, so the three views stay the same city (verify_parity.mjs)
  const ringPt = w => {
    if (w.district.outside) return [w.cx, w.cy];
    const dx = w.cx - CX, dy = w.cy - CY, r = Math.hypot(dx, dy) || 1;
    const clamped = Math.max(315 - 25, Math.min(315 + 25, r));
    return [CX + dx / r * clamped, CY + dy / r * clamped];
  };
  WAYPTS = [wayPoint(-0.036, 575),
            wayPoint(T_IN, 500), gate, wayPoint(T_IN, 415)]
    .concat(ordered.map(ringPt), [port]);
  WAYPTS.gate = gate; WAYPTS.port = port;
  const WAY = catmullSample(WAYPTS, 24);
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
}

/* ---------- theme ways: 2D-only until slice 2 ----------
   NOT mirrored in app3d.js or src/plan.js and NOT parity-checked: the 2D map is their
   only consumer, and a copy with no consumer would be a second home that drifts. Slice 2
   moves them into src/plan.js together with their parity check. Pure: no DOM, no globals
   written. Exercised in node by scripts/verify_ways.mjs through the same slice of this
   file that verify_parity.mjs evaluates.

   A theme way joins its member blocks in verse order. The line must not read as touching
   a block it does not touch, so samples are pushed clear of every NON-member block; stops
   stay pinned at member centres. Where two non-member blocks sit closer than the way is
   wide, no route exists between them; that crossing is certified, drawn as a bridge and
   disclosed, never hidden. */
const WAY_ROUTE = {
  PER: 32,          // catmull samples per stop-to-stop hop
  STEP: 2,          // densify so no two samples are further apart (plan units)
  ITERS: 80,        // push/smooth rounds
  SETTLE: 12,       // pushes after the last smooth, so the route ends satisfied, not smoothed
  SMOOTH: 0.5,      // pull each free sample this far toward its neighbours' midpoint
  MARGIN: 1.5,      // clearance beyond the stroke edge a pushed sample must keep
  ROUND_TOL: 0.01,  // the drawn path is rounded to 2 decimals (≤ 0.0071 u); keep this much clear
  NORMAL_DEG: 30,   // radial push within this angle of the tangent → push along the normal
  STUB_PAD: 0.6, STUB_FRAC: 0.55, STUB_CAP: 34,   // single-block themes (see wayStub)
};

function wayStops(theme) {
  return theme.blocks.map(id => {
    const h = byId[id];
    if (!h) throw new Error(`theme way ${theme.key}: unknown block ${id}`);
    return h;
  }).sort((a, b) => a.v0 - b.v0);
}

// every block the way must not appear to touch; the annex as drawn (its blob is r + 6)
function wayObstacles(theme) {
  const mine = new Set(theme.blocks);
  const obs = HOODS.filter(h => !mine.has(h.id)).map(h => ({ id: h.id, x: h.x, y: h.y, r: h.r }));
  const AX = JOHN.annex;
  if (AX && !mine.has(AX.id)) obs.push({ id: AX.id, x: AX.x, y: AX.y, r: AX.r + 6 });
  return obs;
}

// closest point on segment ab to p: [distance, x, y]
function segClosest(px, py, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy;
  let t = L2 ? ((px - a[0]) * dx + (py - a[1]) * dy) / L2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const x = a[0] + t * dx, y = a[1] + t * dy;
  return [Math.hypot(px - x, py - y), x, y];
}

// the centre-to-centre curve, densified to STEP, with the stops marked as pinned
function wayRaw(stops) {
  const R = WAY_ROUTE, ctrl = stops.map(h => [h.x, h.y]);
  const raw = catmullSample(ctrl, R.PER), pts = [], pinned = [];
  for (let i = 0; i < raw.length; i++) {
    if (i > 0) {
      const a = raw[i - 1], b = raw[i], n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / R.STEP);
      for (let k = 1; k < n; k++) { pts.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]); pinned.push(false); }
    }
    const stop = i % R.PER === 0;
    // a stop is the member centre itself, not a sample that happens to be near it
    pts.push(stop ? ctrl[i / R.PER].slice() : raw[i].slice()); pinned.push(stop);
  }
  return { pts, pinned };
}

function wayRoute(stops, obstacles, hw) {
  const R = WAY_ROUTE, { pts, pinned } = wayRaw(stops);
  const cosNear = Math.cos(R.NORMAL_DEG * Math.PI / 180);
  /* Averaged projection (Cimmino): each sample moves by the MEAN of the pushes every
     violated block asks for. Applied one block at a time instead, the last block processed
     wins, and in a neck between two blocks the line ends a full MARGIN from one and flush
     against the other. Averaged, opposed pushes balance and the line settles in the middle
     of the neck; where the neck is narrower than the stroke it stays crossed — a pinch. */
  const pushOf = (p, i, o) => {
    const need = o.r + hw + R.MARGIN, dx = p[0] - o.x, dy = p[1] - o.y, d = Math.hypot(dx, dy);
    if (d >= need) return null;
    if (d > 1e-9) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      let tx = b[0] - a[0], ty = b[1] - a[1];
      const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
      if (Math.abs((dx * tx + dy * ty) / d) < cosNear)
        return [o.x + dx / d * need - p[0], o.y + dy / d * need - p[1]];          // radial
      // the block sits (nearly) on the line: a radial push would only slide the sample
      // along it, so step sideways along the normal, on the side the sample leans to
      const nx = -ty, ny = tx, along = dx * nx + dy * ny, perp = dx * tx + dy * ty;
      const s = (along < 0 ? -1 : 1) * Math.sqrt(Math.max(0, need * need - perp * perp)) - along;
      return [nx * s, ny * s];
    }
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    let tx = b[0] - a[0], ty = b[1] - a[1];
    const tl = Math.hypot(tx, ty) || 1;
    return [-ty / tl * need, tx / tl * need];                                     // exactly on the centre: left
  };
  const push = () => {
    for (let i = 0; i < pts.length; i++) {
      if (pinned[i]) continue;
      const p = pts[i];
      let sx = 0, sy = 0, n = 0;
      for (const o of obstacles) {
        const v = pushOf(p, i, o);
        if (v) { sx += v[0]; sy += v[1]; n++; }
      }
      if (n) { p[0] += sx / n; p[1] += sy / n; }
    }
  };
  const smooth = () => {
    const prev = pts.map(q => q.slice());
    for (let i = 1; i < pts.length - 1; i++) {
      if (pinned[i]) continue;
      const mx = (prev[i - 1][0] + prev[i + 1][0]) / 2, my = (prev[i - 1][1] + prev[i + 1][1]) / 2;
      pts[i][0] += (mx - pts[i][0]) * R.SMOOTH; pts[i][1] += (my - pts[i][1]) * R.SMOOTH;
    }
  };
  for (let it = 0; it < R.ITERS; it++) { push(); smooth(); }
  for (let it = 0; it < R.SETTLE; it++) push();   // end on pushes, so smoothing never has the last word
  return { pts, pinned };
}

/* A crossing is the drawn stroke overlapping a non-member disc: some SEGMENT (not just a
   sample) within o.r + hw of its centre. It is certified — a pinch no route can clear —
   only when a second non-member B leaves a gap to o narrower than the stroke itself
   (< 2·hw) AND B is also in the way's path at that point. Anything else is a routing
   failure. Returns every crossing, certified or not, plus the least segment clearance
   the route keeps from any obstacle it does NOT cross (the floor's safety budget). */
function wayCrossings(pts, obstacles, hw) {
  const out = [];
  let clearMin = Infinity;
  for (const o of obstacles) {
    let best = Infinity, bx = 0, by = 0;
    for (let i = 1; i < pts.length; i++) {
      const [d, x, y] = segClosest(o.x, o.y, pts[i - 1], pts[i]);
      if (d < best) { best = d; bx = x; by = y; }
    }
    if (best >= o.r + hw) { clearMin = Math.min(clearMin, best - o.r - hw); continue; }
    const pinch = obstacles.find(B => B !== o &&
      Math.hypot(B.x - o.x, B.y - o.y) - o.r - B.r < 2 * hw &&
      Math.hypot(B.x - bx, B.y - by) < B.r + hw + WAY_ROUTE.MARGIN);
    out.push({ id: o.id, certifiedBy: pinch ? pinch.id : null,
               gap: pinch ? Math.hypot(pinch.x - o.x, pinch.y - o.y) - o.r - pinch.r : null });
  }
  out.clearMin = clearMin;
  return out;
}

// certified crossings come in pairs (A pinched by B, B by A): report each neck once
function wayPinches(crossings) {
  const seen = new Set(), out = [];
  for (const c of crossings) {
    if (!c.certifiedBy) continue;
    const k = [c.id, c.certifiedBy].sort().join("|");
    if (seen.has(k)) continue;
    seen.add(k);
    const [a, b] = k.split("|");
    out.push({ a, b, gap: c.gap });
  }
  return out;
}

/* How far a way may be widened (in total) by the one-screen-pixel legibility floor without
   reaching a block it does not touch: twice the clearance its route actually keeps, less the
   rounding of the drawn path. Derived from the route, never a fixed budget: a route centred
   in a tight neck keeps only the slack the neck allows. */
function wayFloorCap(geom) {
  const c = geom.crossings.clearMin;
  return 2 * Math.max(0, (c === Infinity ? 1e9 : c) - WAY_ROUTE.ROUND_TOL);
}

/* A single-block theme has no route: it is drawn as a short arc hugging its block, centred
   on the bearing to the nearest neighbouring block. Its position and length are OURS, not
   data, and the key says so. */
function wayStub(h, hw) {
  const R = WAY_ROUTE, others = HOODS.concat(JOHN.annex ? [JOHN.annex] : []).filter(o => o !== h);
  let near = null, best = Infinity;
  for (const o of others) {
    const g = Math.hypot(o.x - h.x, o.y - h.y) - o.r - h.r;
    if (g < best) { best = g; near = o; }
  }
  const rad = h.r + hw + R.STUB_PAD, want = R.STUB_FRAC * 2 * Math.PI * h.r, L = Math.min(want, R.STUB_CAP);
  const mid = Math.atan2(near.y - h.y, near.x - h.x), half = L / rad / 2;
  const pts = [];
  for (let k = 0; k <= 24; k++) { const a = mid - half + 2 * half * k / 24; pts.push([h.x + rad * Math.cos(a), h.y + rad * Math.sin(a)]); }
  return { cx: h.x, cy: h.y, R: rad, a0: mid - half, a1: mid + half, L, capBinds: want > R.STUB_CAP, nearest: near.id, pts };
}

// every figure the map shows about a way is computed here, once, from the data
function wayGeometry(theme, hw) {
  const stops = wayStops(theme), obstacles = wayObstacles(theme);
  if (stops.length === 1) {
    const stub = wayStub(stops[0], hw);
    return { stub, stops, obstacles, crossings: wayCrossings(stub.pts, obstacles, hw) };
  }
  const route = wayRoute(stops, obstacles, hw);
  return { route, stops, obstacles, crossings: wayCrossings(route.pts, obstacles, hw) };
}

/* ---------- svg helpers ---------- */
const svg = document.getElementById("map");
const NS = "http://www.w3.org/2000/svg";
function el(name, attrs, parent) {
  const e = document.createElementNS(NS, name);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  (parent || svg).appendChild(e);
  return e;
}
function txt(parent, x, y, str, cls, attrs) {
  const t = el("text", Object.assign({ x, y, "class": cls }, attrs || {}), parent);
  t.textContent = str;
  return t;
}

/* ---------- shared interactive bits ---------- */
const tooltip = document.getElementById("tooltip");
let selectedId = null;

function hoodTooltip(h) {
  const th = JOHN.themes[h.theme];
  return `<div class="tt-name">${h.short}</div>
    <div class="tt-ref">John ${h.ref}${h.chiasm ? " · chiasm " + h.chiasm : ""}</div>
    <div class="tt-path">${h.district ? h.district.short + " › " + h.ward.short : "Outside the wall"}</div>
    <div class="tt-stats"><span><b>${fmt(h.verses)}</b> vv</span><span><b>${fmt(h.greek)}</b> Greek</span><span><b>${fmt(h.eng)}</b> English</span></div>
    <div class="tt-theme"><span class="swatch" style="background:var(--t-${h.theme})"></span>${th ? th.label : h.theme}</div>`;
}
function showTip(html, ev) {
  tooltip.innerHTML = html;
  tooltip.style.display = "block";
  moveTip(ev);
}
function moveTip(ev) {
  const st = document.getElementById("stage").getBoundingClientRect();
  let x = ev.clientX - st.left + 14, y = ev.clientY - st.top + 14;
  const tw = tooltip.offsetWidth, thh = tooltip.offsetHeight;
  if (x + tw > st.width - 8) x = ev.clientX - st.left - tw - 12;
  if (y + thh > st.height - 8) y = ev.clientY - st.top - thh - 12;
  tooltip.style.left = x + "px"; tooltip.style.top = y + "px";
}
function hideTip() { tooltip.style.display = "none"; }

function attachHood(elm, h) {
  elm.addEventListener("pointerenter", ev => showTip(hoodTooltip(h), ev));
  elm.addEventListener("pointermove", moveTip);
  elm.addEventListener("pointerleave", hideTip);
  elm.addEventListener("click", ev => { ev.stopPropagation(); openHood(h); });
  elm.setAttribute("tabindex", "0");
  elm.setAttribute("role", "button");
  elm.setAttribute("aria-label", `${h.short}, John ${h.ref}`);
  elm.addEventListener("keydown", ev => {
    if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); openHood(h); }
  });
}

/* ---------- detail panel ---------- */
const panel = document.getElementById("panel");
const panelBody = document.getElementById("panel-body");
function closePanel() {
  panel.classList.remove("open");
  selectedId = null;
  document.querySelectorAll(".hood.selected").forEach(e => e.classList.remove("selected"));
}
window.closePanel = closePanel;

function statBlock(o) {
  return `<div class="statrow">
    <div class="stat"><b>${fmt(o.verses)}</b><span>verses</span></div>
    <div class="stat"><b>${fmt(o.greek)}</b><span>Greek words</span></div>
    <div class="stat"><b>${fmt(o.eng)}</b><span>English words</span></div>
  </div>`;
}
function buildingKind(g) {
  if (g == null) return "";
  if (g >= 500) return "Mega-complex / Forum";
  if (g >= 250) return "Civic hall";
  if (g >= 150) return "Commercial block";
  return "Pocket park / gatehouse";
}
function openHood(h) {
  selectedId = h.id;
  document.querySelectorAll(".hood.selected").forEach(e => e.classList.remove("selected"));
  document.querySelectorAll(`[data-hood="${h.id}"]`).forEach(e => e.classList.add("selected"));
  // if the subject would be hidden behind the panel, pan it into view
  if (view !== "index") {
    const ax = view === "organic" ? h.x : h.lx, ay = view === "organic" ? h.y : h.ly;
    if (ax != null) {
      const r = svg.getBoundingClientRect();
      const sc = Math.min(r.width / vb.w, r.height / vb.h);
      const ox = (r.width - vb.w * sc) / 2;
      const screenX = (ax - vb.x) * sc + ox;
      if (screenX > r.width - 370) { vb.x += (screenX - (r.width - 390)) / sc; setVB(); }
    }
  }
  const th = JOHN.themes[h.theme];
  let html = `<div class="crumb">${h.district ? h.district.short + " › " + h.ward.short : "Outside the city wall"}</div>
    <h2>${h.short}</h2><div class="ref">John ${h.ref} · ${buildingKind(h.greek)}</div>
    <div class="themechip"><span class="swatch" style="background:var(--t-${h.theme})"></span>${th ? th.label : h.theme}${h.chiasm ? " · chiasm " + h.chiasm : ""}</div>
    ${statBlock(h)}
    <div class="full-desc">${h.desc}</div>`;
  if (h.note) html += `<div class="note">${h.note}</div>`;
  if (h.details && h.details.length) {
    html += `<h3>Inside this block</h3>` + h.details.map(d =>
      `<div class="detail-item"><span>${d.desc}</span><span class="g">${d.greek != null ? d.greek + " gw" : ""}</span></div>`).join("");
  }
  if (window.ChiasmUI) html += window.ChiasmUI.renderHood(h.id, {});
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
    html += `<h3>Ward</h3><div class="full-desc">${h.ward.desc}${h.ward.note ? "<br><em style='color:var(--muted);font-size:12px'>" + h.ward.note + "</em>" : ""}</div>`;
    html += `<h3>District</h3><div class="full-desc"><b>${h.district.short}</b> (John ${h.district.ref}) — ${h.district.desc}</div>`;
  }
  panelBody.innerHTML = html;
  panelBody.querySelectorAll("[data-open]").forEach(r =>
    r.addEventListener("click", () => openHood(byId[r.dataset.open])));
  if (window.ChiasmUI) window.ChiasmUI.bind(panelBody, { onOpenHood: id => openHood(byId[id]) });
  panel.classList.add("open");
}
function openDistrict(d) {
  let html = `<div class="crumb">District · John ${d.ref}</div><h2>${d.short}</h2>
    <div class="ref">John ${d.ref}</div>${statBlock(d)}
    <div class="full-desc">${d.desc}</div><h3>Wards</h3>`;
  d.wards.forEach(w => {
    html += `<div class="detail-item"><span><b>${w.short}</b> · ${w.ref}</span><span class="g">${fmt(w.greek)} gw</span></div>`;
  });
  panelBody.innerHTML = html;
  panel.classList.add("open");
}

/* ---------- I AM star ---------- */
function starPath(cx, cy, R) {
  let d = "";
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 === 0 ? R : R * 0.42;
    d += (i === 0 ? "M" : "L") + (cx + r * Math.cos(a)).toFixed(1) + "," + (cy + r * Math.sin(a)).toFixed(1);
  }
  return d + "Z";
}
function iamHood(iam) {
  return HOODS.find(h => h.v0 <= iam.v && iam.v <= h.v1);
}

/* ---------- THEME WAYS: state, drawing ---------- */
/* PaulDz's theme lists (data/themes.json) with our proposed way type per theme
   (data/way-types.json, derived from verse-count bands). The page READS t.way and never
   re-bands: one home for the assignment. Which ways are shown is URL state, ?ways=a,b —
   a link is the whole review artefact. */
const WAYDATA = (typeof window.JOHN_WAYTHEMES === "object" && typeof window.JOHN_WAYS === "object")
  ? { themes: window.JOHN_WAYTHEMES.themes, types: window.JOHN_WAYS.types, status: window.JOHN_WAYS.status } : null;
const WAY_THEME = new Map(WAYDATA ? WAYDATA.themes.map(t => [t.key, t]) : []);
const WAY_TYPE = new Map(WAYDATA ? WAYDATA.types.map(t => [t.key, t]) : []);
const WAYS_MAX = 4;
const WAYS = { shown: [], rejects: [] };

/* Each type is a stack of strokes, outermost first: [colour class, width as a fraction of the
   type's drawn width, dash]. Presentation constants — the widths themselves live in
   data/way-types.json. Dashed layers use butt caps, or the dashes would grow round ends. */
const WAY_TREATMENT = {
  via:        [["casing", 1], ["fill", 0.82], ["center", 0.07, "10 6"]],     // paved, with a crown line
  vicus:      [["casing", 1], ["fill", 0.78], ["kerb", 0.40], ["fill", 0.29]], // two cart ruts
  clivus:     [["casing", 1], ["kerb", 0.62], ["fill", 0.50], ["kerb", 0.5, "0.8 5.2"]], // gutters + traction grooves
  semita:     [["kerb", 1], ["fill", 0.5]],                                    // a deck on a heavy kerb
  angiportus: [["shade", 1], ["fill", 0.5]],                                   // an unlit lane
  ambitus:    [["shade", 1, "1.6 2.4"]],                                       // a broken slit between walls
};

function parseWaysParam(search) {
  WAYS.shown = []; WAYS.rejects = [];
  const raw = new URLSearchParams(search).get("ways");
  if (!raw || !WAYDATA) return;
  const seen = new Set();
  for (const k of raw.split(",").map(x => x.trim()).filter(Boolean)) {
    const t = WAY_THEME.get(k);
    if (seen.has(k)) { WAYS.rejects.push({ key: k, why: "duplicate" }); continue; }
    seen.add(k);
    if (!t) WAYS.rejects.push({ key: k, why: "unknown" });
    else if (t.parent) WAYS.rejects.push({ key: k, why: "child", parent: t.parent });
    else if (WAYS.shown.length >= WAYS_MAX) WAYS.rejects.push({ key: k, why: "cap" });
    else WAYS.shown.push(k);
  }
}

/* scale: the Way's drawn casing over its plan width (2 × ROAD_HALF), read from the page's own
   CSS so a change to either moves every theme way with it */
function wayScale() {
  const probe = svg.querySelector(".way-casing");
  const w = probe ? parseFloat(getComputedStyle(probe).strokeWidth) : NaN;
  return Number.isFinite(w) && w > 0 ? w / (2 * ROAD_HALF) : null;
}
const WAY_GEOM = new Map();   // key -> geometry; blocks never move after layout
function wayGeomFor(t, hw) {
  const k = t.key + "@" + hw.toFixed(4);
  if (!WAY_GEOM.has(k)) WAY_GEOM.set(k, wayGeometry(t, hw));
  return WAY_GEOM.get(k);
}
const polyD = pts => "M" + pts.map(p => p[0].toFixed(2) + "," + p[1].toFixed(2)).join("L");

// one drawn way (or a key swatch): the treatment's stroke stack along a path
function drawWayStack(parent, type, d, w, cls, attrs) {
  const g = el("g", Object.assign({ "class": `${cls} way-${type}` }, attrs || {}), parent);
  WAY_TREATMENT[type].forEach(([c, frac, dash], i) => {
    el("path", Object.assign({
      d, "class": `wl wl-${c}${i === 0 ? " wl-outer" : ""}`, "stroke-width": +(frac * w).toFixed(3),
      "stroke-linecap": dash ? "butt" : "round",
    }, dash ? { "stroke-dasharray": dash } : {}), g);
  });
  return g;
}

function drawShownWays(gWays, gBridges, gBadges) {
  if (!WAYDATA || !WAYS.shown.length) return;
  const scale = wayScale();
  if (!scale) return;
  // paint narrow first, so a wider way stays continuous across a junction
  const order = WAYS.shown.map((k, i) => ({ k, i, t: WAY_THEME.get(k) }))
    .sort((a, b) => WAY_TYPE.get(a.t.way).widthPlan - WAY_TYPE.get(b.t.way).widthPlan || a.i - b.i);
  const defs = el("defs", {}, gBridges);
  const onBlock = new Map();   // block id -> shown ways touching it, in shown order
  for (const { k, i, t } of order) {
    const w = WAY_TYPE.get(t.way).widthPlan * scale, hw = w / 2;
    const g = wayGeomFor(t, hw);
    const pts = g.stub ? g.stub.pts : g.route.pts, d = polyD(pts);
    const cap = +wayFloorCap(g).toFixed(4);
    drawWayStack(gWays, t.way, d, w, "way", Object.assign({ "data-way": k, "data-n": i + 1, "data-w": +w.toFixed(4), "data-cap": cap },
      g.stub ? { "data-stub": g.stops[0].id } : {}));
    // a certified pinch: no room between two blocks the way is not on, so it passes over
    // them — drawn above the block as an overpass and named in the key, never hidden
    for (const c of g.crossings.filter(c => c.certifiedBy)) {
      const o = g.obstacles.find(o => o.id === c.id), cid = `bridge-${k}-${c.id}`;
      const cp = el("clipPath", { id: cid }, defs);
      el("circle", { cx: o.x, cy: o.y, r: o.r + hw + 1 }, cp);
      drawWayStack(gBridges, t.way, d, w, "way-bridge", { "data-way": k, "data-bridge": c.id, "clip-path": `url(#${cid})`,
        "data-w": +w.toFixed(4), "data-cap": cap });
    }
    for (const h of g.stops) {
      if (!onBlock.has(h.id)) onBlock.set(h.id, []);
      onBlock.get(h.id).push({ k, n: i + 1 });
    }
  }
  // badges: one numbered disc per (way, block it touches), on the block's west edge
  for (const [id, list] of onBlock) {
    const h = byId[id];
    list.sort((a, b) => a.n - b.n).forEach((e, j) => {
      const a = Math.PI + (j - (list.length - 1) / 2) * 0.6;
      const bg = el("g", { "class": "way-badge", "data-way": e.k, "data-badge": id, "aria-hidden": "true",
        transform: `translate(${(h.x + h.r * Math.cos(a)).toFixed(2)},${(h.y + h.r * Math.sin(a)).toFixed(2)})` }, gBadges);
      el("circle", { cx: 0, cy: 0 }, bg);
      const tx = el("text", { x: 0, y: 0 }, bg); tx.textContent = String(e.n);
    });
  }
}

// dimming: blocks on no shown way are desaturated (never faded); called after every render
function applyWays() {
  const shown = WAYS.shown.map(k => WAY_THEME.get(k)).filter(Boolean);
  const on = new Set(shown.flatMap(t => t.blocks));
  svg.querySelectorAll(".hood[data-hood]").forEach(e =>
    e.classList.toggle("dimmed", shown.length > 0 && !on.has(e.dataset.hood)));
  renderKey();
  syncChrome();
}

/* ---------- THEME WAYS: the key ---------- */
/* Built with DOM calls and textContent only — never an innerHTML template — so a crafted
   ?ways= key is shown as inert text. Every figure is read from the data or computed by the
   same functions the node gate checks; none is typed here. */
function dom(tag, cls, text, parent) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  if (parent) parent.appendChild(e);
  return e;
}
const plural = (n, one, many) => `${fmt(n)} ${n === 1 ? one : (many || one + "s")}`;
const blockName = id => (byId[id] || (JOHN.annex && JOHN.annex.id === id ? JOHN.annex : null) || { short: id }).short;

// the band a type occupies, from its own floor and the next wider type's floor
function wayBand(typeKey) {
  const types = WAYDATA.types, i = types.findIndex(t => t.key === typeKey), lo = types[i].minVerses;
  return i === 0 ? `≥ ${lo}` : `${lo}–${types[i - 1].minVerses - 1}`;
}

function wayKeyRow(parent, k, n, scale) {
  const t = WAY_THEME.get(k), ty = WAY_TYPE.get(t.way), w = ty.widthPlan * scale, g = wayGeomFor(t, w / 2);
  const row = dom("div", "wk-row", null, parent);
  row.dataset.way = k;
  const head = dom("div", "wk-head", null, row);
  dom("span", "wk-n", String(n), head).setAttribute("aria-hidden", "true");
  dom("span", "wk-label", t.label, head);
  const x = dom("button", "wk-x", "×", head);
  x.type = "button";
  x.setAttribute("aria-label", `Remove ${t.label}`);
  x.addEventListener("click", () => removeWay(k));
  // swatch: the same stroke stack as the map, at true relative width
  const type = dom("div", "wk-type", null, row);
  const sw = document.createElementNS(NS, "svg");
  sw.setAttribute("width", "46"); sw.setAttribute("height", "16"); sw.setAttribute("aria-hidden", "true");
  type.appendChild(sw);
  const k12 = 12 / (WAYDATA.types[0].widthPlan * scale);    // the widest type fills 12 px
  drawWayStack(sw, t.way, "M5,8L41,8", w * k12, "way-swatch");
  dom("span", null, `${ty.label} — ${ty.gloss}`, type);
  const refs = t.refs.length <= 3 ? ` · ${t.refs.join(", ")}` : "";
  dom("div", "wk-facts", `${plural(t.verses, "verse")} → ${ty.label} (band ${wayBand(t.way)}) · ` +
    `${plural(t.blocks.length, "block")} · Greek ≈ ${fmt(t.greek)} (est.)${refs}`, row);
  if (g.stub) dom("div", "wk-note wk-stub", "One block: drawn as a stub beside it — its position and length are not data.", row);
  const pinches = wayPinches(g.crossings);
  if (pinches.length) {
    const note = dom("div", "wk-note wk-pinch", `Too wide for ${plural(pinches.length, "gap")} between blocks it is not on, so it passes over both at each: `, row);
    pinches.forEach((q, i) => {
      const sp = dom("span", null, `${i ? " · " : ""}${blockName(q.a)} & ${blockName(q.b)} (${q.gap.toFixed(1)} apart)`, note);
      sp.dataset.pinch = [q.a, q.b].sort().join("|");
    });
  }
}

function renderKey() {
  const key = document.getElementById("waykey");
  if (!key) return;
  key.replaceChildren();
  if (!WAYDATA || !WAYS.shown.length) return;
  const scale = wayScale();
  if (!scale) return;
  key.tabIndex = -1;
  // the status qualifies every row, so it is read first — never scrolled below them
  const st = dom("p", "wk-head-status", "Way types: ", key);
  dom("span", "wk-status", WAYDATA.status, st);
  WAYS.shown.forEach((k, i) => wayKeyRow(key, k, i + 1, scale));
  const foot = dom("div", "wk-foot", null, key);
  dom("p", null, "Verses and blocks are PaulDz's lists; each way's type is derived from its verse count.", foot);
  dom("p", null, "Lines join each theme's blocks in verse order; the route between blocks is schematic.", foot);
  dom("p", null, "Theme ways pass beneath the city wall; they make no gates.", foot);
  for (const r of WAYS.rejects) {
    const text = r.why === "unknown" ? `Not a theme: “${r.key}”.`
      : r.why === "child" ? `“${WAY_THEME.get(r.key).label}” is inside ${WAY_THEME.get(r.parent).label}; its verses are counted in that way.`
      : r.why === "duplicate" ? `“${r.key}” was listed twice; shown once.`
      : `At most ${WAYS_MAX} ways at once; “${r.key}” was left out.`;
    dom("p", "wk-reject", text, foot);
  }
}

/* The URL is the review artefact: rewrite ?ways= by hand (URLSearchParams would encode the
   comma as %2C), keep every other parameter and the hash. Sandboxed frames — artifact
   previews — may refuse history writes; the map stays right either way. */
function writeWaysURL() {
  try {
    const q = new URLSearchParams(location.search);
    q.delete("ways");
    const parts = [q.toString(), WAYS.shown.length ? "ways=" + WAYS.shown.join(",") : ""].filter(Boolean);
    history.replaceState(null, "", location.pathname + (parts.length ? "?" + parts.join("&") : "") + location.hash);
  } catch (e) { /* no history API here: nothing to do */ }
}

function removeWay(k) {
  WAYS.shown = WAYS.shown.filter(x => x !== k);
  WAYS.rejects = [];
  writeWaysURL();
  if (typeof refreshWayToggles === "function") refreshWayToggles();
  renderOrganic();
  const key = document.getElementById("waykey");
  if (key && !key.hidden) key.focus();
}

/* One owner for the chrome the ways affect: the hint yields to the key, and the key shows
   only on the organic map. "" hands the hint back to the stylesheet (its ≤900px rule),
   which an inline "block" used to override after any view switch. */
function syncChrome() {
  const showing = !!(WAYDATA && WAYS.shown.length);
  const hint = document.getElementById("hint"), key = document.getElementById("waykey");
  if (hint) hint.style.display = (view === "index" || showing) ? "none" : "";
  if (key) key.hidden = !(view === "organic" && showing);
}

/* ---------- THEME WAYS: fit and legibility floor ---------- */
/* Fit the view to the shown ways, inside the part of the map the key and the controls leave
   free. The viewBox keeps the svg's own aspect, so "meet" never letterboxes it and the free
   area maps exactly. Runs when the ways change, never on pan or zoom. */
function fitToWays() {
  if (!WAYDATA || !WAYS.shown.length) return;
  const scale = wayScale();
  if (!scale) return;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const add = (x, y, r) => { x0 = Math.min(x0, x - r); y0 = Math.min(y0, y - r); x1 = Math.max(x1, x + r); y1 = Math.max(y1, y + r); };
  for (const k of WAYS.shown) {
    const t = WAY_THEME.get(k), w = WAY_TYPE.get(t.way).widthPlan * scale, g = wayGeomFor(t, w / 2);
    for (const h of g.stops) add(h.x, h.y, h.r);
    for (const p of (g.stub ? g.stub.pts : g.route.pts)) add(p[0], p[1], w / 2);
  }
  const PAD = 40;
  x0 -= PAD; y0 -= PAD; x1 += PAD; y1 += PAD;
  const sr = svg.getBoundingClientRect();
  if (!sr.width || !sr.height) return;
  const free = { l: sr.left, t: sr.top, r: sr.right, b: sr.bottom };
  const ctl = document.getElementById("controls"), key = document.getElementById("waykey");
  const cr = ctl && getComputedStyle(ctl).display !== "none" && !ctl.classList.contains("hidden") ? ctl.getBoundingClientRect() : null;
  if (cr && cr.width) free.l = Math.max(free.l, cr.right + 8);
  const kr = key && !key.hidden ? key.getBoundingClientRect() : null;
  if (kr && kr.width) {
    if (kr.width > sr.width * 0.6) free.b = Math.min(free.b, kr.top - 8);   // a bottom sheet (phone)
    else free.r = Math.min(free.r, kr.left - 8);                              // a side card
  }
  const fw = Math.max(40, free.r - free.l), fh = Math.max(40, free.b - free.t);
  const bw = x1 - x0, bh = y1 - y0;
  let s = Math.min(fw / bw, fh / bh);                         // CSS px per plan unit
  const w = Math.min(3200, Math.max(300, sr.width / s));       // the existing zoom clamp
  s = sr.width / w;
  vb = { w, h: sr.height / s,
         x: x0 - (free.l - sr.left) / s - (fw / s - bw) / 2,
         y: y0 - (free.t - sr.top) / s - (fh / s - bh) / 2 };
  setVB();
}

/* The legibility floor: a way thinner than one screen pixel is drawn one pixel wide, so the
   narrowest (a two-foot ambitus) stays visible on a phone. It is capped per way by the
   clearance that way's route keeps from blocks it does not touch (data-cap, from
   wayFloorCap), so widening can never make it touch one. Beyond the cap a way stays thin, and
   the key says so. One owner: re-applied on every setVB, disclosure included. */
function applyWayFloor() {
  const u = parseFloat(svg.style.getPropertyValue("--u1px")) || 1;
  let floored = 0, sub = 0;
  svg.querySelectorAll(".way[data-w], .way-bridge[data-w]").forEach(g => {
    const w = +g.dataset.w, cap = +g.dataset.cap, outer = g.querySelector(".wl-outer");
    const drawn = Math.min(Math.max(w, u), w + cap);
    outer.setAttribute("stroke-width", +drawn.toFixed(3));
    const isWay = g.classList.contains("way");
    g.toggleAttribute("data-floored", drawn > w + 1e-9);
    if (isWay && drawn > w + 1e-9) floored++;
    if (isWay && drawn < u - 1e-9) sub++;
  });
  const foot = document.querySelector("#waykey .wk-foot");
  if (!foot) return;
  foot.querySelectorAll(".wk-floor").forEach(e => e.remove());
  const anchor = foot.querySelector(".wk-reject");
  const note = text => { const e = dom("p", "wk-floor", text); foot.insertBefore(e, anchor); };
  if (floored) note(`${plural(floored, "way is", "ways are")} thinner than a screen pixel at this zoom and drawn a pixel wide so ${floored === 1 ? "it stays" : "they stay"} visible.`);
  if (sub) note(`${plural(sub, "way is", "ways are")} still thinner than a pixel here: drawing ${sub === 1 ? "it" : "them"} wider would touch blocks ${sub === 1 ? "it does" : "they do"} not touch.`);
}

/* ---------- ORGANIC VIEW ---------- */
function renderOrganic() {
  svg.innerHTML = "";
  svg.setAttribute("viewBox", "0 0 1200 1000");
  // Layer order is a claim: theme ways run UNDER the city wall (a way drawn over it would cut
  // a gap where the plan has no gate — invariant 5) and under the Johannine Way (the
  // narrative spine stays primary). Bridges and badges sit over the blocks.
  const gWater = el("g", {}), gDistrict = el("g", {}), gWays = el("g", { "class": "layer-ways" }),
        gWall = el("g", {}), gWay = el("g", {}),
        gHoods = el("g", {}),
        gWayBridges = el("g", { "class": "layer-way-bridges" }), gWayBadges = el("g", { "class": "layer-way-badges" }),
        gChiasm = el("g", { "class": "layer-chiasm" }), gIam = el("g", { "class": "layer-iam" }),
        gLabels = el("g", { "class": "layer-labels" });

  // Sea of Tiberias behind the harbor
  const seaC = wayPoint(1.035, 620);
  el("path", {
    d: catmull([[seaC[0] - 130, seaC[1] - 85], [seaC[0] + 40, seaC[1] - 120], [seaC[0] + 165, seaC[1] - 35],
                [seaC[0] + 180, seaC[1] + 90], [seaC[0] - 20, seaC[1] + 135], [seaC[0] - 150, seaC[1] + 40]], true),
    "class": "water-blob"
  }, gWater);
  txt(gWater, seaC[0] + 25, seaC[1] + 55, "SEA OF TIBERIAS", "water-label");

  // district blobs — one lobe per ward, merged into a single path, so a
  // C-shaped district doesn't get a convex hull across the central plaza
  DISTRICTS.forEach(d => {
    const lobes = d.wards.map(w =>
      blobAround(w.hoods.map(h => ({ x: h.x, y: h.y, r: h.r })), 22)).join(" ");
    const p = el("path", { d: lobes, "class": "district-blob" }, gDistrict);
    p.style.cursor = "pointer";
    p.addEventListener("click", ev => { ev.stopPropagation(); openDistrict(d); });
    const th = { title: `${d.short} — John ${d.ref}` };
    p.addEventListener("pointerenter", ev => showTip(
      `<div class="tt-name">${d.short}</div><div class="tt-ref">John ${d.ref} · District</div>
       <div class="tt-stats"><span><b>${fmt(d.greek)}</b> Greek words</span></div>`, ev));
    p.addEventListener("pointermove", moveTip);
    p.addEventListener("pointerleave", hideTip);
  });

  // city wall around the three inner districts
  const inner = DISTRICTS.filter(d => !d.outside)
    .flatMap(d => d.wards.flatMap(w => w.hoods.map(h => ({ x: h.x, y: h.y, r: h.r }))));
  const wallPath = blobAround(inner, 58);
  el("path", { d: wallPath, "class": "wall" }, gWall);
  el("path", { d: wallPath, "class": "wall-inner" }, gWall);

  // the Johannine Way through ward centers
  const gate = WAYPTS.gate, port = WAYPTS.port;
  const wayD = catmull(WAYPTS);
  el("path", { d: wayD, "class": "way-casing" }, gWay);
  el("path", { d: wayD, "class": "way-fill" }, gWay);
  el("path", { d: wayD, "class": "way-center" }, gWay);
  // entry walkways: little alleys from the road to each doorway
  HOODS.concat([JOHN.annex]).forEach(h => {
    if (!h.roadPt) return;
    const bx = h.x + Math.cos(h.doorAng) * h.r, by = h.y + Math.sin(h.doorAng) * h.r;
    const dx = bx - h.roadPt[0], dy = by - h.roadPt[1];
    const L = Math.hypot(dx, dy);
    if (L > 150 || L < 2) return;
    const sx = h.roadPt[0] + dx / L * (ROAD_HALF - 2), sy = h.roadPt[1] + dy / L * (ROAD_HALF - 2);
    el("line", { x1: sx, y1: sy, x2: bx, y2: by, stroke: "var(--road-casing)", "stroke-width": 3, "stroke-linecap": "round" }, gWay);
  });
  // gates & quay
  el("rect", { x: gate[0] - 13, y: gate[1] - 9, width: 26, height: 18, rx: 4, "class": "gate" }, gWay);
  txt(gWay, gate[0] + 24, gate[1] + 4, "WEST GATE · “In the beginning…” 1:1", "gate-label", { "text-anchor": "start" });
  el("rect", { x: port[0] - 12, y: port[1] - 8, width: 24, height: 16, rx: 3, "class": "gate" }, gWay);
  txt(gWay, port[0], port[1] + 28, "THE HARBOR · 21:25", "gate-label");

  // neighborhoods
  HOODS.forEach(h => {
    const c = el("circle", {
      cx: h.x, cy: h.y, r: h.r, "class": "hood", "data-hood": h.id,
      fill: `var(--t-${h.theme})`
    }, gHoods);
    attachHood(c, h);
    if (h.landmark) el("circle", { cx: h.x, cy: h.y, r: h.r + 3.5, "class": "hood-ring" }, gHoods);
    if (h.center) {
      el("circle", { cx: h.x, cy: h.y, r: h.r + 6.5, "class": "center-ring" }, gHoods);
      el("circle", { cx: h.x, cy: h.y, r: h.r + 9, "class": "center-ring", "stroke-dasharray": "1 3" }, gHoods);
    }
    if (h.r > 10) txt(gLabels, h.x, h.y + h.r + 9, h.short, "label-hood zoomlabel");
    else txt(gLabels, h.x, h.y + h.r + 8, h.short, "label-hood zoomlabel");
    if (h.chiasm) txt(gChiasm, h.x, h.y - h.r - 5, h.chiasm, "chiasm-badge");
  });

  // annex
  const AX = JOHN.annex;
  const ap = el("circle", { cx: AX.x, cy: AX.y, r: AX.r + 6, "class": "annex-blob" }, gHoods);
  const ac = el("circle", { cx: AX.x, cy: AX.y, r: AX.r, "class": "hood", "data-hood": "annex", fill: "var(--t-controversy)", opacity: 0.55 }, gHoods);
  attachHood(ac, AX); attachHood(ap, AX);
  txt(gLabels, AX.x, AX.y + AX.r + 16, "The Mercy Annex (7:53–8:11)", "annex-label");

  // chiasm bridges
  WARDS.forEach(w => {
    const tagged = {};
    w.hoods.forEach(h => { if (h.chiasm) tagged[h.chiasm] = h; });
    for (const tag in tagged) {
      if (tag.endsWith("′")) {
        const base = tag.slice(0, -1);
        if (tagged[base]) {
          const A = tagged[base], B = tagged[tag];
          const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2;
          const dxc = mx - CX, dyc = my - CY, L = Math.hypot(dxc, dyc) || 1;
          const cx2 = mx + dxc / L * 52, cy2 = my + dyc / L * 52;
          el("path", { d: `M${A.x},${A.y} Q${cx2},${cy2} ${B.x},${B.y}`, "class": "chiasm-arc" }, gChiasm);
        }
      }
    }
  });

  // I AM landmarks
  JOHN.iam.forEach((s, i) => {
    const h = iamHood(s);
    if (!h) return;
    const siblings = JOHN.iam.filter(z => iamHood(z) === h);
    const k = siblings.indexOf(s);
    const ang = -Math.PI / 3 + k * 0.85;
    const sx = h.x + (h.r + 8) * Math.cos(ang), sy = h.y + (h.r + 8) * Math.sin(ang);
    const st = el("path", { d: starPath(sx, sy, s.minor ? 5.5 : 7.5), "class": "iam-star" }, gIam);
    st.addEventListener("pointerenter", ev => showTip(
      `<div class="tt-name">✦ ${s.label}</div><div class="tt-ref">John ${s.ref}</div>`, ev));
    st.addEventListener("pointermove", moveTip);
    st.addEventListener("pointerleave", hideTip);
    st.addEventListener("click", ev => { ev.stopPropagation(); openHood(h); });
    txt(gIam, sx, sy - 11, s.label, "iam-label zoomlabel");
  });

  // ward labels
  WARDS.forEach(w => {
    const maxr = Math.max(...w.hoods.map(h => h.r));
    const dxc = w.cx - CX, dyc = w.cy - CY, L = Math.hypot(dxc, dyc) || 1;
    const off = w.district.outside ? 0 : (maxr + 30);
    txt(gLabels, w.cx + dxc / L * off, w.cy + dyc / L * off + 4, w.short, "label-ward");
  });
  // district labels — on the inner plaza side (short display names)
  const DNAMES = { d1: "PROLOGUE", d10: "BOOK OF SIGNS", d80: "BOOK OF GLORY", d97: "THE HARBOR" };
  DISTRICTS.forEach(d => {
    let x, y;
    if (d.outside) {
      x = d.wards[0].cx - 10; y = Math.max(...d.wards.flatMap(w => w.hoods.map(h => h.y + h.r))) + 34;
    } else if (d.id === "d80") {
      [x, y] = wayPoint(d.mid / TOTAL, 520);   // Glory: outside the wall, bottom
    } else {
      [x, y] = wayPoint(d.mid / TOTAL, d.id === "d1" ? 170 : 200);
    }
    const lbl = txt(gLabels, x, y, DNAMES[d.id] || d.short.toUpperCase(), "label-district");
    if (d.outside) lbl.style.fontSize = "15px";
  });
  // central plaza note
  txt(gLabels, CX + 40, CY - 64, "879 verses from gate to harbor", "label-ward", { "opacity": 0.8 });
  txt(gLabels, CX + 40, CY - 46, "bubble size ≈ Greek word count", "label-ward", { "opacity": 0.6 });
  // compass
  const comp = el("g", { "class": "compass", transform: "translate(72,86)" });
  el("path", { d: "M0,-26 L7,8 L0,2 L-7,8 Z", "class": "compass" }, comp);
  txt(comp, 0, -32, "N", "label-ward");

  drawShownWays(gWays, gWayBridges, gWayBadges);
  applyOverlays();
  applySelection();
  applyWays();
  fitToWays();
  applyWayFloor();
}

/* ---------- LINEAR VIEW ---------- */
function renderLinear() {
  svg.innerHTML = "";
  svg.setAttribute("viewBox", "0 0 1200 1000");
  const ML = 52, MR = 60, ROAD_Y = 620, ROAD_H = 22;
  const X = v => ML + (v - 0.5) / TOTAL * (W - ML - MR);
  const gBase = el("g", {}),
        gHoods = el("g", {}), gChiasm = el("g", { "class": "layer-chiasm" }),
        gIam = el("g", { "class": "layer-iam" }), gLabels = el("g", { "class": "layer-labels" });

  // water behind the harbor stretch
  const seaX = X(852), seaW = X(879) + 12 - seaX;
  el("rect", { x: seaX, y: ROAD_Y - 130, width: seaW, height: 200, rx: 10, "class": "water-blob" }, gBase);
  txt(gBase, seaX + seaW / 2, ROAD_Y + 58, "SEA OF", "water-label", { "font-size": 10 });
  txt(gBase, seaX + seaW / 2, ROAD_Y + 70, "TIBERIAS", "water-label", { "font-size": 10 });

  // the road
  el("rect", { x: ML - 22, y: ROAD_Y, width: W - ML - MR + 44, height: ROAD_H, fill: "var(--road-fill)", stroke: "var(--road-casing)", "stroke-width": 2, rx: 5 }, gBase);
  el("line", { x1: ML - 12, y1: ROAD_Y + ROAD_H / 2, x2: W - MR + 12, y2: ROAD_Y + ROAD_H / 2, "class": "way-center" }, gBase);

  // chapter mileposts
  for (let ch = 1; ch <= 21; ch++) {
    const x = X(JOHN.chapterOffsets[ch] + 0.5);
    el("line", { x1: x, y1: ROAD_Y + ROAD_H, x2: x, y2: ROAD_Y + ROAD_H + 8, "class": "milepost" }, gBase);
    txt(gBase, x + 2, ROAD_Y + ROAD_H + 20, String(ch), "milepost-label", { "text-anchor": "start" });
  }
  txt(gBase, ML - 22, ROAD_Y + ROAD_H + 20, "ch.", "milepost-label", { "text-anchor": "start" });

  // buildings
  const BH = g => 18 + (g || 12) / MAXG * 400;
  HOODS.forEach(h => {
    const x0 = X(h.v0), x1 = X(h.v1 + 1);
    const bw = Math.max(5, x1 - x0 - 1.2), bh = BH(h.greek);
    const rx = Math.min(4, bw / 2), yTop = ROAD_Y - bh;
    const d = `M${x0},${ROAD_Y} L${x0},${yTop + rx} Q${x0},${yTop} ${x0 + rx},${yTop} L${x0 + bw - rx},${yTop} Q${x0 + bw},${yTop} ${x0 + bw},${yTop + rx} L${x0 + bw},${ROAD_Y} Z`;
    const p = el("path", { d, "class": "hood", "data-hood": h.id, fill: `var(--t-${h.theme})` }, gHoods);
    attachHood(p, h);
    h.lx = x0 + bw / 2; h.ly = yTop;                 // linear anchor for overlays
    if (h.center) el("circle", { cx: x0 + bw / 2, cy: yTop - 8, r: 4.5, "class": "center-ring", fill: "none" }, gChiasm);
    if (h.chiasm) txt(gChiasm, x0 + bw / 2, yTop - 20, h.chiasm, "chiasm-badge");
    if (bw > 34) txt(gLabels, x0 + bw / 2, yTop - 5, h.short, "label-hood zoomlabel");
  });

  // chiasm bridges (linear: arcs over the skyline)
  WARDS.forEach(w => {
    const tagged = {};
    w.hoods.forEach(h => { if (h.chiasm) tagged[h.chiasm] = h; });
    for (const tag in tagged) {
      if (tag.endsWith("′") && tagged[tag.slice(0, -1)]) {
        const A = tagged[tag.slice(0, -1)], B = tagged[tag];
        const top = Math.min(A.ly, B.ly) - 46;
        el("path", { d: `M${A.lx},${A.ly - 4} Q${(A.lx + B.lx) / 2},${top} ${B.lx},${B.ly - 4}`, "class": "chiasm-arc" }, gChiasm);
      }
    }
  });

  // ward brackets (skip degenerate slivers)
  WARDS.forEach((w, i) => {
    const x0 = X(w.v0), x1 = X(w.v1 + 1);
    if (x1 - x0 < 8) return;
    const y = ROAD_Y + ROAD_H + 34 + (i % 2) * 20;
    el("path", { d: `M${x0},${y - 5} L${x0},${y} L${x1},${y} L${x1},${y - 5}`, "class": "lin-bracket" }, gBase);
    if (x1 - x0 > 62) txt(gBase, (x0 + x1) / 2, y + 12, w.short, "lin-ward-label");
  });

  // district bands
  const bandY = ROAD_Y + ROAD_H + 88;
  DISTRICTS.forEach((d, i) => {
    const x0 = X(d.v0), x1 = X(d.v1 + 1);
    el("rect", { x: x0, y: bandY, width: x1 - x0, height: 20, rx: 4, fill: "var(--ink-2)", "class": "lin-district-band" }, gBase);
    const LNAMES = { d1: "PROLOGUE", d10: "BOOK OF SIGNS", d80: "BOOK OF GLORY", d97: "HARBOR" };
    const lbl = txt(gBase, (x0 + x1) / 2, bandY + 36, LNAMES[d.id] || d.short.toUpperCase(), "lin-district-label");
    if (x1 - x0 < 110) lbl.style.fontSize = "9.5px";
    const c = el("rect", { x: x0, y: bandY, width: x1 - x0, height: 20, fill: "transparent" }, gBase);
    c.style.cursor = "pointer";
    c.addEventListener("click", ev => { ev.stopPropagation(); openDistrict(d); });
  });

  // annex hanging below the road
  const AX = JOHN.annex;
  const ax0 = X(AX.v0), ax1 = X(AX.v1 + 1), aw = Math.max(24, ax1 - ax0);
  const axc = (ax0 + ax1) / 2, ay = bandY + 76;
  el("line", { x1: axc, y1: ROAD_Y + ROAD_H, x2: axc, y2: ay, "class": "milepost", "stroke-dasharray": "3 4" }, gBase);
  const ar = el("rect", { x: axc - aw / 2, y: ay, width: aw, height: 48, rx: 5, "class": "annex-blob" }, gHoods);
  attachHood(ar, AX);
  txt(gLabels, axc, ay + 64, "Mercy Annex · 7:53–8:11", "annex-label");

  // I AM flags
  JOHN.iam.forEach(s => {
    const h = iamHood(s);
    const x = X(s.v), topY = (h ? h.ly : ROAD_Y - 60) - 16;
    el("line", { x1: x, y1: h ? h.ly : ROAD_Y, x2: x, y2: topY + 6, stroke: "var(--gold)", "stroke-width": 1.2 }, gIam);
    const st = el("path", { d: starPath(x, topY, s.minor ? 5 : 7), "class": "iam-star" }, gIam);
    st.addEventListener("pointerenter", ev => showTip(`<div class="tt-name">✦ ${s.label}</div><div class="tt-ref">John ${s.ref}</div>`, ev));
    st.addEventListener("pointermove", moveTip);
    st.addEventListener("pointerleave", hideTip);
    if (h) st.addEventListener("click", ev => { ev.stopPropagation(); openHood(h); });
  });

  // gate labels (topmost so the skyline can't cover them)
  txt(gLabels, ML - 20, ROAD_Y - 8, "WEST GATE · 1:1", "gate-label", { "text-anchor": "start" });
  txt(gLabels, W - MR + 12, ROAD_Y + ROAD_H + 18, "HARBOR · 21:25", "gate-label", { "text-anchor": "end" });
  // encoding hint
  txt(gBase, 262, 58, "building height = Greek word count", "milepost-label", { "text-anchor": "start" });

  applyOverlays();
  applySelection();
}

/* ---------- INDEX VIEW ---------- */
function renderIndex() {
  const iv = document.getElementById("indexview");
  let rows = "";
  DISTRICTS.forEach(d => {
    rows += `<tr class="district-row"><td colspan="2">${d.short} — John ${d.ref}</td><td class="num">${fmt(d.verses)}</td><td class="num">${fmt(d.eng)}</td><td class="num">${fmt(d.greek)}</td><td></td></tr>`;
    d.wards.forEach(w => {
      rows += `<tr class="ward-row"><td colspan="2" style="padding-left:22px">${w.short} · ${w.ref}</td><td class="num">${fmt(w.verses)}</td><td class="num">${fmt(w.eng)}</td><td class="num">${fmt(w.greek)}</td><td></td></tr>`;
      w.hoods.forEach(h => {
        const th = JOHN.themes[h.theme];
        rows += `<tr class="hood-row" data-open="${h.id}"><td style="padding-left:40px">${h.chiasm ? "<b>" + h.chiasm + "</b> " : ""}${h.short}</td><td>${h.ref}</td>
          <td class="num">${fmt(h.verses)}</td><td class="num">${fmt(h.eng)}</td><td class="num">${fmt(h.greek)}</td>
          <td><span class="dot" style="background:var(--t-${h.theme})"></span>${th.label}</td></tr>`;
      });
    });
  });
  const AX = JOHN.annex;
  rows += `<tr class="district-row"><td colspan="6">Outside the wall</td></tr>
    <tr class="hood-row" data-open="annex"><td style="padding-left:40px">${AX.short} (later insertion)</td><td>${AX.ref}</td>
    <td class="num">${fmt(AX.verses)}</td><td class="num">${fmt(AX.eng)}</td><td class="num">${fmt(AX.greek)}</td>
    <td><span class="dot" style="background:var(--t-controversy)"></span>${JOHN.themes.controversy.label}</td></tr>`;
  iv.innerHTML = `<table><thead><tr><th>Place</th><th>Ref</th><th>Verses</th><th>English</th><th>Greek</th><th>Theme</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="tbl-note"><b>A B C D C′ B′ A′</b> mark chiasm positions within their ward (◈ = the centre).
    16:4b–33 has no English word count in the source outline; its Greek count comes from the companion chart sheet.
    Word counts are quoted from the source spreadsheet; ward and district totals may differ slightly from the sum of their parts (overlapping addenda in the source).</div>`;
  iv.querySelectorAll("[data-open]").forEach(r => r.addEventListener("click", () => {
    const id = r.dataset.open;
    openHood(id === "annex" ? AX : byId[id]);
  }));
  renderWaysIndex(iv);
}

/* ---------- THEME WAYS: the index table ----------
   First in the index view, because on a phone (where #controls is hidden) it is the only way
   to pick ways. All 51 entries: 34 ways, each with its sub-entries beneath it. Built with DOM
   calls; toggles are real buttons and never use data-open (that opens a block). */
function renderWaysIndex(iv) {
  if (!WAYDATA) return;
  const sec = document.createElement("section");
  sec.id = "ways-index";
  sec.setAttribute("aria-labelledby", "ways-h");
  dom("h2", null, "Theme ways", sec).id = "ways-h";
  const bar = dom("div", "ways-bar", null, sec);
  const show = dom("button", null, "", bar);
  show.id = "ways-show"; show.type = "button";
  show.addEventListener("click", () => document.querySelector('#viewseg button[data-view="organic"]').click());
  const live = dom("span", "ways-live", "", bar);
  live.setAttribute("aria-live", "polite");
  const jump = dom("a", "ways-jump", "Places ↓", bar);
  jump.href = "#places";
  jump.addEventListener("click", ev => { ev.preventDefault(); const t = document.getElementById("places"); if (t) t.scrollIntoView(); });
  const wrap = dom("div", "ways-wrap", null, sec);
  const table = dom("table", "ways-table", null, wrap);
  const cap = dom("caption", null, "Way types: ", table);
  dom("b", null, WAYDATA.status, cap);
  cap.append(". Verses and blocks are PaulDz's lists; each way's type is derived from its verse count.");
  const hr = dom("tr", null, null, dom("thead", null, null, table));
  ["", "Way", "Type", "Verses", "Greek (est.)", "Blocks", "Chapters", "Refs"].forEach((h, i) =>
    dom("th", i >= 3 && i <= 6 ? "num" : null, h, hr));
  const body = dom("tbody", null, null, table);
  const kids = WAYDATA.themes.filter(t => t.parent);
  const cells = (tr, t, first) => {
    const c0 = dom("td", null, null, tr);
    if (first) c0.appendChild(first);
    dom("td", null, t.label, tr);
    dom("td", null, t.way ? WAY_TYPE.get(t.way).label : "", tr);
    dom("td", "num", fmt(t.verses), tr);
    dom("td", "num", fmt(t.greek), tr);
    dom("td", "num", fmt(t.blocks.length), tr);
    dom("td", "num", fmt(t.chapters.length), tr);
    dom("td", "refs", t.refs.join(", "), tr);
  };
  for (const ty of WAYDATA.types) {
    const mine = WAYDATA.themes.filter(t => !t.parent && t.way === ty.key).sort((a, b) => b.verses - a.verses);
    if (!mine.length) continue;
    const g = dom("tr", "way-group", null, body);
    const gc = dom("td", null, `${ty.label} — ${ty.gloss} · band ${wayBand(ty.key)} verses`, g);
    gc.colSpan = 8;
    for (const t of mine) {
      const tr = dom("tr", "way-row", null, body);
      tr.dataset.way = t.key;
      const b = dom("button", "way-toggle", null);
      b.type = "button"; b.dataset.way = t.key;
      b.setAttribute("aria-label", `Show ${t.label} on map`);
      b.addEventListener("click", () => toggleWay(t.key));
      cells(tr, t, b);
      for (const c of kids.filter(c => c.parent === t.key).sort((a, b) => b.verses - a.verses)) {
        const cr = dom("tr", "way-child", null, body);
        cr.dataset.child = c.key;
        cells(cr, c, null);
        cr.children[2].textContent = `inside ${t.label}; its verses are counted in that way`;
      }
    }
  }
  iv.prepend(sec);
  const anchor = document.createElement("a");
  anchor.id = "places";
  sec.after(anchor);
  refreshWayToggles();
}

function toggleWay(k) {
  const live = document.querySelector("#ways-index .ways-live");
  if (WAYS.shown.includes(k)) WAYS.shown = WAYS.shown.filter(x => x !== k);
  else if (WAYS.shown.length >= WAYS_MAX) {
    if (live) live.textContent = `At most ${WAYS_MAX} ways at once — remove one first.`;
    return;
  } else WAYS.shown.push(k);
  if (live) live.textContent = "";
  WAYS.rejects = [];
  writeWaysURL();
  refreshWayToggles();
}

// one place that makes every toggle and the Show button agree with WAYS.shown
function refreshWayToggles() {
  document.querySelectorAll("#ways-index .way-toggle").forEach(b => {
    const i = WAYS.shown.indexOf(b.dataset.way);
    b.setAttribute("aria-pressed", String(i >= 0));
    b.textContent = i >= 0 ? String(i + 1) : "+";
  });
  const show = document.getElementById("ways-show");
  if (show) {
    show.textContent = WAYS.shown.length ? `Show ${WAYS.shown.length} on map` : "Pick up to " + WAYS_MAX + " ways to show";
    show.disabled = !WAYS.shown.length;
  }
}

/* ---------- overlays / legend ---------- */
function applyOverlays() {
  const show = (sel, on) => document.querySelectorAll(sel).forEach(e => e.style.display = on ? "" : "none");
  show(".layer-iam", document.getElementById("ck-iam").checked);
  show(".layer-chiasm", document.getElementById("ck-chiasm").checked);
  svg.classList.toggle("nolabels", !document.getElementById("ck-labels").checked);
}
function applySelection() {
  if (selectedId) document.querySelectorAll(`[data-hood="${selectedId}"]`).forEach(e => e.classList.add("selected"));
}
["ck-iam", "ck-chiasm", "ck-labels"].forEach(id =>
  document.getElementById(id).addEventListener("change", applyOverlays));

(function buildLegend() {
  const lg = document.getElementById("legend");
  for (const key in JOHN.themes) {
    const t = JOHN.themes[key];
    const lab = document.createElement("label");
    lab.innerHTML = `<span class="swatch" style="background:var(--t-${key})"></span>${t.label}`;
    lab.style.cursor = "default";
    lg.appendChild(lab);
  }
})();

/* ---------- pan & zoom ---------- */
let vb = { x: 0, y: 0, w: 1200, h: 1000 };
function setVB() {
  svg.setAttribute("viewBox", `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
  svg.classList.toggle("zoomed", 1200 / vb.w >= 1.55);
  svg.style.setProperty("--inv", (vb.w / 1200).toFixed(4)); // counter-scale labels
  // one CSS pixel in plan units under preserveAspectRatio "meet" — badges hold a constant
  // on-screen size with it, where --inv only holds them to the default view's size
  const cw = svg.clientWidth || 1200, ch = svg.clientHeight || 1000;
  svg.style.setProperty("--u1px", Math.max(vb.w / cw, vb.h / ch).toFixed(4));
  applyWayFloor();
}
function resetVB() { vb = { x: 0, y: 0, w: 1200, h: 1000 }; setVB(); }
function clientToMap(cx, cy) {
  const r = svg.getBoundingClientRect();
  // account for preserveAspectRatio="xMidYMid meet"
  const sc = Math.min(r.width / vb.w, r.height / vb.h);
  const ox = (r.width - vb.w * sc) / 2, oy = (r.height - vb.h * sc) / 2;
  return [vb.x + (cx - r.left - ox) / sc, vb.y + (cy - r.top - oy) / sc];
}
svg.addEventListener("wheel", ev => {
  ev.preventDefault();
  const f = Math.pow(1.0016, ev.deltaY);
  const nw = Math.min(3200, Math.max(300, vb.w * f));
  const [mx, my] = clientToMap(ev.clientX, ev.clientY);
  const k = nw / vb.w;
  vb.x = mx - (mx - vb.x) * k; vb.y = my - (my - vb.y) * k;
  vb.w = nw; vb.h = vb.h * k;
  setVB();
}, { passive: false });
let panning = null;
svg.addEventListener("pointerdown", ev => {
  panning = { x: ev.clientX, y: ev.clientY, vx: vb.x, vy: vb.y, moved: false, pid: ev.pointerId };
});
svg.addEventListener("pointermove", ev => {
  if (!panning) return;
  const r = svg.getBoundingClientRect();
  const sc = Math.min(r.width / vb.w, r.height / vb.h);
  const dx = (ev.clientX - panning.x) / sc, dy = (ev.clientY - panning.y) / sc;
  if (Math.abs(dx) + Math.abs(dy) > 3 && !panning.moved) {
    panning.moved = true;
    try { svg.setPointerCapture(panning.pid); } catch (e) {}
  }
  if (panning.moved) { vb.x = panning.vx - dx; vb.y = panning.vy - dy; setVB(); svg.classList.add("panning"); }
});
svg.addEventListener("pointerup", ev => {
  svg.classList.remove("panning");
  panning = null;
});
svg.addEventListener("dblclick", ev => {
  const [mx, my] = clientToMap(ev.clientX, ev.clientY);
  const k = 0.6;
  vb.x = mx - (mx - vb.x) * k; vb.y = my - (my - vb.y) * k; vb.w *= k; vb.h *= k;
  setVB();
});
document.getElementById("z-in").addEventListener("click", () => { zoomCenter(0.72); });
document.getElementById("z-out").addEventListener("click", () => { zoomCenter(1 / 0.72); });
document.getElementById("z-fit").addEventListener("click", resetVB);
function zoomCenter(k) {
  const mx = vb.x + vb.w / 2, my = vb.y + vb.h / 2;
  const aspect = vb.h / vb.w;   // keep it: after a fit the view is the svg's aspect, not 1200:1000
  vb.w = Math.min(3200, Math.max(300, vb.w * k));
  vb.h = vb.w * aspect;
  vb.x = mx - vb.w / 2; vb.y = my - vb.h / 2;
  setVB();
}

/* ---------- view switching ---------- */
let view = "organic";
document.querySelectorAll("#viewseg button").forEach(b => b.addEventListener("click", () => {
  view = b.dataset.view;
  document.querySelectorAll("#viewseg button").forEach(x => x.classList.toggle("on", x === b));
  const isIndex = view === "index";
  document.getElementById("indexview").style.display = isIndex ? "block" : "none";
  document.getElementById("mapwrap").style.display = isIndex ? "none" : "block";
  document.getElementById("controls").classList.toggle("hidden", isIndex);
  document.getElementById("zoomctl").style.display = isIndex ? "none" : "flex";
  hideTip();
  if (view === "organic") { resetVB(); renderOrganic(); }
  else if (view === "linear") { resetVB(); renderLinear(); }
  syncChrome();
}));

/* ---------- theme toggle (in-memory only; no storage APIs) ---------- */
(function initTheme() {
  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  if (prefersDark) document.documentElement.setAttribute("data-theme", "dark");
  document.getElementById("themebtn").addEventListener("click", () => {
    const cur = document.documentElement.getAttribute("data-theme") === "dark";
    document.documentElement.setAttribute("data-theme", cur ? "light" : "dark");
  });
})();

document.addEventListener("keydown", ev => { if (ev.key === "Escape") closePanel(); });
svg.addEventListener("click", ev => { if (ev.target === svg) closePanel(); });

/* ---------- label visibility by zoom ---------- */
const style2 = document.createElement("style");
style2.textContent = `
  svg#map .zoomlabel { display: none; }
  svg#map.zoomed .zoomlabel { display: initial; }
  svg#map.nolabels .zoomlabel, svg#map.nolabels .label-ward, svg#map.nolabels .label-district,
  svg#map.nolabels .iam-label, svg#map.nolabels .gate-label, svg#map.nolabels .annex-label { display: none !important; }
`;
document.head.appendChild(style2);

/* ---------- boot ---------- */
layoutOrganic();
buildWay();
parseWaysParam(location.search);
renderIndex();
resetVB();
renderOrganic();
