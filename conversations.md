# conversations.md — session log

A running log of working sessions on this project, tied to git commit IDs.

**Convention:** each session gets an entry written as the work happens. Commit IDs are
appended to an entry as commits are made; since a commit can't contain its own hash,
the ID line for a commit lands in the *next* commit — the log trails the history by
one step. `git log --oneline` is always the ground truth.

---

## 2026-08-10 — Session 1: first interactive map + repo setup

**Participants:** Ronald + Claude (Fable 5, with Opus 5 review agents)

**Inputs:** `John gospel as a city.xlsx` (John Stats outline, bubble data, chapter
locations, city-levels glossary), PaulDz's hand-drawn city sketch, the Gemini concept
doc ("Gospel of John as a city").

**Decisions made:**

- Map layout: **both views, toggleable** — organic walled city (primary, after
  PaulDz's sketch) + linear west→east "Johannine Way" skyline; plus an Index table view.
- Repo: **public, GitHub Pages enabled** so Ronald and PaulDz can share a live URL.
- Data curation: John Stats is the authoritative outline; footprint neighborhoods are
  the non-overlapping pericopes, with addenda/markers/episodes kept as drill-down
  details. 16:4b–33 (missing from John Stats) patched from bubble data (442 gw —
  completes ward IX's chiasm and its 2,296 gw total). Ward VII extended to 11:55–12:11.
  Known sheet discrepancies documented in README rather than silently fixed.
- Visual design: seven theme colors from the validated dataviz palette (witness /
  signs / discourse / controversy / farewell-love / passion / resurrection); gold
  stars for the "I AM" landmarks; the two theme paths from PaulDz's sketch rendered
  as toggleable roads (Life & Water, Light & Witness); chiasms as A↔A′ bridge arcs
  with the D-center (15:12–17) drawn as a ringed fountain; 7:53–8:11 as "The Mercy
  Annex" outside the wall.
- Agent policy (per Ronald): mix Opus 5 + Fable 5 subagents to conserve tokens —
  build inline, review out-of-line. Documented in `agents.md`.

**Work done:** data pipeline (`build_data.py` → `john-data.json`), single-file
interactive map (`index.html` via template + app.js), light/dark modes, pan/zoom,
tooltips, detail panel with chiasm ladders, screenshot-based QA in headless Chromium
(fixed: annex NaN placement, pointer-capture eating clicks, label collisions,
CSS-vs-attribute font sizing).

**Review results:** Fable 5 data audit — zero mismatches (all hood/ward/district stats,
verse indices, I AM positions verified against the sheets; three half-verse boundary
overlaps confirmed intentional). Opus 5 visual QA — 27 findings; all 3 CRITICAL and
9 MAJOR fixed (label halos + counter-scaling on zoom, ward-lobe district hulls,
harbor moved outside the wall, dark-mode resurrection green, legend/how-to-read
rework, keyboard access); a few MINOR polish items deferred.

**GitHub note:** the cloud sandbox's GitHub proxy only allows repos pre-connected to
a session, so publishing runs from Ronald's WSL via `publish.sh` (gh repo create +
push + enable Pages).

**Commits:** *(IDs appended as made — each ID lands in the following commit)*
- `4cb9bf8` — Initial build: interactive map, data pipeline, review fixes
