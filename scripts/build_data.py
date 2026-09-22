#!/usr/bin/env python3
"""Build john-data.json from 'John gospel as a city.xlsx'.

Curated hierarchy: District -> Ward -> Neighborhood (+ detail blocks).
Numbers (verse counts, English/Greek words) are pulled from the 'John Stats'
sheet by ID_NUM so transcription errors are impossible; structural curation
(which rows are map footprints vs. drill-down details) is explicit below.
"""
import json, re, sys

import openpyxl

XLSX = sys.argv[1] if len(sys.argv) > 1 else "data/John gospel as a city.xlsx"

# --- chapter verse counts (from 'chapter locations' sheet; total = 879) ---
CH_VERSES = [51, 25, 36, 54, 47, 71, 53, 59, 41, 42, 57, 50, 38, 31, 27, 33, 26, 40, 42, 31, 25]
CH_OFFSET = {}
run = 0
for i, n in enumerate(CH_VERSES, start=1):
    CH_OFFSET[i] = run
    run += n
TOTAL_VERSES = run  # 879


def vidx(ch, v):
    return CH_OFFSET[ch] + v


REF_RE = re.compile(r"(\d+):(\d+)[ab]?(?:[–-](?:(\d+):)?(\d+)[ab]?)?")


def parse_ref(ref):
    m = REF_RE.search(ref)
    if not m:
        raise ValueError(f"bad ref: {ref}")
    c1, v1 = int(m.group(1)), int(m.group(2))
    c2 = int(m.group(3)) if m.group(3) else c1
    v2 = int(m.group(4)) if m.group(4) else v1
    return vidx(c1, v1), vidx(c2, v2)


# --- load John Stats rows by ID_NUM ---
wb = openpyxl.load_workbook(XLSX, data_only=True)
ws = wb["John Stats"]
ROWS = {}
for r in ws.iter_rows(min_row=2, values_only=True):
    if r[0] is None:
        continue
    ROWS[int(r[0])] = {
        "desc": (r[1] or r[2] or "").strip(),
        "verses": r[3], "eng": r[4], "greek": r[5],
    }


def N(row_id, short, ref, theme, chiasm=None, details=None, landmark=None, extra=None):
    """Neighborhood from a John Stats row."""
    r = ROWS[row_id]
    v0, v1 = parse_ref(ref)
    d = {
        "id": f"n{row_id}", "short": short, "ref": ref, "theme": theme,
        "desc": r["desc"], "verses": r["verses"], "eng": r["eng"], "greek": r["greek"],
        "v0": v0, "v1": v1, "mid": (v0 + v1) / 2,
    }
    if chiasm: d["chiasm"] = chiasm
    if details: d["details"] = details
    if landmark: d["landmark"] = landmark
    if extra: d.update(extra)
    return d


def NM(short, ref, theme, greek, eng=None, verses=None, desc="", chiasm=None, note=None):
    """Manual neighborhood (not a clean John Stats row)."""
    v0, v1 = parse_ref(ref)
    d = {
        "id": "m" + ref.replace(":", "_").replace("–", "-"), "short": short, "ref": ref,
        "theme": theme, "desc": desc or short, "verses": verses or (v1 - v0 + 1),
        "eng": eng, "greek": greek, "v0": v0, "v1": v1, "mid": (v0 + v1) / 2,
    }
    if chiasm: d["chiasm"] = chiasm
    if note: d["note"] = note
    return d


def D(row_id, fmt=None):
    """Detail block string from a row."""
    r = ROWS[row_id]
    g = r["greek"]
    return {"desc": r["desc"], "greek": g, "verses": r["verses"]}


# Prologue poem blocks (from 'bubble data' sheet)
POEM_BLOCKS = [
    {"desc": "1:1–5 The Creative Word", "greek": 63},
    {"desc": "1:6–8 John the Witness", "greek": 37},
    {"desc": "1:9–11 Light in Israel", "greek": 36},
    {"desc": "1:12–13 Children of God", "greek": 40},
    {"desc": "1:14 Word in Israel", "greek": 27},
    {"desc": "1:15 John the Witness", "greek": 23},
    {"desc": "1:16–18 Life-Mediating Son", "greek": 42},
]

