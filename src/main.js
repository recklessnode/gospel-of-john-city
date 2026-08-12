/* ============ The Gospel of John as a City — 3D (Three.js) ============
   M1: feature parity with the canvas renderer (scripts/app3d.js) on a real
   WebGL scene — shadows, depth-sorted geometry, raycast picking, DOM labels.
   The city plan comes from src/plan.js, which is held to the canvas renderer
   and the 2D map by scripts/verify_parity.mjs. */

import * as THREE from "three";
import { buildPlan } from "./plan.js";
import { buildCity } from "./scene.js";
import { createLabels } from "./labels.js";
import { PAL } from "./palette.js";
import * as ChiasmUI from "./chiasm-ui.js";

const JOHN = window.JOHN;
const plan = buildPlan(JOHN);
const { TOTAL, HOODS, WARDS, DISTRICTS, byId, AX, GATES, OBELISKS, gatePt, portPt, CX, CY } = plan;
const ALL = HOODS.concat([AX]);

const fmt = n => n == null ? "—" : n.toLocaleString("en-US");
const themeLabel = k => (JOHN.themes[k] || { label: k }).label;
const ck = id => document.getElementById(id).checked;

/* ---------- renderer, scene, camera ---------- */
const canvas = document.getElementById("c");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xd6e2eb, 900, 3000);
const camera = new THREE.PerspectiveCamera(55, 1, 2, 6000);

let theme = (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light";
document.documentElement.setAttribute("data-theme", theme);

const city = buildCity(scene, plan, theme);
const labels = createLabels(document.getElementById("labels"));

/* ---------- camera state (same numbers as the canvas view) ---------- */
let mode = "orbit";
const cam = {
  target: new THREE.Vector3(CX, 0, CY + 40), yaw: 1.5, pitch: 0.66, dist: 980,
  walkT: 0, eye: 6.2, lookYaw: 0, lookPitch: -0.15,
};
let needRender = true;

function updateCamera() {
  if (mode === "orbit") {
    const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
    camera.position.set(
      cam.target.x + cam.dist * cp * Math.cos(cam.yaw),
      cam.target.y + cam.dist * sp,
      cam.target.z + cam.dist * cp * Math.sin(cam.yaw));
    camera.lookAt(cam.target);
    scene.fog.near = 900; scene.fog.far = 3000;
  } else {
    const p = plan.wayAt(cam.walkT);
    camera.position.set(p.x - p.dx * 26, cam.eye + 7, p.y - p.dy * 26);
    const ang = Math.atan2(p.dy, p.dx) + cam.lookYaw;
    const cp = Math.cos(cam.lookPitch);
    camera.lookAt(
      camera.position.x + Math.cos(ang) * cp,
      camera.position.y + Math.sin(cam.lookPitch),
      camera.position.z + Math.sin(ang) * cp);
    scene.fog.near = 250; scene.fog.far = 1400;
  }
  camera.updateMatrixWorld();
}

function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / Math.max(1, h);
  camera.updateProjectionMatrix();
  needRender = true;
}
window.addEventListener("resize", resize);

/* ---------- labels ---------- */
const DN = { d1: "PROLOGUE", d10: "BOOK OF SIGNS", d80: "BOOK OF GLORY", d97: "THE HARBOR" };
function labelItems() {
  const items = [];
  if (!ck("ck3-labels")) return items;
  const walk = mode === "walk";
  const MAXD = walk ? 330 : 2400;          // the canvas view's label horizon

  if (!walk) DISTRICTS.forEach(d => {
    const x = d.wards.reduce((s, w) => s + w.cx, 0) / d.wards.length;
    const z = d.wards.reduce((s, w) => s + w.cy, 0) / d.wards.length;
    items.push({ text: DN[d.id] || d.short, cls: "lbl district", pos: [x, 150, z], collide: true });
  });

  const wardItems = [];
  WARDS.forEach(w => {
    const hmax = Math.max(...w.hoods.map(h => h.h));
    wardItems.push({ text: w.short, cls: "lbl ward", pos: [w.cx, hmax + 26, w.cy], maxDepth: MAXD, collide: true });
  });

  const iamItems = [], signItems = [];
  if (walk || cam.dist < 520) {
    const ex = camera.position.x, ez = camera.position.z;
    // nearest first, so the closest sign wins the overlap contest
    const near = ALL.slice()
      .sort((a, b) => ((a.x - ex) ** 2 + (a.y - ez) ** 2) - ((b.x - ex) ** 2 + (b.y - ez) ** 2));
    let tested = 0;
    for (const h of near) {
      if (h.doorAng == null) continue;
      const nx = Math.cos(h.doorAng), nz = Math.sin(h.doorAng);
      const ax = h.x + nx * (h.r + 1.2), az = h.y + nz * (h.r + 1.2);
      if (nx * (ax - ex) + nz * (az - ez) > 0) continue;          // sign faces away
      const dH = Math.min(11, (h.h || 20) * 0.7);
      const pos = [ax, Math.min((h.h || 20) + 3, dH + 8), az];
      // a sign hovering in front of the city wall labels a building you cannot
      // see. Only the nearest handful are worth a ray.
      if (tested < 20) { tested++; if (occluded(pos)) continue; }
      signItems.push({ text: h.short, cls: "sign", collide: true, pos, maxDepth: walk ? 340 : 1500 });
    }
    if (ck("ck3-iam")) OBELISKS.forEach(o =>
      iamItems.push({ text: "✦ " + o.s.label, cls: "lbl iam", pos: [o.x, o.hgt + 8, o.y], maxDepth: MAXD, collide: true }));
  }

  const gateItems = [];
  GATES.forEach((g, i) => gateItems.push({ text: i === 0 ? "CITY GATE" : "WATER GATE", cls: "lbl gate", pos: [g.x, 34, g.y], maxDepth: MAXD, collide: true }));
  gateItems.push({ text: "WEST GATE · 1:1", cls: "lbl gate", pos: [gatePt[0], 24, gatePt[1]], maxDepth: MAXD, collide: true });
  gateItems.push({ text: "THE HARBOR · 21:25", cls: "lbl gate", pos: [portPt[0], 20, portPt[1]], maxDepth: MAXD, collide: true });
  gateItems.push({ text: "SEA OF TIBERIAS", cls: "lbl sea", maxDepth: MAXD, collide: true,
    pos: [CX + 740 * Math.cos(0.17), 2, CY + 740 * Math.sin(0.17)] });

  // priority order: districts, then gates, wards, I AM sayings, door signs
  return items.concat(gateItems, wardItems, iamItems, signItems);
}

