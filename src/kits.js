/* ============ Building kits — Phase 2 M2a ============
   Procedural ancient architecture from primitives: no downloaded models.

   Every kit is built in a local frame where **+X faces the road** (the group is
   then rotated by -doorAng), and must fit inside the hood's circle of radius
   `h.r` — the road-clearance pass in plan.js guarantees that circle is free, and
   nothing else does. Height stays `h.h`, so the Greek-word-count encoding in the
   skyline survives the change of style.

   Colour: walls are stone pulled 60% toward the block's theme hue, roofs 72%
   (from orbit you are mostly looking at roofs, so that is where the coding has
   to live), and awnings and banners are the pure theme colour — the legend still
   reads at every altitude while the city stops looking like a bar chart.

   Geometry is accumulated per material and merged, so a 40-piece temple costs
   four draw calls rather than forty. */

import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { PAL } from "./palette.js";

/* ---------- material set ---------- */
export function makeKitMaterials(themeName) {
  let pal = PAL[themeName];
  const lam = c => new THREE.MeshLambertMaterial({ color: c });
  const mats = {
    stone: lam(pal.stone),
    stone2: lam(pal.stone2),
    opening: lam(pal.opening),
    wall: lam(pal.wall),
    wallTop: lam(pal.wallTop),
    gold: new THREE.MeshStandardMaterial({ color: pal.gold, metalness: 0.6, roughness: 0.4, emissive: pal.goldDark, emissiveIntensity: 0.12 }),
  };
  const mix = (a, b, t) => new THREE.Color(a).lerp(new THREE.Color(b), t);
  for (const k in pal.themes) {
    mats["body:" + k] = lam(mix(pal.stone, pal.themes[k], 0.72));
    mats["roof:" + k] = lam(mix(pal.roofTile, pal.themes[k], 0.72));
    mats["accent:" + k] = lam(pal.themes[k]);
  }
  function applyTheme(name) {
    pal = PAL[name];
    mats.stone.color.set(pal.stone);
    mats.stone2.color.set(pal.stone2);
    mats.opening.color.set(pal.opening);
    mats.wall.color.set(pal.wall);
    mats.wallTop.color.set(pal.wallTop);
    mats.gold.color.set(pal.gold); mats.gold.emissive.set(pal.goldDark);
    for (const k in pal.themes) {
      mats["body:" + k].color.copy(mix(pal.stone, pal.themes[k], 0.72));
      mats["roof:" + k].color.copy(mix(pal.roofTile, pal.themes[k], 0.72));
      mats["accent:" + k].color.set(pal.themes[k]);
    }
  }
  return { mats, applyTheme };
}

const mat4 = (x, z, ry) => new THREE.Matrix4().makeTranslation(x, 0, z)
  .multiply(new THREE.Matrix4().makeRotationY(ry));

