/* ============ The city plan ============
   The single source of truth for *where things are*. Ported verbatim from
   scripts/app3d.js (which itself matches scripts/app.js — CLAUDE.md invariant 1).
   Pure math: no DOM, no Three.js, so `scripts/verify_parity.mjs` can run it in
   Node and diff its output against both canvas/SVG renderers.

   Coordinates are plan coordinates (x right, y *down*, as in the 2D map).
   The 3D scene maps them to world space as (x, up, z) = (plan.x, height, plan.y). */

export const W2 = 1200, CX = 585, CY = 505;
export const ROAD_HALF = 9;
export const GATE_GAP = 16;

export function rnd(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

export function wayPoint(t, r) {
  const phi = (84 + 258 * t) * Math.PI / 180;
  return [CX + r * Math.cos(phi), CY - r * Math.sin(phi)];
}

export function convexHull(pts) {
  const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [], upper = [];
  for (const pt of p) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], pt) <= 0) lower.pop(); lower.push(pt); }
  for (let i = p.length - 1; i >= 0; i--) { const pt = p[i]; while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], pt) <= 0) upper.pop(); upper.push(pt); }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

export function catmullSample(pts, per) {
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

/* Decimate a sampled curve for point-drawn roads, ALWAYS keeping the endpoint.
   Stepping `i += n` over a curve silently drops the tail unless the last index
   happens to be a multiple of n — which left the Light & Witness road stopping
   30 plan units short of its final stop. Both 3D views share this. */
export function everyNth(pts, n) {
  const out = [];
  for (let i = 0; i < pts.length; i += n) out.push(pts[i]);
  if (out[out.length - 1] !== pts[pts.length - 1]) out.push(pts[pts.length - 1]);
  return out;
}

function segInt(p1, p2, p3, p4) {
  const d = (p2[0] - p1[0]) * (p4[1] - p3[1]) - (p2[1] - p1[1]) * (p4[0] - p3[0]);
  if (Math.abs(d) < 1e-9) return null;
  const t = ((p3[0] - p1[0]) * (p4[1] - p3[1]) - (p3[1] - p1[1]) * (p4[0] - p3[0])) / d;
  const u = ((p3[0] - p1[0]) * (p2[1] - p1[1]) - (p3[1] - p1[1]) * (p2[0] - p1[0])) / d;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return [p1[0] + t * (p2[0] - p1[0]), p1[1] + t * (p2[1] - p1[1])];
}

/* Builds (and mutates into) the JOHN data: parent links, plan positions, the Way,
   the wall with its gate gaps, obelisks and theme roads. Returns the whole plan. */
export function buildPlan(JOHN) {
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
  const AX = JOHN.annex;

  /* ---------- plan layout (identical constants to app.js) ---------- */
  const BASE_R = 315;
  HOODS.forEach((h, i) => {
    const t = h.mid / TOTAL;
    let r = BASE_R + ((i % 2 === 0) ? -1 : 1) * (42 + rnd(i) * 26);
    if (h.district.outside) r = 535 + rnd(i) * 18;
    const [x, y] = wayPoint(t, r);
    h.r = Math.max(7, 1.35 * Math.sqrt(h.greek || 25));
    h.x = h.tx = x; h.y = h.ty = y;
  });
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
  const recentre = () => WARDS.forEach(w => {
    w.cx = w.hoods.reduce((s, h) => s + h.x, 0) / w.hoods.length;
    w.cy = w.hoods.reduce((s, h) => s + h.y, 0) / w.hoods.length;
  });
  recentre();

  /* heights */
  const HGT = g => 10 + (g || 12) / MAXG * 115;
  HOODS.forEach(h => h.h = HGT(h.greek));
  AX.h = HGT(AX.greek);

  /* the Way: catmull-rom through the ward centers, gate → harbor */
  const ordered = WARDS.slice().sort((a, b) => a.mid - b.mid);
  /* The entrance runs in on a radial line. The old tail swept tangentially and
     met the wall at a 44 degree skew — you entered the city sideways, and the
     spline's recovery from it was the hairpin at the Prologue. The last three
     control points share a bearing, so the stretch spanning the wall (r ~ 460)
     is straight and the gate is taken face-on; the two before it curve the
     approach outside the wall. */
  const T_IN = -0.008;
  const gatePt = wayPoint(T_IN, 462);
  const portPt = wayPoint(1.028, 545);
  /* Ward centroids are the Way's control points, but a ward's centroid is only
     as steady as its membership: multi-hood wards average the inside/outside
     zigzag and land near the ring, while The Cosmic Poem — the one single-hood
     ward inside the wall — inherited that hood's inside offset and sat 46 units
     off it. The road dived to reach it and hairpinned back out. Control points
     are now held to a band around the ring; the bearing (the narrative order) is
     untouched, only the radius is tamed. */
  const ringPt = w => {
    if (w.district.outside) return [w.cx, w.cy];          // the harbour is meant to be out there
    const dx = w.cx - CX, dy = w.cy - CY, r = Math.hypot(dx, dy) || 1;
    const clamped = Math.max(BASE_R - 25, Math.min(BASE_R + 25, r));
    return [CX + dx / r * clamped, CY + dy / r * clamped];
  };
  const wayPts = [wayPoint(-0.036, 575),
                  wayPoint(T_IN, 500), gatePt, wayPoint(T_IN, 415)]
    .concat(ordered.map(ringPt), [portPt]);
  const WAY = catmullSample(wayPts, 24);           // ~350 points

  /* arc-length table: gate = verse 1, port = verse 879 */
  const wayLen = []; let acc = 0;
  for (let i = 0; i < WAY.length; i++) {
    if (i) acc += Math.hypot(WAY[i][0] - WAY[i - 1][0], WAY[i][1] - WAY[i - 1][1]);
    wayLen.push(acc);
  }
  const wayTotal = acc;
  function wayAt(t) { // t in [0,1] by arc length -> {x, y, dx, dy}
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

  /* ---------- road clearance: the Way is a hard corridor ----------
     Buildings are pushed off the roadway (frozen from phase-1 ward centroids),
     then get a door facing their nearest road point. */
  {
    const CLEAR = ROAD_HALF + 4.5;
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
    recentre();
  }

  /* wall hull (plan) — after clearance so it hugs final positions */
  const wallHull = convexHull(
    DISTRICTS.filter(d => !d.outside)
      .flatMap(d => d.wards.flatMap(w => w.hoods.flatMap(h => {
        const out = [];
        for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; out.push([h.x + (h.r + 46) * Math.cos(a), h.y + (h.r + 46) * Math.sin(a)]); }
        return out;
      }))));

  /* wall segments, gapped where the Way crosses */
    /* A gate is a hole in the wall, but you walk through it along the *road*, and
     the wall hull is a coarse polygon whose edge here sits ~45 degrees off the
     road's normal. Shaping the road cannot fix that — so the gate is built
     square to the road (real gatehouses are), and the wall is cut wide enough
     along its own edge to clear the skewed opening. */
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
const WALL_SEGS = [], GATES = [];
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
  { // order gates along the way (entrance first)
    const arc = g => {
      let best = Infinity, bi = 0;
      for (let i = 0; i < WAY.length; i += 2) {
        const d2 = (g.x - WAY[i][0]) ** 2 + (g.y - WAY[i][1]) ** 2;
        if (d2 < best) { best = d2; bi = i; }
      }
      return bi;
    };
    GATES.sort((a, b) => arc(a) - arc(b));
  }

  /* theme road samples */
  const themeRoadPts = {};
  for (const key in JOHN.themeRoads) {
    const stops = JOHN.themeRoads[key].stops.map(id => byId[id]).filter(Boolean).map(h => [h.x, h.y]);
    themeRoadPts[key] = catmullSample(stops, 16);
  }

  /* I AM landmarks: obelisk positions beside their hood */
  const iamHood = s => HOODS.find(h => h.v0 <= s.v && s.v <= h.v1);
  const OBELISKS = [];
  JOHN.iam.forEach(s => {
    const h = iamHood(s); if (!h) return;
    const siblings = JOHN.iam.filter(z => iamHood(z) === h);
    const k = siblings.indexOf(s);
    const ang = -Math.PI / 3 + k * 0.85;
    OBELISKS.push({ s, h, x: h.x + (h.r + 10) * Math.cos(ang), y: h.y + (h.r + 10) * Math.sin(ang), hgt: s.minor ? 20 : 30 });
  });

  /* ---------- shoreline + quay ----------
     The Sea of Tiberias blob (same centre as the 2D map) overlapped the land: in
     2D that is harmless — the city is painted over it — but in 3D you walked off
     the end of the Way into open water. The water is carved back to a shoreline
     circle, and the last stretch of the Way runs out onto a stone quay. */
  const SEA_A0 = -42 * Math.PI / 180, SEA_A1 = 64 * Math.PI / 180;
  const shoreR = a => {                      // how close the water comes, by bearing
    const deg = a * 180 / Math.PI;
    const t = Math.min(1, Math.max(0, (deg + 12) / 24));
    return 552 + 56 * t;                     // held back where the harbour quarter stands
  };
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

  /* the ward/district lobes the 2D map washes in — hull of padded circles */
  const hullOf = (hoods, pad) => convexHull(hoods.flatMap(h => {
    const out = [];
    for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; out.push([h.x + (h.r + pad) * Math.cos(a), h.y + (h.r + pad) * Math.sin(a)]); }
    return out;
  }));

  /* Where the Way crosses the wall, as a fraction of its arc length. The walk
     now spends its first stretch approaching from outside, and John 1:1 belongs
     at the gate, not at the start of the approach road. */
  let gateT = 0;
  if (GATES.length) {
    let bi = 0, bd = Infinity;
    for (let i = 0; i < WAY.length; i++) {
      const d = (GATES[0].x - WAY[i][0]) ** 2 + (GATES[0].y - WAY[i][1]) ** 2;
      if (d < bd) { bd = d; bi = i; }
    }
    gateT = wayLen[bi] / wayTotal;
  }

  return {
    JOHN, TOTAL, HOODS, WARDS, DISTRICTS, byId, MAXG, AX, gateT,
    WAY, wayAt, wayTotal, gatePt, portPt, wayPoint, hullOf,
    WALL_SEGS, GATES, wallHull, themeRoadPts, OBELISKS, SEA_POLY, QUAY_POLY, QUAY_W,
    CX, CY, ROAD_HALF, GATE_GAP,
  };
}