CITY = {
    "title": "The Gospel of John as a City",
    "totalVerses": TOTAL_VERSES,
    "chapterOffsets": CH_OFFSET,
    "chapterVerses": {i + 1: n for i, n in enumerate(CH_VERSES)},
    "themes": {
        "witness":      {"label": "Witness & Testimony", "light": "#eda100", "dark": "#c98500"},
        "sign":         {"label": "Signs & Life-Giving", "light": "#1baf7a", "dark": "#199e70"},
        "discourse":    {"label": "Discourse & Dialogue", "light": "#2a78d6", "dark": "#3987e5"},
        "controversy":  {"label": "Controversy & Conflict", "light": "#e34948", "dark": "#e66767"},
        "love":         {"label": "Farewell & Love", "light": "#e87ba4", "dark": "#d55181"},
        "passion":      {"label": "Passion & Exaltation", "light": "#4a3aa7", "dark": "#9085e9"},
        "resurrection": {"label": "Resurrection & Restoration", "light": "#008300", "dark": "#008300"},
    },
    "districts": [],
    "iam": [],
}


def ward(row_id, short, ref, hoods, chiasmNote=None, override=None):
    r = ROWS[row_id]
    v0, v1 = parse_ref(ref)
    w = {
        "id": f"w{row_id}", "short": short, "ref": ref, "desc": r["desc"],
        "verses": r["verses"], "eng": r["eng"], "greek": r["greek"],
        "v0": v0, "v1": v1, "mid": (v0 + v1) / 2, "hoods": hoods,
    }
    if chiasmNote: w["chiasmNote"] = chiasmNote
    if override: w.update(override)
    return w


def district(row_id, short, ref, wards, desc=None, greek=None, extra=None):
    v0, v1 = parse_ref(ref)
    r = ROWS.get(row_id, {})
    d = {
        "id": f"d{row_id}" if row_id else f"dx{ref}", "short": short, "ref": ref,
        "desc": desc or r.get("desc", short), "greek": greek if greek is not None else r.get("greek"),
        "eng": r.get("eng"), "verses": r.get("verses"),
        "v0": v0, "v1": v1, "mid": (v0 + v1) / 2, "wards": wards,
    }
    if extra: d.update(extra)
    return d