/* ---------- label occlusion + reserved UI boxes ---------- */
const occRay = new THREE.Raycaster();
const occDir = new THREE.Vector3();
function occluded(pos) {
  occDir.set(pos[0] - camera.position.x, pos[1] - camera.position.y, pos[2] - camera.position.z);
  const dist = occDir.length();
  if (dist < 4) return false;
  occRay.set(camera.position, occDir.normalize());
  occRay.far = dist - 3;
  return occRay.intersectObjects(city.occluders, false).length > 0;
}
function reservedBoxes() {
  const stage = document.getElementById("stage").getBoundingClientRect();
  const out = [];
  for (const id of ["legend3d", "walkbar"]) {
    const el = document.getElementById(id);
    if (!el || !el.offsetParent) continue;
    const r = el.getBoundingClientRect();
    out.push([r.left - stage.left - 6, r.top - stage.top - 6, r.width + 12, r.height + 12]);
  }
  return out;
}

/* ---------- render ---------- */
function render() {
  updateCamera();
  renderer.render(scene, camera);
  labels.update(labelItems(), camera, canvas.clientWidth, canvas.clientHeight, reservedBoxes());
}

/* ---------- picking ---------- */
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
function pickAt(px, py) {
  ndc.set(px / canvas.clientWidth * 2 - 1, -(py / canvas.clientHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  const hit = raycaster.intersectObjects(city.pickables, false)[0];
  return hit ? hit.object.userData.hood : null;
}

/* ---------- tooltip ---------- */
const tooltip = document.getElementById("tooltip");
function hoodTooltip(h) {
  return `<div class="tt-name">${h.short}</div>
    <div class="tt-ref">John ${h.ref}${h.chiasm ? " · chiasm " + h.chiasm : ""}</div>
    <div class="tt-path">${h.district ? h.district.short + " › " + h.ward.short : "Outside the wall"}</div>
    <div class="tt-stats"><span><b>${fmt(h.verses)}</b> vv</span><span><b>${fmt(h.greek)}</b> Greek</span><span><b>${fmt(h.eng)}</b> English</span></div>
    <div class="tt-theme"><span class="swatch" style="background:var(--t-${h.theme})"></span>${themeLabel(h.theme)}</div>`;
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
  } else { tooltip.style.display = "none"; canvas.style.cursor = "grab"; }
});

