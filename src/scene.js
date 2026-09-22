/* ============ The city, built as Three.js geometry ============
   Plan coordinates (x, y) become world (x, height, z=y). Everything here is
   procedural: no downloaded models, no textures fetched at runtime.

   M1 keeps the massing of the canvas renderer (cylinders, box wall, gate
   towers) so the two 3D views can be compared feature-for-feature. The
   ancient-architecture kits land in M2. */

import * as THREE from "three";
import { PAL, SUN } from "./palette.js";
import { makeKitMaterials, buildBlock, buildWall, buildGate } from "./kits.js";

const WALL_H = 16, WALL_T = 3.2;

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
    CX, CY, ROAD_HALF, GATE_GAP, gatePt, portPt } = plan;
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
    sea: new THREE.MeshLambertMaterial({ color: pal.sea, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }),
    district: new THREE.MeshBasicMaterial({ color: pal.districtHex, transparent: true, opacity: pal.districtOpacity, side: THREE.DoubleSide, depthWrite: false }),
    road: new THREE.MeshLambertMaterial({ color: pal.road, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }),
    quay: new THREE.MeshLambertMaterial({ color: pal.quay, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    roadEdge: new THREE.LineBasicMaterial({ color: pal.roadEdge }),
    seam: new THREE.LineBasicMaterial({ color: pal.roadSeam, transparent: true, opacity: pal.seamOpacity }),
    gold: new THREE.MeshStandardMaterial({ color: pal.gold, metalness: 0.65, roughness: 0.38, emissive: pal.goldDark, emissiveIntensity: 0.12 }),
  };
  const kit = makeKitMaterials(themeName);
  const kitMats = kit.mats;

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

  /* ---------- the wall: crenellated circuit with towers ---------- */
  const wallGroup = buildWall(WALL_SEGS, kitMats, { height: WALL_H, thickness: WALL_T, centre: [CX, CY] });
  root.add(wallGroup);
  const occluders = [];
  wallGroup.traverse(o => { if (o.isMesh) occluders.push(o); });

  /* ---------- gates: flanking towers and an arch you walk under ---------- */
  GATES.forEach(g => {
    const gg = buildGate(g, kitMats, { gap: GATE_GAP, height: WALL_H });
    root.add(gg);
    gg.traverse(o => { if (o.isMesh) occluders.push(o); });
  });

  /* ---------- the buildings ---------- */
  const buildings = [];
  const pickables = [];
  function addBuilding(h) {
    const { group, kit } = buildBlock(h, kitMats);
    root.add(group);
    group.traverse(o => { if (o.isMesh) { pickables.push(o); occluders.push(o); } });
    if (h.landmark || h.center) {          // landmarks keep their gold crown
      const b = h.r * 0.78 + 0.5, frame = new THREE.Group();   // a gold cornice on the parapet
      for (const [w, d, x, z] of [[b * 2, 0.7, 0, b], [b * 2, 0.7, 0, -b], [0.7, b * 2, b, 0], [0.7, b * 2, -b, 0]]) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(w, 0.9, d), M.gold);
        bar.position.set(x, 0, z);
        frame.add(bar);
      }
      frame.position.set(h.x, h.h + 0.5, h.y);
      frame.rotation.y = -h.doorAng;
      root.add(frame);
    }
    buildings.push({ hood: h, group, kit });
  }
  HOODS.forEach(addBuilding);
  addBuilding(AX);

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
    M.gold.color.set(pal.gold); M.gold.emissive.set(pal.goldDark);
    kit.applyTheme(name);
  }
  applyTheme(themeName);

  function setSelected(h) {
    if (!h) { selRing.visible = false; return; }
    selRing.visible = true;
    selRing.position.set(h.x, h.h + 0.6, h.y);
    selRing.scale.set(h.r + 1.6, h.r + 1.6, 1.6);
  }

  return { root, buildings, pickables, occluders, obeliskGroup, washes,
    applyTheme, setSelected, sun, hemi };
}
