/* ============ Billboarded DOM labels ============
   The canvas renderer drew text with the 2D context after the 3D pass; here the
   same labels are absolutely-positioned divs over the WebGL canvas. Signs keep
   the nearest-first collision rule: whoever is closest to the camera wins the
   spot, everyone overlapping it is dropped. */

import * as THREE from "three";

const v = new THREE.Vector3();

export function createLabels(container) {
  const pool = [];

  /* items: {text, cls, pos:[x,y,z], maxDepth, collide} — already in draw order
     (nearest first for signs, so earlier entries win overlap contests). */
  function update(items, camera, W, H, reserved = []) {
    // the legend and walk bar own their screen space: labels are culled out of
    // them rather than painted over them
    const rects = reserved.slice();
    let n = 0;
    for (const it of items) {
      v.set(it.pos[0], it.pos[1], it.pos[2]);
      const depth = v.distanceTo(camera.position);
      if (it.maxDepth && depth > it.maxDepth) continue;
      v.project(camera);
      if (v.z > 1 || v.z < -1) continue;                        // behind or beyond
      const x = (v.x * 0.5 + 0.5) * W, y = (-v.y * 0.5 + 0.5) * H;
      if (x < -160 || x > W + 160 || y < -60 || y > H + 60) continue;

      if (it.collide) {
        const w = it.text.length * 6.2 + 14, h = 18;
        const bx = x - w / 2, by = y - h;
        let hit = false;
        for (const r of rects) {
          if (bx < r[0] + r[2] && bx + w > r[0] && by < r[1] + r[3] && by + h > r[1]) { hit = true; break; }
        }
        if (hit) continue;
        rects.push([bx, by, w, h]);
      }

      let el = pool[n];
      if (!el) { el = document.createElement("div"); container.appendChild(el); pool[n] = el; }
      if (el._text !== it.text) { el.textContent = it.text; el._text = it.text; }
      const cls = it.cls;
      if (el._cls !== cls) { el.className = cls; el._cls = cls; }
      el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      el.style.display = "";
      n++;
    }
    for (let i = n; i < pool.length; i++) pool[i].style.display = "none";
  }

  function clear() { pool.forEach(el => el.style.display = "none"); }

  return { update, clear };
}
