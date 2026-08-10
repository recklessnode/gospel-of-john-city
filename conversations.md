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
- `e211124` — publish.sh + logged 4cb9bf8

### Addendum: 3D view (same session)

Ronald asked what 3D would take (street-view height, orbit/tilt, easier zoom) and
about ancient-world styling (Jerusalem/Rome/Ephesus/Aksum). Decisions:
**Phase 1 now** — 3D as a separate `city3d.html`; ancient-architecture kits are
Phase 2 (scoped in README). Constraint discovered: the sandbox blocks npm/pip/CDN
fetches, so Phase 1 ships a dependency-free Canvas perspective renderer (painter's
algorithm) instead of bundling Three.js; the plan layout is shared verbatim with the
2D map so both views agree. Features: orbit/tilt/zoom/focus camera, **Walk the Way**
street mode with verse scrub (gate 1:1 → harbor 21:25), I AM obelisks, theme roads,
day/night, tooltips + detail panel. GitHub publishing clarified for Ronald: cloud
sessions can't create repos (proxy is repo-scoped); one-time `publish.sh` in WSL,
after which the repo can be connected to future sessions for direct pushes.

- `d497d07` — city3d.html: 3D orbit + Walk-the-Way
- `2d1e3bb` — logged d497d07
- `4d29284` — publish.sh made idempotent (identity + existing-repo push), after
  Ronald's second run hit "Name already exists" / "empty ident name"

### Published! (same day)

Ronald published: repo `recklessnode/gospel-of-john-city`, live at
https://recklessnode.github.io/gospel-of-john-city/. First deploy had a propagation
lag; 3D page followed in a second push. Ronald's feedback on 3D: the city rendered
**mirrored** ("upside down") vs the 2D map — root cause was a left-handed camera
basis (right vector = up×f instead of f×up); fixed to a proper right-handed lookAt
basis so N is up / E is right, matching the 2D map. Pitch clamped to ≈6°–89° so the
camera can orbit from street-grazing to top-down but never under the plane.

**Publishing saga, resolved:** update-by-bundle kept failing in Ronald's WSL because
his repos lived on /mnt/c (Windows mount) — DrvFS permissions + GitHub Desktop's CRLF
checkouts made git see every file as permanently modified. Fix that worked, in the
GitHub-Desktop clone: `git config core.fileMode false` + `core.autocrlf input` +
`git reset --hard`, then pull the self-contained full-history bundle and push
(cb32ca8..fff0189 on GitHub). Camera fix confirmed live on main via raw fetch.
Canonical working copy is now `Documents/GitHub/gospel-of-john-city`; future sessions
should connect the GitHub repo so Claude pushes directly.

- `15f59e7` — 3D camera fix (merged to GitHub in fff0189)
- `13247d9` — logged the publishing resolution

### Walkable streets (same day, Ronald's feedback)

Ronald: add a **pace** control to Walk the Way; make the road a real walked road with
a **hard boundary** so buildings never clip the camera; and give buildings **doorways
opening onto the road with entry walkways**, so a viewer can "enter" a passage.
Implemented: a road-clearance phase in the layout (buildings pushed to ≥ radius +
13.5 units off the frozen Way centerline; identical code in app.js and app3d.js so
2D and 3D remain the same city; wall hull and ward centroids recomputed after),
arched doorways on each building's road-facing side, paved entry walkways road-edge →
door (drawn as alley stubs in 2D), a 0.25×–5× pace slider in the walk bar, and an
"Enter ⏎" action that opens the interior (detail panel) of the passage being passed.