# ============================== THE CITY ==============================
CITY["districts"] = [
    district(1, "Prologue Quarter", "1:1–51", [
        ward(2, "The Cosmic Poem", "1:1–18", [
            N(3, "Hymn to the Word", "1:1–18", "witness", details=POEM_BLOCKS),
        ]),
        ward(4, "Gate of Witness", "1:19–51", [
            N(5, "John on Himself", "1:19–28", "witness"),
            N(6, "John on Jesus", "1:29–34", "witness"),
            N(8, "First Invitation", "1:35–42", "witness", chiasm="A"),
            N(9, "Second Invitation", "1:43–51", "witness", chiasm="A′"),
        ]),
    ], desc="The grand western entrance: the cosmic hymn and the Baptist's twin obelisks of testimony."),

    district(10, "Book of Signs Metropolis", "2:1–12:50", [
        ward(11, "Cana–Samaria Plazas", "2:1–4:54", [
            N(12, "Wedding at Cana", "2:1–12", "sign"),
            N(13, "Temple Cleansing", "2:13–25", "controversy"),
            N(14, "Nicodemus Assembly", "3:1–21", "discourse", details=[D(15)]),
            N(16, "John's Affirmation", "3:22–36", "witness", details=[D(17)]),
            N(18, "Samaritan Well Forum", "4:1–42", "discourse"),
            N(19, "Honor in Galilee", "4:43–45", "witness"),
            N(20, "Official's Son Healed", "4:46–54", "sign"),
        ]),
        ward(21, "Controversy Marketplace", "5:1–6:71", [
            N(22, "Bethesda Pool", "5:1–20", "sign", details=[D(23)]),
            N(24, "The Honored Broker", "5:21–30", "discourse"),
            N(25, "Hall of Legitimation", "5:31–47", "discourse", details=[D(26), D(27)]),
            N(28, "Loaves & Fishes Field", "6:1–15", "sign"),
            N(29, "Sea Crossing", "6:16–23", "sign"),
            N(30, "Bread of Life Forum", "6:24–59", "discourse", details=[D(31), D(32)], landmark="iam-bread"),
            N(33, "Disloyalty Unmasked", "6:60–66", "controversy"),
            N(34, "The Twelve Respond", "6:67–71", "witness"),
        ]),
        ward(35, "Temple Citadel", "7:1–8:59", [
            N(36, "Brothers' Challenge", "7:1–9", "controversy"),
            N(37, "Divided Judgment", "7:10–14a", "controversy"),
            N(40, "Authority Challenged", "7:14b–18", "controversy"),
            N(41, "Moses Riposte", "7:19–28", "controversy"),
            N(44, "Arrest Attempts", "7:29–36", "controversy"),
            N(46, "Living Water Fountain", "7:37–39", "discourse", landmark="iam-water"),
            N(47, "Status Dispute", "7:40–52", "controversy"),
            N(48, "Light of the World", "8:12", "discourse", landmark="iam-light"),
            N(49, "Testimony Dispute", "8:13–19", "controversy"),
            N(51, "Riddle Counterchallenge", "8:21–30", "controversy", details=[D(52), D(53)]),
            N(54, "Abraham Controversy", "8:31–59", "controversy", landmark="iam-before"),
        ], chiasmNote="Structured by temple 'markers': Jesus enters (7:14b), proclaims at the feast's center (7:37–39: living water), and exits under stoning (8:59)."),
        ward(56, "Siloam & Sheepfold", "9:1–10:42", [
            N(57, "Blind Man's Court", "9:1–41", "sign",
              details=[D(58), D(59), D(60), D(61)]),
            N(62, "The Sheepfold", "10:1–18", "discourse", landmark="iam-shepherd"),
            N(66, "Hanukkah Challenge", "10:19–24", "controversy"),
            N(67, "Near-Stoning Riposte", "10:25–38", "controversy"),
            N(68, "Honor Notice", "10:39–42", "witness"),
        ]),
        ward(69, "Bethany Gardens", "11:1–12:11",
             override={"greek": 1070, "eng": 1319, "verses": 68,
                       "note": "Ward VII (11:1–54, 851 Greek words) extended here to include the anointing bridge passage 11:55–12:11 (219 gw)."},
             hoods=[
            N(70, "The Request", "11:1–6", "sign"),
            N(71, "Reluctant Journey", "11:7–16", "sign"),
            N(72, "Lazarus Raised", "11:17–44", "sign", landmark="iam-resurrection"),
            N(73, "The Death Plot", "11:45–54", "controversy"),
            N(74, "Anointing at Bethany", "11:55–12:11", "passion"),
        ]),
        ward(75, "Passover Approach", "12:12–50", [
            N(76, "Royal Entry Avenue", "12:12–19", "passion"),
            N(77, "Final Public Word", "12:20–36", "discourse"),
            N(78, "Unbelief Explained", "12:37–43", "controversy"),
            N(79, "Closing Proclamation", "12:44–50", "discourse"),
        ]),
    ], desc="The sprawling public metropolis of chapters 2–12: miracle plazas, marketplaces of dispute, and the elevated Temple Citadel — Jesus' public offer of light and life to Israel."),

    district(80, "Book of Glory District", "13:1–20:31", [
        ward(81, "Upper Room Enclave", "13:1–17:26", [
            N(82, "Footwashing Courtyard", "13:1–38", "love", chiasm="A"),
            N(83, "House of Reassurance", "14:1–31", "love", chiasm="B", landmark="iam-way"),
            N(84, "The Vine Trellis", "15:1–11", "love", chiasm="C", landmark="iam-vine"),
            N(86, "Love Commandment Court", "15:12–17", "love", chiasm="D",
              extra={"center": True}),
            N(87, "Insiders & Outsiders", "15:18–16:4a", "love", chiasm="C′"),
            NM("Departure Preparations", "16:4b–33", "love", greek=442, verses=30,
               desc="16:4b–33 Jesus Prepares His Friends for His Departure",
               chiasm="B′", note="Greek count from the 'bubble data' sheet (row absent from John Stats)."),
            N(88, "High Priestly Prayer", "17:1–26", "love", chiasm="A′"),
        ], chiasmNote="A radial chiasm plaza: A footwashing ↔ A′ prayer, B reassurance ↔ B′ departure, C solidarity ↔ C′ opposition, with D — the new commandment of love — as the central fountain."),
        ward(89, "Praetorium Fortress", "18:1–19:42", [
            N(90, "Garden of Arrest", "18:1–11", "passion", chiasm="A"),
            N(91, "High Priest's Hall", "18:12–27", "passion", chiasm="B"),
            N(92, "Pilate's Judgment Seat", "18:28–19:16a", "passion", chiasm="C",
              extra={"center": True}),
            N(93, "Golgotha Hill", "19:16b–37", "passion", chiasm="B′"),
            N(94, "Garden Tomb", "19:38–42", "passion", chiasm="A′"),
        ], chiasmNote="A second chiasm plaza: arrest garden ↔ burial garden, priest's hall ↔ the cross, with the trial before Pilate — 'the King of the Judeans' — at dead center."),
        ward(95, "Sunrise Gardens", "20:1–31", [
            N(96, "Empty Tomb & Upper Room", "20:1–31", "resurrection"),
        ]),
    ], desc="The walled historic district of chapters 13–20: private courtyards, the judicial fortress, and the sunrise gardens of resurrection."),

    district(97, "Harbor of Tiberias", "21:1–25", [
        ward(97, "The Waterfront", "21:1–23", [
            N(98, "Charcoal-Fire Beach", "21:1–14", "resurrection"),
            N(99, "Shepherd's Commission", "21:15–23", "resurrection",
              details=[D(100), D(101)]),
        ]),
        ward(102, "Scribes' Postscript", "21:24–25", [
            N(102, "Attestation Stone", "21:24–25", "witness"),
        ]),
    ], desc="The addendum port on the Sea of Tiberias, outside the old city wall — a third appearance, breakfast on the beach, and Peter restored.", extra={"outside": True}),
]