/* ---------- geometry accumulator ---------- */
class Parts {
  constructor() { this.byMat = new Map(); }
  push(key, g) {
    const flat = g.index ? g.toNonIndexed() : g;      // mergeGeometries needs one or the other
    const list = this.byMat.get(key);
    if (list) list.push(flat); else this.byMat.set(key, [flat]);
  }
  box(key, w, h, d, x, y, z, ry = 0) {
    const g = new THREE.BoxGeometry(w, h, d);
    if (ry) g.rotateY(ry);
    g.translate(x, y, z);
    this.push(key, g);
  }
  /* a column standing on y0: base block, tapered shaft, capital */
  column(key, rad, h, x, z, y0 = 0) {
    const capH = rad * 1.1, baseH = rad * 0.7, shaftH = Math.max(1, h - capH - baseH);
    this.box(key, rad * 2.5, baseH, rad * 2.5, x, y0 + baseH / 2, z);
    const shaft = new THREE.CylinderGeometry(rad * 0.85, rad, shaftH, 10);
    shaft.translate(x, y0 + baseH + shaftH / 2, z);
    this.push(key, shaft);
    this.box(key, rad * 2.6, capH, rad * 2.6, x, y0 + baseH + shaftH + capH / 2, z);
  }
  /* an arched opening on the +X face at distance ax, standing on y0 */
  archOnFace(key, w, h, ax, y0 = 0, z = 0, depth = 0.4) {
    const r = w / 2, straight = Math.max(0.4, h - r);
    const s = new THREE.Shape();
    s.moveTo(-r, 0); s.lineTo(-r, straight);
    s.absarc(0, straight, r, Math.PI, 0, true);
    s.lineTo(r, 0); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false });
    g.rotateY(Math.PI / 2);                            // shape faces +X, extrudes along +X
    g.translate(ax - depth + 0.05, y0, z);   // recessed into the wall, not stuck on it
    this.push(key, g);
  }
  /* a pediment over the +X front, its base at y0 */
  pediment(key, halfW, h, ax, y0, depth = 1.8) {
    const s = new THREE.Shape();
    s.moveTo(-halfW, 0); s.lineTo(halfW, 0); s.lineTo(0, h); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false });
    g.rotateY(Math.PI / 2);
    g.translate(ax, y0, 0);
    this.push(key, g);
  }
  /* merlons stepping along local X, centred on the origin */
  merlons(key, length, w, h, d, y, gap = 2.4) {
    const step = w + gap, n = Math.max(1, Math.floor((length - 1) / step));
    const start = -((n - 1) * step) / 2;
    for (let i = 0; i < n; i++) this.box(key, w, h, d, start + i * step, y + h / 2, 0);
  }
  /* fold another Parts in, optionally transformed */
  merge(other, matrix) {
    for (const [key, list] of other.byMat) for (const g of list) {
      if (matrix) g.applyMatrix4(matrix);
      this.push(key, g);
    }
  }
  toGroup(mats, shadows = true) {
    const grp = new THREE.Group();
    for (const [key, list] of this.byMat) {
      const geo = list.length === 1 ? list[0] : mergeGeometries(list, false);
      if (!geo) continue;
      geo.computeVertexNormals();
      const m = new THREE.Mesh(geo, mats[key] || mats.stone);
      m.castShadow = shadows; m.receiveShadow = shadows;
      grp.add(m);
    }
    return grp;
  }
}

/* ---------- which kit a block gets ---------- */
export function kitFor(h) {
  const g = h.greek || 0;
  if (h.ward && h.ward.short === "Temple Citadel" && g >= 250) return "temple";
  if (g >= 250) return "forum";
  if (g >= 150) return "hall";
  return "house";
}

/* ---------- the kits ---------- */
/* Judean courtyard house: flat roof, parapet, exterior stair, string courses. */
function house(P, h, body, accent, roof) {
  const a = h.r * 0.78;
  const hh = Math.max(3, h.h - 2.5);        // roof slab + parapet bring it back to h.h
  // a stable per-block seed, so houses differ from each other but never flicker
  let seed = 0; for (const c of String(h.id || h.short || "")) seed = (seed * 31 + c.charCodeAt(0)) % 9973;
  const rnd = k => ((Math.sin((seed + k * 57.3) * 12.9898) * 43758.5453) % 1 + 1) % 1;
  const dW = Math.min(5.5, a * 0.9), dH = Math.min(9, hh * 0.6);
  P.box(body, a * 2, hh, a * 2, 0, hh / 2, 0);
  for (let y = 9; y < hh - 3; y += 9)                                  // storey string courses
    if (y < dH - 1 || y > dH + 3)                                      // never across the door head
      P.box("stone2", a * 2.1, 0.7, a * 2.1, 0, y, 0);
  P.box(roof, a * 2.15, 0.9, a * 2.15, 0, hh + 0.45, 0);
  for (const [dx, dz, w, d] of [[a, 0, 0.6, a * 2.1], [-a, 0, 0.6, a * 2.1],
                                [0, a, a * 2.1, 0.6], [0, -a, a * 2.1, 0.6]])
    P.box("stone", w, 1.6, d, dx, hh + 1.7, dz);                       // roof parapet
  const n = Math.min(8, Math.max(3, Math.round(hh / 4)));              // exterior stair, on the -Z flank
  const rise = Math.min(hh, hh * 0.85) / n, run = (a * 1.5) / n;
  for (let i = 0; i < n; i++)
    P.box("stone2", run, rise, 2.6, -a * 0.75 + run * (i + 0.5), rise * (i + 0.5), -a - 1.3);
  P.archOnFace("opening", dW, dH, a);
  P.box(accent, 1.4, 0.5, dW + 2.6, a + 0.6, dH + 1.3, 0);             // awning over the door
  for (const bz of [-(dW / 2 + 0.7), dW / 2 + 0.7])                    // brackets, so it is held up
    P.box("stone2", 1.2, 0.5, 0.5, a + 0.55, dH + 0.85, bz);
  const nWin = 1 + Math.floor(rnd(1) * 3);                             // 1-3 slits, off-centre
  for (let i = 0; i < nWin; i++) {
    const z = (i - (nWin - 1) / 2) * a * 0.62 + (rnd(i + 2) - 0.5) * a * 0.25;
    const wy = Math.min(hh - 2.5, dH + 4.5 + rnd(i + 5) * 3.5);
    P.box("opening", 0.4, 2.4, 1.2, a - 0.35, wy, z);
  }
}

