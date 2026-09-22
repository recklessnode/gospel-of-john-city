# The Gospel of John as a City

An interactive map that renders the **Gospel of John** as a city, making its literary
architecture tangible: districts for the great narrative blocks, wards for the major
sections, and neighborhood "buildings" sized by Greek word count. A collaboration
between Ronald and PaulDz.

**Live map:** https://recklessnode.github.io/gospel-of-john-city/ *(GitHub Pages)*

## The three views

| View | What it shows |
|---|---|
| **City Map** | An organic walled city (after PaulDz's sketch): Prologue at the gate, Book of Signs on the west side, Book of Glory on the east, and the Harbor of Tiberias (ch. 21) outside the wall. The **Johannine Way** runs from the West Gate (1:1) to the harbor (21:25). |
| **The Way (linear)** | The same 879 verses as a straight west→east skyline — building height = Greek word count, chapter mileposts along the road. |
| **Index** | The full gazetteer as a sortable reference table. |

Interactive elements: pan/zoom, hover tooltips, click any building for a detail panel
(including chiasm ladders for the Upper Room and Praetorium plazas), and toggles for
the **"I AM" landmarks** and **chiasm bridges** linking A↔A′ pairs.

## Structure encoded in the map

- **Districts (Y=1):** Prologue (1:1–51) · Book of Signs (2–12) · Book of Glory (13–20) · Harbor/Epilogue (21)
- **Wards (Y=2):** the 13 major sections (Roman numerals I–XIII in the source outline)
- **Neighborhoods (Y=3):** ~60 pericopes; bubble area / building height = Greek words
- **Chiasms:** the farewell discourse (13–17, centered on 15:12–17, the love commandment)
  and the passion (18–19, centered on the trial before Pilate) render as radial plazas
  with bridge arcs
- **The Mercy Annex** (7:53–8:11, the woman caught in adultery) sits outside the wall —
  a later insertion, mapped as a detached lot adjoining the Temple Citadel

## Repository layout

```
index.html            ← the deliverable (fully self-contained; open it anywhere)
index.template.html   ← HTML/CSS shell with __DATA__/__APP__ placeholders
scripts/app.js        ← map application (layout, rendering, interaction)
scripts/build_data.py ← extracts data/john-data.json from the source spreadsheet
scripts/build.py      ← assembles index.html from template + data + app
data/John gospel as a city.xlsx  ← source data (John Stats outline et al.)
data/john-data.json   ← generated dataset
conversations.md      ← running log of working sessions, tied to commit IDs
agents.md             ← how AI agents (Opus 5 / Fable 5) are used in this project
```

To rebuild: `python3 scripts/build_data.py && python3 scripts/build.py`

## Data notes

- Verse positions use cumulative verse indices (1–879) computed from per-chapter verse
  counts in the *chapter locations* sheet.
- Word counts come from the *John Stats* sheet by row ID. Known quirks, deliberately
  preserved rather than silently "fixed":
  - Section 16:4b–33 (442 gw) is absent from *John Stats*; its count comes from the
    *bubble data* sheet (it completes ward IX's total of 2,296 exactly).
  - Ward totals in *John Stats* sometimes include overlapping addenda, so district
    totals don't always equal the sum of their wards (e.g. Book of Signs is listed
    at 7,707 gw while its ward rows sum higher).
  - Ward VII (11:1–54) is extended on the map to include the bridge passage
    11:55–12:11, with its stats adjusted accordingly (851 → 1,070 gw, noted in-app).

## 3D views

There are two, and they render the same city from the same plan:

| Page | Renderer | Notes |
|---|---|---|
| [`city3d-three.html`](https://recklessnode.github.io/gospel-of-john-city/city3d-three.html) | Three.js (WebGL) | Phase 2. Real sun + shadows, fog, raycast picking. The one to look at. |
| [`city3d.html`](https://recklessnode.github.io/gospel-of-john-city/city3d.html) | Canvas, dependency-free | Phase 1 classic. Kept as the fallback for machines without WebGL. |

Both are single self-contained files — the Three.js build is bundled and inlined, so
there is no CDN dependency at view time. They cross-link in the header.

### The 3D view

A 3D render of the same city. **Orbit mode**
(drag to rotate/tilt, scroll to zoom, shift-drag to pan, double-click to focus) and
**Walk the Way** — a street-level camera that follows the Johannine Way from the West
Gate (1:1) to the harbor (21:25), with a scrub bar that reads out the verse you're
passing. Gold obelisks mark the "I AM" sayings.

**Phase 2: ancient-world architecture.** Milestone M1 (done) rebuilt the 3D view on
Three.js — see `docs/phase2-ancient-city.md`. M2 brings the procedural building kits:
Herodian temple platform for the Temple Citadel, Roman fortress for the Praetorium,
stoa-lined agora for the marketplaces, stepped pools for Bethesda/Siloam, Judean
courtyard houses for the Upper Room, crenellated wall with gate towers, quay + boats
at the harbor, stelae for the I AM landmarks.

### Building it

```bash
npm install       # three + esbuild + playwright
npm run build     # parity check → bundle → assemble all three pages
```

`npm run verify` alone checks that the 2D map, the canvas 3D view and the Three.js
view still lay the city out in exactly the same place — the plan is duplicated across
three renderers by design, so it is held together by a test rather than by care.