# The later insertion — an annex outside the wall
CITY["annex"] = {
    "id": "annex", "short": "The Mercy Annex", "ref": "7:53–8:11", "theme": "controversy",
    "desc": ROWS[103]["desc"], "verses": ROWS[103]["verses"], "eng": ROWS[103]["eng"],
    "greek": ROWS[103]["greek"], "v0": vidx(7, 53), "v1": vidx(8, 11),
    "mid": (vidx(7, 53) + vidx(8, 11)) / 2,
    "note": "The woman caught in adultery — a later insertion, mapped as a detached annex outside the city wall, adjoining the Temple Citadel.",
}

# --- The seven classic I AM statements + the absolute I AM ---
CITY["iam"] = [
    {"id": "iam-bread", "label": "I am the Bread of Life", "ref": "6:35", "v": vidx(6, 35)},
    {"id": "iam-water", "label": "Rivers of Living Water", "ref": "7:37–38", "v": vidx(7, 37), "minor": True},
    {"id": "iam-light", "label": "I am the Light of the World", "ref": "8:12", "v": vidx(8, 12)},
    {"id": "iam-before", "label": "Before Abraham was, I AM", "ref": "8:58", "v": vidx(8, 58), "minor": True},
    {"id": "iam-gate", "label": "I am the Gate for the Sheep", "ref": "10:7", "v": vidx(10, 7)},
    {"id": "iam-shepherd", "label": "I am the Good Shepherd", "ref": "10:11", "v": vidx(10, 11)},
    {"id": "iam-resurrection", "label": "I am the Resurrection and the Life", "ref": "11:25", "v": vidx(11, 25)},
    {"id": "iam-way", "label": "I am the Way, the Truth, and the Life", "ref": "14:6", "v": vidx(14, 6)},
    {"id": "iam-vine", "label": "I am the True Vine", "ref": "15:1", "v": vidx(15, 1)},
]

# Theme ways are not defined here: their extents come from PaulDz's issue-#2 lists via
# data/themes-source.md -> scripts/build_themes.py -> data/themes.json. The two sketch
# roads this block once defined are retired; conversations.md keeps them verbatim.

# --- consistency checks ---
problems = []
for d in CITY["districts"]:
    for w in d["wards"]:
        s = sum(h["greek"] or 0 for h in w["hoods"])
        if w["greek"] and abs(s - w["greek"]) > w["greek"] * 0.2:
            problems.append(f"ward {w['short']}: hood sum {s} vs sheet {w['greek']}")
for p in problems:
    print("NOTE:", p, file=sys.stderr)

with open("data/john-data.json", "w") as f:
    json.dump(CITY, f, ensure_ascii=False, indent=1)
n_h = sum(len(w["hoods"]) for d in CITY["districts"] for w in d["wards"])
print(f"Wrote data/john-data.json: {len(CITY['districts'])} districts, "
      f"{sum(len(d['wards']) for d in CITY['districts'])} wards, {n_h} neighborhoods, "
      f"{len(CITY['iam'])} I AM landmarks")