/* ---------- detail panel ---------- */
const panel = document.getElementById("panel");
const panelBody = document.getElementById("panel-body");
let selectedId = null;
function closePanel() { panel.classList.remove("open"); selectedId = null; city.setSelected(null); needRender = true; }
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
  selectedId = h.id; city.setSelected(h); needRender = true;
  let html = `<div class="crumb">${h.district ? h.district.short + " › " + h.ward.short : "Outside the city wall"}</div>
    <h2>${h.short}</h2><div class="ref">John ${h.ref} · ${buildingKind(h.greek)}</div>
    <div class="themechip"><span class="swatch" style="background:var(--t-${h.theme})"></span>${themeLabel(h.theme)}${h.chiasm ? " · chiasm " + h.chiasm : ""}</div>
    ${statBlock(h)}<div class="full-desc">${h.desc}</div>`;
  if (h.note) html += `<div class="note">${h.note}</div>`;
  if (h.details && h.details.length) {
    html += `<h3>Inside this block</h3>` + h.details.map(d =>
      `<div class="detail-item"><span>${d.desc}</span><span class="g">${d.greek != null ? d.greek + " gw" : ""}</span></div>`).join("");
  }
  html += ChiasmUI.renderHood(h.id, {});
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
  ChiasmUI.bind(panelBody, { onOpenHood: id => openHood(byId[id]) });
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
      // pan the target across the ground, in the camera's own frame — drag and
      // the city follows the mouse (same formula as the canvas view)
      const s = cam.dist / ((canvas.clientHeight / 2) / Math.tan(camera.fov * Math.PI / 360));
      const f = new THREE.Vector3(); camera.getWorldDirection(f);
      const rx = -f.z, rz = f.x;                        // camera right, on the ground
      const k = Math.max(0.35, Math.cos(cam.pitch));
      cam.target.x -= (dx * rx - dy * f.x / k) * s;
      cam.target.z -= (dx * rz - dy * f.z / k) * s;
    } else {
      cam.yaw += dx * 0.0055;
      // street-grazing (≈6°) up to near-top-down (≈89°): never under the ground
      cam.pitch = Math.max(0.10, Math.min(1.55, cam.pitch + dy * 0.004));
    }
  } else {
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
    cam.target.set(h.x, 0, h.y);
    cam.dist = Math.max(220, cam.dist * 0.55);
    needRender = true;
  }
});
canvas.addEventListener("wheel", ev => {
  ev.preventDefault();
  if (mode === "orbit") cam.dist = Math.max(130, Math.min(2100, cam.dist * Math.pow(1.0015, ev.deltaY)));
  else { cam.walkT = Math.max(0, Math.min(1, cam.walkT + ev.deltaY * 0.00012)); syncWalkUI(); }
  needRender = true;
}, { passive: false });

/* ---------- walk mode ---------- */
const walkbar = document.getElementById("walkbar");
const walkpos = document.getElementById("walkpos");
const walkinfo = document.getElementById("walkinfo");
const playbtn = document.getElementById("playbtn");
const enterbtn = document.getElementById("enterbtn");
const pacectl = document.getElementById("pacectl");
const paceval = document.getElementById("paceval");
let playing = false, pace = 1;
pacectl.addEventListener("input", () => {
  pace = +pacectl.value;
  paceval.textContent = (pace % 1 ? pace.toFixed(2).replace(/0$/, "") : pace) + "×";
});
const verseAt = t => {   // the approach outside the wall is pre-1:1
  const u = plan.gateT >= 1 ? t : Math.max(0, (t - plan.gateT) / (1 - plan.gateT));
  return Math.max(1, Math.min(TOTAL, Math.round(u * (TOTAL - 1) + 1)));
};
function chapterVerseOf(v) {
  let ch = 1;
  for (let c = 1; c <= 21; c++) { if (JOHN.chapterOffsets[c] < v) ch = c; }
  return ch + ":" + (v - JOHN.chapterOffsets[ch]);
}
const hoodOfVerse = v => HOODS.find(h => h.v0 <= v && v <= h.v1);
function syncWalkUI() {
  walkpos.value = Math.round(cam.walkT * 1000);
  const v = verseAt(cam.walkT), h = hoodOfVerse(v);
  walkinfo.innerHTML = `<b>${cam.walkT < plan.gateT ? "Approaching the West Gate" : (h ? h.short : "The Way")}</b>John ${chapterVerseOf(v)}${h ? " · " + h.ward.short : ""}`;
}
function enterCurrent() {
  const h = hoodOfVerse(verseAt(cam.walkT));
  if (h) { playing = false; playbtn.textContent = "▶"; openHood(h); }
}
enterbtn.addEventListener("click", enterCurrent);
walkpos.addEventListener("input", () => {
  cam.walkT = walkpos.value / 1000; playing = false; playbtn.textContent = "▶";
  syncWalkUI(); needRender = true;
});
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

/* ---------- legend + overlays ---------- */
(function buildLegend() {
  const lg = document.getElementById("legend");
  for (const key in JOHN.themes) {
    const lab = document.createElement("label");
    lab.innerHTML = `<span class="swatch" style="background:var(--t-${key})"></span>${JOHN.themes[key].label}`;
    lg.appendChild(lab);
  }
  const mk = (id, txt, checked, onChange) => {
    const lab = document.createElement("label");
    lab.innerHTML = `<input type="checkbox" id="${id}" ${checked ? "checked" : ""}> ${txt}`;
    lg.appendChild(lab);
    lab.querySelector("input").addEventListener("change", ev => {
      if (onChange) onChange(ev.target.checked);
      needRender = true;
    });
  };
  const t = document.createElement("div");
  t.className = "grp-title"; t.textContent = "Overlays"; lg.appendChild(t);
  mk("ck3-iam", "“I AM” obelisks", true, v => city.obeliskGroup.visible = v);
  mk("ck3-life", "Life & Water road", true, v => city.themeRoads.life.visible = v);
  mk("ck3-light", "Light & Witness road", true, v => city.themeRoads.light.visible = v);
  mk("ck3-labels", "Labels", true, v => { if (!v) labels.clear(); });
})();

/* ---------- day / night ---------- */
document.getElementById("themebtn").addEventListener("click", () => {
  theme = theme === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", theme);
  city.applyTheme(theme);
  needRender = true;
});

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
syncWalkUI();
requestAnimationFrame(loop);