/* Civic hall: podium, portico of four columns, pediment. */
function hall(P, h, body, accent, roof) {
  const a = h.r * 0.78, hh = h.h - 1;       // the roof slab makes up the last unit
  P.box("stone2", a * 2, 2, a * 2, 0, 1, 0);
  const bodyH = Math.max(4, hh - 2);
  P.box(body, a * 1.82, bodyH, a * 1.86, -a * 0.09, 2 + bodyH / 2, 0);
  const colH = Math.min(bodyH * 0.72, 16), rad = Math.max(0.5, a * 0.11);
  for (let i = 0; i < 4; i++)
    P.column("stone", rad, colH, a * 0.86, -a * 0.72 + (a * 1.44) * (i / 3), 2);
  const eY = 2 + colH;
  P.box(accent, 2.8, 0.7, a * 1.9, a * 0.86, eY + 0.35, 0);            // painted architrave
  P.box("stone", 2.6, 1.2, a * 1.9, a * 0.86, eY + 1.3, 0);            // entablature
  P.pediment("stone", a * 0.9, a * 0.5, a * 0.86 + 1.3 - 1.8, eY + 1.6);   // front face flush with the architrave
  P.box(roof, a * 1.9, 1, a * 1.94, -a * 0.09, hh + 0.5, 0);
  const dW = Math.min(6, a * 0.8), dH = Math.min(10, bodyH * 0.6);
  P.archOnFace("opening", dW, dH, a * 0.82, 2);
  for (const z of [-a * 0.45, a * 0.45])                               // hanging banners
    P.box(accent, 0.5, colH * 0.55, 2.2, a * 0.9, 2 + colH * 0.6, z);
}

/* Agora / stoa forum: colonnades round an open court, rear hall, awnings. */
function forum(P, h, body, accent, roof) {
  const a = h.r * 0.78;
  const hh = Math.max(6, h.h - 3.5);        // podium + roof slab make up the rest
  P.box("stone2", a * 2, 2.4, a * 2, 0, 1.2, 0);                       // podium
  P.box("stone", a * 1.9, 0.4, a * 1.9, 0, 2.6, 0);                    // court floor
  const rearW = a * 0.44, pod = 2.4;
  P.box(body, rearW * 2, hh, a * 2, -a + rearW, pod + hh / 2, 0);      // rear hall
  const colH = Math.min(Math.max(hh * 0.5, 9), 20), rad = Math.max(0.55, a * 0.085);
  const front = a * 0.86, side = a * 0.86, back = -a + rearW * 2;
  const nSide = Math.max(3, Math.round((front - back) / (a * 0.42)));
  for (let i = 0; i < nSide; i++) {                                    // side colonnades
    const x = back + (front - back) * (i / (nSide - 1));
    P.column("stone", rad, colH, x, side, pod);
    P.column("stone", rad, colH, x, -side, pod);
  }
  const nFront = Math.max(4, Math.round((side * 2) / (a * 0.42)));
  for (let i = 0; i < nFront; i++)                                     // front colonnade
    P.column("stone", rad, colH, front, -side + (side * 2) * (i / (nFront - 1)), pod);
  const eY = pod + colH + 0.9;
  P.box(accent, 2.4, 0.7, a * 1.9, front, eY - 0.75, 0);               // painted architrave
  P.box("stone", 2.2, 1.4, a * 1.9, front, eY + 0.1, 0);
  P.box("stone", (front - back) + 2.2, 1.8, 2.2, (front + back) / 2, eY, side);
  P.box("stone", (front - back) + 2.2, 1.8, 2.2, (front + back) / 2, eY, -side);
  P.pediment("stone", a * 0.62, a * 0.34, front + 1.1 - 1.8, eY + 0.9);
  for (let i = 0; i < nFront - 1; i++) {                               // awnings between columns
    const z0 = -side + (side * 2) * (i / (nFront - 1)), z1 = -side + (side * 2) * ((i + 1) / (nFront - 1));
    P.box(accent, 3.6, 0.9, (z1 - z0) * 0.72, front + 1.5, pod + colH * 0.42, (z0 + z1) / 2);
  }
  P.box(roof, rearW * 2 + 1, 1.1, a * 2.1, -a + rearW, pod + hh + 0.55, 0);
  const dW = Math.min(7, a * 0.7), dH = Math.min(12, hh * 0.5);
  P.archOnFace("opening", dW, dH, -a + rearW * 2 + 0.05, pod);         // hall door, across the court
}

