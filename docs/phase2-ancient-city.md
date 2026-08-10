# Phase 2 — The Ancient City (Three.js)

Goal: the same city, the same data, the same walk — but built like the first-century
eastern Mediterranean. Abstract cylinders become period architecture; the wall gets
towers and crenellations; the gates become real arches you pass under; doorways
become openings you can step through.

## What carries over unchanged

- `data/john-data.json` and the whole data pipeline — untouched.
- The **city plan**: reuse the layout verbatim (port `layoutPlan` + road clearance
  from `scripts/app3d.js`; positions must keep matching the 2D map in `app.js`).
- Interaction model: orbit (clamped street-to-topdown), Walk the Way (pace slider,
  scrub, free-look, Enter-to-explore), door signs, tooltips, detail panel, day/night.
- The 2D map (`index.html`) is finished — Phase 2 does not touch it.

## Technical plan

- **Stack:** `npm install three` + esbuild → one bundled IIFE inlined into
  `city3d.html` by `scripts/build.py` (keep the single-file, GitHub-Pages-served
  output; ~700KB is fine). No CDN dependency at runtime.
- Renderer: WebGLRenderer, sRGB, shadow maps (one directional sun + hemisphere
  ambient). OrbitControls for orbit mode; the walk camera stays hand-rolled (it
  already does exactly what we want — path-follow + look offsets).
- Raycasting for hover/click replaces the screen-space pick.
- Labels/signs: CSS2DRenderer (billboarded DOM) or canvas-texture sprites for the
  door boards; keep nearest-first collision culling.
- Keep `scripts/app3d.js` (canvas renderer) working until parity, then retire it to
  `city3d-classic.html` or delete once Ronald signs off.

## Building kits (procedural, from primitives — no downloaded models)

| Sites | Kit | Elements |
|---|---|---|
| Temple Citadel ward (7–8) | Herodian temple platform | ashlar podium, colonnaded portico, golden façade accent |
| Praetorium Fortress (18–19) | Roman fortress/basilica | corner towers, arched gate, austere massing |
| Marketplaces & forums (large discourse/controversy blocks) | Agora + stoa (Ephesus) | colonnade rows, pediment, open court |
| Bethesda Pool, Siloam, Samaritan Well, Living Water | Stepped pool | sunken basin, steps, porticoes, water material |
| Upper Room Enclave (13–17) | Judean courtyard houses | flat roofs, exterior stairs, shared court; the D-center (15:12–17) as a fountain court |
| Bethany Gardens (11) | Garden villa + tomb | trees, rolled-stone tomb for Lazarus |
| Sunrise Gardens (20) | Garden + open tomb | dawn lighting bias |
| Harbor (21) | Quay + boats | stone pier, 1–2 Galilee fishing boats, charcoal fire glow |
| I AM landmarks | Stelae (Aksumite silhouette) | carved gold-accent monolith replacing the obelisks |
| City wall | Crenellated circuit | parapet, merlons, towers at intervals; real arched CITY/WATER gates |
| Mercy Annex (7:53–8:11) | Detached walled lot | outside the wall, gate ajar |
| Small blocks (<150 gw) | Shrine / house | one-room, pitched or flat roof |

Size still encodes Greek word count: kits scale footprint/height from `h.r`/`h.h`.
Theme colors survive as material tinting (awnings, doors, banners) so the legend
stays truthful.

## Milestones

1. **M1 — parity:** Three.js scene reproducing today's city3d.html feature-for-
   feature (extrusions OK), shadows on. Verify against the canvas version.
2. **M2 — kits:** the table above, applied by ward/site mapping + size tier.
3. **M3 — interiors:** doorways become real openings; Enter transitions the camera
   inside (a simple themed room: the detail panel content rendered as wall plaques).
4. **M4 — atmosphere:** water shader on sea/pools, sky/lighting presets (dawn over
   the harbor for ch. 20–21), footstep-height camera bob toggle, ambient birds.

## Verification walkthrough (screenshot at these walk positions)

walkT ≈ 0.03 (CITY GATE approach) · 0.18 (Cana–Samaria) · 0.40 (Temple Citadel
street) · 0.62 (Upper Room court) · 0.80 (Praetorium) · 0.97 (WATER GATE → harbor).
Plus orbit default, orbit top-down (compare to 2D map orientation), dark mode.
