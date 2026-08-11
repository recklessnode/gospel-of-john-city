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

/* ---------- ORGANIC VIEW ---------- */
function renderOrganic() {
  svg.innerHTML = "";
  svg.setAttribute("viewBox", "0 0 1200 1000");
  const gWater = el("g", {}), gDistrict = el("g", {}), gWall = el("g", {}), gWay = el("g", {}),
        gRoads = el("g", { "class": "layer-roads" }), gHoods = el("g", {}),
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

  // theme roads
  for (const key in JOHN.themeRoads) {
    const road = JOHN.themeRoads[key];
    const pts = road.stops.map(id => byId[id]).filter(Boolean).map(h => [h.x, h.y]);
    el("path", {
      d: catmull(pts), "class": "theme-road", id: "road-" + key,
      stroke: key === "life" ? "var(--t-sign)" : "var(--t-witness)"
    }, gRoads);
  }

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

  applyOverlays();
  applySelection();
}

/* ---------- LINEAR VIEW ---------- */
function renderLinear() {
  svg.innerHTML = "";
  svg.setAttribute("viewBox", "0 0 1200 1000");
  const ML = 52, MR = 60, ROAD_Y = 620, ROAD_H = 22;
  const X = v => ML + (v - 0.5) / TOTAL * (W - ML - MR);
  const gBase = el("g", {}), gRoads = el("g", { "class": "layer-roads" }),
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

  // theme lanes above the skyline
  let lane = 0;
  for (const key in JOHN.themeRoads) {
    const road = JOHN.themeRoads[key];
    const y = 74 + lane * 30;
    const color = key === "life" ? "var(--t-sign)" : "var(--t-witness)";
    const stops = road.stops.map(id => byId[id]).filter(Boolean);
    el("line", { x1: X(1), y1: y, x2: X(TOTAL), y2: y, "class": "theme-road", stroke: color, id: "road-" + key }, gRoads);
    const gDots = el("g", { "class": "theme-road-dots", "data-road": key }, gRoads);
    stops.forEach(h => {
      el("circle", { cx: h.lx, cy: y, r: 4, fill: color, stroke: "var(--surface-1)", "stroke-width": 1.5 }, gDots);
      el("line", { x1: h.lx, y1: y + 4, x2: h.lx, y2: h.ly - 2, stroke: color, "stroke-width": 0.7, opacity: 0.45, "stroke-dasharray": "2 3" }, gDots);
    });
    txt(gRoads, X(TOTAL), y - 9, road.label, "label-ward", { "text-anchor": "end", fill: color, "data-road": key });
    lane++;
  }

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
}

/* ---------- overlays / legend ---------- */
function applyOverlays() {
  const show = (sel, on) => document.querySelectorAll(sel).forEach(e => e.style.display = on ? "" : "none");
  show(".layer-iam", document.getElementById("ck-iam").checked);
  show("#road-life, [data-road=life]", document.getElementById("ck-life").checked);
  show("#road-light, [data-road=light]", document.getElementById("ck-light").checked);
  show(".layer-chiasm", document.getElementById("ck-chiasm").checked);
  svg.classList.toggle("nolabels", !document.getElementById("ck-labels").checked);
}
function applySelection() {
  if (selectedId) document.querySelectorAll(`[data-hood="${selectedId}"]`).forEach(e => e.classList.add("selected"));
}
["ck-iam", "ck-life", "ck-light", "ck-chiasm", "ck-labels"].forEach(id =>
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
  vb.w = Math.min(3200, Math.max(300, vb.w * k));
  vb.h = vb.w * (1000 / 1200);
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
  document.getElementById("hint").style.display = isIndex ? "none" : "block";
  hideTip();
  if (view === "organic") { resetVB(); renderOrganic(); }
  else if (view === "linear") { resetVB(); renderLinear(); }
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
renderIndex();
renderOrganic();
resetVB();