/* Herodian temple platform: stepped ashlar podium, grand stair, peristyle,
   gold façade band, sanctuary block above. */
function temple(P, h, body, accent, roof) {
  const a = h.r * 0.78, hh = h.h, podH = 9;
  P.box("stone2", a * 2, 3, a * 2, 0, 1.5, 0);
  P.box("stone2", a * 1.9, 3, a * 1.9, 0, 4.5, 0);
  P.box("stone", a * 1.8, 3, a * 1.8, 0, 7.5, 0);
  const steps = 6;                                                     // grand stair on the road side
  for (let i = 0; i < steps; i++)
    P.box("stone", a * 0.34, podH / steps, a * 1.1, a * 0.9 + a * 0.3 - i * (a * 0.17), (podH / steps) * (i + 0.5), 0);
  const rest = Math.max(6, hh - podH);
  const colH = Math.min(Math.max(rest * 0.55, 12), 24), rad = Math.max(0.7, a * 0.1);
  const inset = a * 0.78, n = 5;
  for (let i = 0; i < n; i++) {                                        // peristyle on the platform
    const t = -inset + (inset * 2) * (i / (n - 1));
    P.column("stone", rad, colH, inset, t, podH);
    P.column("stone", rad, colH, -inset, t, podH);
    if (i > 0 && i < n - 1) {
      P.column("stone", rad, colH, t, inset, podH);
      P.column("stone", rad, colH, t, -inset, podH);
    }
  }
  const eY = podH + colH + 1;
  P.box("stone", a * 1.86, 2, a * 1.86, 0, eY, 0);                     // entablature ring
  P.box("gold", 1.0, 1.4, a * 1.7, a * 0.94, eY + 1.6, 0);             // gold façade band
  const sancH = Math.max(3, rest - colH - 2.8);
  P.box(body, a * 1.1, sancH, a * 1.1, 0, eY + 1 + sancH / 2, 0);      // sanctuary
  P.box("gold", a * 1.2, 0.8, a * 1.2, 0, eY + 1 + sancH + 0.4, 0);    // gold cornice (the 0.8 is inside sancH)
  const dW = Math.min(7, a * 0.55), dH = Math.min(13, colH * 0.75);
  P.archOnFace("opening", dW, dH, inset * 0.62, podH);
  P.box(accent, 0.6, colH * 0.5, 2.4, inset + 1.1, podH + colH * 0.55, 0);
}

const KITS = { house, hall, forum, temple };

/* Builds one block, rotated so the kit's +X front faces the road. */
export function buildBlock(h, mats) {
  const kit = kitFor(h);
  const P = new Parts();
  const theme = h.theme || "discourse";
  KITS[kit](P, h, "body:" + theme, "accent:" + theme, "roof:" + theme);
  const grp = P.toGroup(mats);
  grp.position.set(h.x, 0, h.y);
  grp.rotation.y = -h.doorAng;
  grp.userData.hood = h;
  grp.traverse(o => { if (o.isMesh) o.userData.hood = h; });
  return { group: grp, kit };
}

