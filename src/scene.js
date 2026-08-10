/* ============ The city, built as Three.js geometry ============
   Plan coordinates (x, y) become world (x, height, z=y). Everything here is
   procedural: no downloaded models, no textures fetched at runtime.

   M1 keeps the massing of the canvas renderer (cylinders, box wall, gate
   towers) so the two 3D views can be compared feature-for-feature. The
   ancient-architecture kits land in M2. */

import * as THREE from "three";
import { PAL, SUN } from "./palette.js";

const WALL_H = 16, WALL_T = 3.2;
const TOWER_H = 30, TOWER_W = 13;

/* --- flat polygon (plan points) laid on the ground at height y --- */
function flatMesh(points, y, material) {
  const shape = new THREE.Shape();
  points.forEach((p, i) => i ? shape.lineTo(p[0], p[1]) : shape.moveTo(p[0], p[1]));
  const geo = new THREE.ShapeGeometry(shape);
  geo.rotateX(Math.PI / 2);          // shape XY -> world XZ, keeping z = plan y
  geo.translate(0, y, 0);
  return new THREE.Mesh(geo, material);
}

/* --- a ribbon between two plan-space edges (the road, the walkways) --- */
function ribbonMesh(left, right, y, material) {
  const n = Math.min(left.length, right.length);
  const pos = [], idx = [];
  for (let i = 0; i < n; i++) {
    pos.push(left[i][0], y, left[i][1], right[i][0], y, right[i][1]);
    if (i < n - 1) {
      const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
      idx.push(a, c, b, b, c, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, material);
}

/* --- an arched doorway hugging the wall of a round building --- */
function doorGeometry(r, dW, dH) {
  const dA = dW / r / 2, rise = dW * 0.25, rr = r + 0.09, N = 14;
  const pos = [], idx = [];
  for (let i = 0; i <= N; i++) {
    const f = i / N, phi = -dA + 2 * dA * f;
    const top = dH + rise * Math.sqrt(Math.max(0, 1 - (2 * f - 1) ** 2));
    pos.push(rr * Math.cos(phi), 0, rr * Math.sin(phi));
    pos.push(rr * Math.cos(phi), top, rr * Math.sin(phi));
    if (i < N) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

/* --- outline of that doorway, for the landmarks' gold trim --- */
function doorOutline(r, dW, dH) {
  const dA = dW / r / 2, rise = dW * 0.25, rr = r + 0.14, N = 14;
  const pts = [];
  pts.push(new THREE.Vector3(rr * Math.cos(-dA), 0, rr * Math.sin(-dA)));
  for (let i = 0; i <= N; i++) {
    const f = i / N, phi = -dA + 2 * dA * f;
    const top = dH + rise * Math.sqrt(Math.max(0, 1 - (2 * f - 1) ** 2));
    pts.push(new THREE.Vector3(rr * Math.cos(phi), top, rr * Math.sin(phi)));
  }
  pts.push(new THREE.Vector3(rr * Math.cos(dA), 0, rr * Math.sin(dA)));
  return new THREE.BufferGeometry().setFromPoints(pts);
}

function dotTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 32;
  const g = c.getContext("2d");
  g.beginPath(); g.arc(16, 16, 13, 0, Math.PI * 2);
  g.fillStyle = "#fff"; g.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function skyTexture(pal) {
  const c = document.createElement("canvas");
  c.width = 4; c.height = 256;
  const g = c.getContext("2d");
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, pal.skyTop); grad.addColorStop(1, pal.skyBot);
  g.fillStyle = grad; g.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function buildCity(scene, plan, themeName) {
  const { HOODS, WARDS, DISTRICTS, AX, WAY, WALL_SEGS, GATES, OBELISKS,
    themeRoadPts, CX, CY, ROAD_HALF, GATE_GAP, gatePt, portPt } = plan;
  let pal = PAL[themeName];
  const all = HOODS.concat([AX]);

  const root = new THREE.Group();
  scene.add(root);

  /* ---------- lights ---------- */
  const sun = new THREE.DirectionalLight(pal.sunColor, pal.sun);
  sun.position.set(CX + SUN[0] * 900, SUN[1] * 900, CY + SUN[2] * 900);
  sun.target.position.set(CX, 0, CY);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 100; sun.shadow.camera.far = 2200;
  sun.shadow.camera.left = -760; sun.shadow.camera.right = 760;
  sun.shadow.camera.top = 760; sun.shadow.camera.bottom = -760;
  sun.shadow.bias = -0.0012;
  scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight(pal.hemiSky, pal.hemiGround, pal.hemi);
  scene.add(hemi);

  /* ---------- materials (shared; theme swap mutates their colors) ---------- */
  const M = {
    ground: new THREE.MeshLambertMaterial({ color: pal.ground, side: THREE.DoubleSide }),
    sea: new THREE.MeshLambertMaterial({ color: pal.sea, side: THREE.DoubleSide }),
    district: new THREE.MeshBasicMaterial({ color: pal.districtHex, transparent: true, opacity: pal.districtOpacity, side: THREE.DoubleSide, depthWrite: false }),
    road: new THREE.MeshLambertMaterial({ color: pal.road, side: THREE.DoubleSide }),
    quay: new THREE.MeshLambertMaterial({ color: pal.quay, side: THREE.DoubleSide }),
    roadEdge: new THREE.LineBasicMaterial({ color: pal.roadEdge }),
    seam: new THREE.LineBasicMaterial({ color: pal.roadSeam, transparent: true, opacity: pal.seamOpacity }),
    wall: new THREE.MeshLambertMaterial({ color: pal.wall }),
    wallTop: new THREE.MeshLambertMaterial({ color: pal.wallTop }),
    door: new THREE.MeshLambertMaterial({ color: 0x000000, transparent: true, opacity: 0.55 }),
    gold: new THREE.MeshStandardMaterial({ color: pal.gold, metalness: 0.65, roughness: 0.38, emissive: pal.goldDark, emissiveIntensity: 0.12 }),
    goldLine: new THREE.LineBasicMaterial({ color: pal.gold }),
    themes: {},
    annex: new THREE.MeshLambertMaterial({ color: pal.themes.controversy, transparent: true, opacity: 0.85 }),
  };
  for (const k in pal.themes) M.themes[k] = new THREE.MeshLambertMaterial({ color: pal.themes[k] });

  /* ---------- ground + sea ---------- */
  const groundPts = [];
  for (let k = 0; k < 40; k++) {
    const a = k / 40 * Math.PI * 2;
    const r = 900 + 60 * Math.sin(a * 3 + 1.7);
    groundPts.push([CX + r * Math.cos(a) + 110, CY + r * Math.sin(a) + 40]);
  }
  const ground = flatMesh(groundPts, 0, M.ground);
  ground.receiveShadow = true;
  root.add(ground);

  root.add(flatMesh(plan.SEA_POLY, 0.2, M.sea));

  /* the quay: the Way's last stretch, and the jetty out into the water */
  const quay = flatMesh(plan.QUAY_POLY, 0.45, M.quay);
  quay.receiveShadow = true;
  root.add(quay);

  /* ---------- district washes (one lobe per ward) ---------- */
  const washes = new THREE.Group();
  DISTRICTS.forEach(d => d.wards.forEach(w => {
    const hull = plan.hullOf(w.hoods, 18);
    washes.add(flatMesh(hull, 0.35, M.district));
  }));
  root.add(washes);

  /* ---------- the Way ---------- */
  const left = [], right = [];
  for (let i = 0; i < WAY.length - 1; i++) {
    const [x1, y1] = WAY[i], [x2, y2] = WAY[i + 1];
    let nx = -(y2 - y1), ny = x2 - x1;
    const L = Math.hypot(nx, ny) || 1; nx /= L; ny /= L;
    left.push([x1 + nx * ROAD_HALF, y1 + ny * ROAD_HALF]);
    right.push([x1 - nx * ROAD_HALF, y1 - ny * ROAD_HALF]);
  }
  const road = ribbonMesh(left, right, 0.5, M.road);
  road.receiveShadow = true;
  root.add(road);

  // kerbs
  const kerb = [];
  for (const side of [left, right]) for (let i = 0; i < side.length - 1; i++) {
    kerb.push(side[i][0], 0.55, side[i][1], side[i + 1][0], 0.55, side[i + 1][1]);
  }
  root.add(new THREE.LineSegments(
    new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(kerb, 3)), M.roadEdge));

  // paving seams across the road + a dashed centre line
  const seams = [];
  for (let i = 4; i < WAY.length - 1; i += 5) {
    const [x1, y1] = WAY[i], [x2, y2] = WAY[i + 1];
    let nx = -(y2 - y1), ny = x2 - x1;
    const L = Math.hypot(nx, ny) || 1; nx /= L; ny /= L;
    const w = ROAD_HALF - 1.2;
    seams.push(x1 + nx * w, 0.56, y1 + ny * w, x1 - nx * w, 0.56, y1 - ny * w);
  }
  root.add(new THREE.LineSegments(
    new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(seams, 3)), M.seam));

  const centre = [];
  for (let i = 0; i < WAY.length - 3; i += 6) {
    centre.push(WAY[i][0], 0.57, WAY[i][1], WAY[i + 3][0], 0.57, WAY[i + 3][1]);
  }
  root.add(new THREE.LineSegments(
    new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(centre, 3)), M.roadEdge));

  /* ---------- entry walkways: road edge → each doorway ---------- */
  all.forEach(h => {
    if (!h.roadPt) return;
    const bx = h.x + Math.cos(h.doorAng) * h.r, by = h.y + Math.sin(h.doorAng) * h.r;
    const dx = bx - h.roadPt[0], dy = by - h.roadPt[1];
    const L = Math.hypot(dx, dy);
    if (L > 150 || L < 2) return;
    const ux = dx / L, uy = dy / L;
    const sx = h.roadPt[0] + ux * (ROAD_HALF - 1), sy = h.roadPt[1] + uy * (ROAD_HALF - 1);
    const px = -uy * 2.1, py = ux * 2.1;
    root.add(flatMesh([
      [sx + px, sy + py], [bx + px + ux * 1.5, by + py + uy * 1.5],
      [bx - px + ux * 1.5, by - py + uy * 1.5], [sx - px, sy - py],
    ], 0.52, M.road));
  });

  /* ---------- theme roads (dotted overlays) ---------- */
  const dot = dotTexture();
  const themeRoads = {};
  const trColor = { life: pal.themes.sign, light: pal.themes.witness };
  for (const key in themeRoadPts) {
    const pts = [];
    for (let i = 0; i < themeRoadPts[key].length; i += 3) pts.push(themeRoadPts[key][i][0], 1.4, themeRoadPts[key][i][1]);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    // screen-space dots (like the canvas view's capped 4px markers) — with size
    // attenuation they balloon into beach balls as you walk past them
    const mat = new THREE.PointsMaterial({ color: trColor[key], size: 5, map: dot, transparent: true, alphaTest: 0.4, sizeAttenuation: false });
    const p = new THREE.Points(geo, mat);
    themeRoads[key] = p;
    root.add(p);
  }

  /* ---------- the wall ---------- */
  const wallGroup = new THREE.Group();
  for (const [a, b] of WALL_SEGS) {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const L = Math.hypot(dx, dy);
    const seg = new THREE.Mesh(new THREE.BoxGeometry(L, WALL_H, WALL_T), M.wall);
    seg.position.set((a[0] + b[0]) / 2, WALL_H / 2, (a[1] + b[1]) / 2);
    seg.rotation.y = -Math.atan2(dy, dx);
    seg.castShadow = true; seg.receiveShadow = true;
    wallGroup.add(seg);
    const ridge = new THREE.Mesh(new THREE.BoxGeometry(L, 1.1, WALL_T + 0.9), M.wallTop);
    ridge.position.set(seg.position.x, WALL_H + 0.5, seg.position.z);
    ridge.rotation.y = seg.rotation.y;
    ridge.castShadow = true;
    wallGroup.add(ridge);
  }
  root.add(wallGroup);

  /* ---------- gates: two towers and a lintel you walk under ---------- */
  GATES.forEach(g => {
    const rot = -Math.atan2(g.uy, g.ux);
    for (const s of [-1, 1]) {
      const t = new THREE.Mesh(new THREE.BoxGeometry(TOWER_W, TOWER_H, TOWER_W), M.wall);
      t.position.set(g.x + g.ux * GATE_GAP * s, TOWER_H / 2, g.y + g.uy * GATE_GAP * s);
      t.rotation.y = rot;
      t.castShadow = true; t.receiveShadow = true;
      root.add(t);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(TOWER_W + 1.6, 1.4, TOWER_W + 1.6), M.wallTop);
      cap.position.set(t.position.x, TOWER_H + 0.7, t.position.z);
      cap.rotation.y = rot;
      cap.castShadow = true;
      root.add(cap);
    }
    const span = 2 * (GATE_GAP - 4) + TOWER_W;
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(span, 6, 6), M.wall);
    lintel.position.set(g.x, 24, g.y);
    lintel.rotation.y = rot;
    lintel.castShadow = true;
    root.add(lintel);
    const lcap = new THREE.Mesh(new THREE.BoxGeometry(span, 1.2, 7), M.wallTop);
    lcap.position.set(g.x, 27.6, g.y);
    lcap.rotation.y = rot;
    lcap.castShadow = true;
    root.add(lcap);
  });

  /* ---------- the buildings ---------- */
  const buildings = [];
  const pickables = [];
  function addBuilding(h, mat) {
    const grp = new THREE.Group();
    grp.position.set(h.x, 0, h.y);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(h.r, h.r, h.h, 26), mat);
    body.position.y = h.h / 2;
    body.castShadow = true; body.receiveShadow = true;
    body.userData.hood = h;
    grp.add(body);
    pickables.push(body);

    const dW = Math.min(6.5, h.r * 0.75), dH = Math.min(11, h.h * 0.7);
    const door = new THREE.Mesh(doorGeometry(h.r, dW, dH), M.door);
    door.rotation.y = -h.doorAng;
    grp.add(door);

    const landmark = !!h.landmark || !!h.center;
    if (landmark) {
      const trim = new THREE.Line(doorOutline(h.r, dW, dH), M.goldLine);
      trim.rotation.y = -h.doorAng;
      grp.add(trim);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(h.r * 0.94, 0.42, 6, 44), M.gold);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = h.h + 0.25;
      grp.add(ring);
    }
    root.add(grp);
    buildings.push({ hood: h, group: grp, body, mat });
  }
  HOODS.forEach(h => addBuilding(h, M.themes[h.theme] || M.themes.discourse));
  addBuilding(AX, M.annex);

  /* selection ring — one object, moved to whatever is selected */
  const selRing = new THREE.Mesh(new THREE.TorusGeometry(1, 0.06, 6, 48), M.gold);
  selRing.rotation.x = Math.PI / 2;
  selRing.visible = false;
  root.add(selRing);

  /* ---------- I AM obelisks ---------- */
  const obeliskGroup = new THREE.Group();
  OBELISKS.forEach(o => {
    const cap = o.hgt * 0.22, w = 3.4 * Math.SQRT2;
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.55, w, o.hgt - cap, 4), M.gold);
    shaft.position.set(o.x, (o.hgt - cap) / 2, o.y);
    shaft.rotation.y = Math.PI / 4;
    shaft.castShadow = true;
    const tip = new THREE.Mesh(new THREE.ConeGeometry(w * 0.55, cap, 4), M.gold);
    tip.position.set(o.x, o.hgt - cap / 2, o.y);
    tip.rotation.y = Math.PI / 4;
    tip.castShadow = true;
    obeliskGroup.add(shaft, tip);
  });
  root.add(obeliskGroup);

  /* ---------- theme switching ---------- */
  function applyTheme(name) {
    pal = PAL[name];
    scene.background = skyTexture(pal);
    scene.fog.color.set(pal.fog);
    sun.color.set(pal.sunColor); sun.intensity = pal.sun;
    // at night a full-strength shadow is just a black hole in the street
    sun.shadow.intensity = name === "dark" ? 0.5 : 1;
    hemi.color.set(pal.hemiSky); hemi.groundColor.set(pal.hemiGround); hemi.intensity = pal.hemi;
    M.ground.color.set(pal.ground);
    M.sea.color.set(pal.sea);
    M.district.color.set(pal.districtHex); M.district.opacity = pal.districtOpacity;
    M.road.color.set(pal.road);
    M.quay.color.set(pal.quay);
    M.roadEdge.color.set(pal.roadEdge);
    M.seam.color.set(pal.roadSeam); M.seam.opacity = pal.seamOpacity;
    M.wall.color.set(pal.wall);
    M.wallTop.color.set(pal.wallTop);
    M.gold.color.set(pal.gold); M.gold.emissive.set(pal.goldDark);
    M.goldLine.color.set(pal.gold);
    M.annex.color.set(pal.themes.controversy);
    M.door.opacity = name === "dark" ? 0.7 : 0.55;
    for (const k in pal.themes) M.themes[k].color.set(pal.themes[k]);
    const tc = { life: pal.themes.sign, light: pal.themes.witness };
    for (const key in themeRoads) themeRoads[key].material.color.set(tc[key]);
  }
  applyTheme(themeName);

  function setSelected(h) {
    if (!h) { selRing.visible = false; return; }
    selRing.visible = true;
    selRing.position.set(h.x, h.h + 0.6, h.y);
    selRing.scale.set(h.r + 1.6, h.r + 1.6, 1.6);
  }

  return { root, buildings, pickables, obeliskGroup, themeRoads, washes,
    applyTheme, setSelected, sun, hemi, materials: M };
}