/* ---------- the city wall: crenellated circuit with towers ---------- */
export function buildWall(WALL_SEGS, mats, { height, thickness, centre }) {
  const P = new Parts(), towers = [];
  let since = 1e9;
  for (const [a, b] of WALL_SEGS) {
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy);
    const seg = new Parts();
    seg.box("wall", L, height, thickness, 0, height / 2, 0);
    seg.box("wallTop", L, 1.1, thickness + 0.9, 0, height + 0.55, 0);   // the wall walk
    seg.merlons("wallTop", L, 3.0, 2.6, thickness + 0.9, height + 1.1);
    P.merge(seg, mat4((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, -Math.atan2(dy, dx)));
    since += L;
    if (since > 105) { towers.push(a); since = 0; }
  }
  const tw = 14, th = height + 9;
  for (const t of towers) {
    const tp = new Parts();
    tp.box("wall", tw, th, tw, 0, th / 2, 0);
    tp.box("wallTop", tw + 1.4, 1.2, tw + 1.4, 0, th + 0.6, 0);
    for (const [ox, oz, ry] of [[0, (tw + 1.4) / 2, 0], [0, -(tw + 1.4) / 2, 0],
                                [(tw + 1.4) / 2, 0, Math.PI / 2], [-(tw + 1.4) / 2, 0, Math.PI / 2]]) {
      const row = new Parts();
      row.merlons("wallTop", tw + 1.4, 2.8, 2.4, 1.5, th + 1.2);
      tp.merge(row, mat4(ox, oz, ry));
    }
    tp.box("opening", 0.5, 3.2, 1.4, tw / 2, height * 0.75, 0);         // arrow slit, facing out
    P.merge(tp, mat4(t[0], t[1], -Math.atan2(t[1] - centre[1], t[0] - centre[0])));
  }
  return P.toGroup(mats);
}

/* ---------- gates: flanking towers and a real arch to walk under ---------- */
export function buildGate(gate, mats, { gap, height }) {
  const towerW = 13, towerH = height + 14;
  const P = new Parts();
  for (const s of [-1, 1]) {
    P.box("wall", towerW, towerH, towerW, gap * s, towerH / 2, 0);
    P.box("wallTop", towerW + 1.6, 1.3, towerW + 1.6, gap * s, towerH + 0.65, 0);
    const row = new Parts();
    row.merlons("wallTop", towerW + 1.6, 2.8, 2.4, towerW + 1.6, towerH + 1.3);
    P.merge(row, mat4(gap * s, 0, 0));
  }
  const R = gap - towerW / 2 + 0.5, springY = 13, N = 13, depth = 8;
  const step = Math.PI / (N - 1), vw = 2 * R * Math.sin(step / 2) + 0.6;
  for (let i = 0; i < N; i++) {                                         // voussoirs
    const ang = i * step;
    const v = new THREE.BoxGeometry(vw, 3.2, depth);
    v.rotateZ(ang - Math.PI / 2);
    v.translate(R * Math.cos(ang), springY + R * Math.sin(ang), 0);
    P.push("wallTop", v);
  }
  for (const s of [-1, 1]) P.box("wall", 2.4, springY, depth, R * s, springY / 2, 0);   // jambs
  const topY = springY + R + 1.6;
  P.box("wall", R * 2 + 2, Math.max(1, towerH - topY), depth, 0, (topY + towerH) / 2, 0);
  P.box("wallTop", R * 2 + 3.4, 1.2, depth + 1.2, 0, towerH + 0.6, 0);
  const row = new Parts();
  row.merlons("wallTop", R * 2 + 2, 2.8, 2.4, depth + 1.2, towerH + 1.2);
  P.merge(row);
  const M = mat4(gate.x, gate.y, -Math.atan2(gate.uy, gate.ux));
  for (const list of P.byMat.values()) for (const g of list) g.applyMatrix4(M);
  return P.toGroup(mats);
}
