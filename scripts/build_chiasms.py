#!/usr/bin/env python3
"""build_chiasms.py — parse data/chiasms-source.md into data/chiasms.json.

The source is PaulDz's transcription of the chiasm appendix of Malina &
Rohrbaugh, Social-Science Commentary on the Gospel of John (Fortress, 1998).
Nothing in the output is authored by hand: every string is a substring of the
source file, and every derived field (level, base, primes, centre, hood) is
reproducible from it.  Regenerate only when the .md changes; commit the output
(same convention as build_data.py).

Run:  python3 scripts/build_chiasms.py
"""

import hashlib
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "data" / "chiasms-source.md"
OUT = ROOT / "data" / "chiasms.json"
CITY = ROOT / "data" / "john-data.json"

# ── regexes ──────────────────────────────────────────────────────────────────
# The source subdivides a verse as far as f (8:44c–f, 7:18c–e, 10:18d–e) and
# occasionally adds a verse with "+" (4:7b+8).  The suffix class must cover all
# of it or a reference splits mid-token and the tail lands in the row's text.
REF = r"\d+:\d+[a-f]?(?:\+\d+[a-f]?)?(?:–(?:\d+:)?\d+[a-f]?)?"
REF_RE = re.compile(REF)
SEC_RE = re.compile(r"^([IVX]+)\.\s+(.{10,})$")
LETTER_HEAD_RE = re.compile(r"^([A-Z][′″ʺ‴]?)\s+(" + REF + r")\s+(.+)$")
PERI_HEAD_RE = re.compile(r"^(" + REF + r")\s+(.+)$")
RUNG_TAG_RE = re.compile(r"^([A-Ga-g])([′″ʺ‴])?(\d)?([′″ʺ‴])?$")
NUM_RE = re.compile(r"^([1-9])\s+(.+)$")
ROMAN_ROW_RE = re.compile(r"^([IVX]+)\s+(.+)$")
LABEL_RE = re.compile(
    r"^(Transition summary|Transition|Introduction|Addendum|Conclusion|Epilogue"
    r"|Comment|Episode [IVX]+|Theme \d+|Theme:|Theme"
    r"|(?:Opening |Central |Closing )?Marker [IVX]+|Later Insertion)\b(.*)$"
)
PRIMES = {"′": 1, "″": 2, "ʺ": 2, "‴": 3}
ROMAN_VAL = {"I": 1, "V": 5, "X": 10}

DIAG = []  # build-time report lines


def roman_to_int(s):
    total = 0
    for i, c in enumerate(s):
        v = ROMAN_VAL[c]
        total += -v if i + 1 < len(s) and ROMAN_VAL[s[i + 1]] > v else v
    return total


# ── verse arithmetic ─────────────────────────────────────────────────────────
city = json.loads(CITY.read_text(encoding="utf-8"))
OFFSETS = {int(k): v for k, v in city["chapterOffsets"].items()}


VERSE_RE = re.compile(r"(\d+)([a-f]?)$")


def _verse(v):
    """'17c' -> (17, 'c'). The suffix is the source's sub-verse letter."""
    m = VERSE_RE.fullmatch(v)
    return int(m.group(1)), m.group(2)


def ref_span(ref):
    """(startHalf, endHalf, v0, v1) with a/b halves: a = +0.0..+0.4, b = +0.5..+0.9.
    Sub-verse letters past b (c–f) sit in the back half like b — the city's join
    only ever needs to know which side of a shared boundary verse a ref falls on."""
    m = re.fullmatch(REF, ref)
    if not m:
        return None
    a, dash, b = ref.partition("–")
    a, plus, cont = a.partition("+")   # "4:7b+8": the +N is where the ref ends
    ch, _, v = a.partition(":")
    ch = int(ch)
    vs, suf = _verse(v)
    s = OFFSETS[ch] + vs + (0.0 if suf in ("", "a") else 0.5)
    v0 = OFFSETS[ch] + vs
    if dash or plus:
        tail = b if dash else cont
        if ":" in tail:
            ch2, _, v2 = tail.partition(":")
            ch2 = int(ch2)
        else:
            ch2, v2 = ch, tail
        v2s, suf2 = _verse(v2)
        e = OFFSETS[ch2] + v2s + (0.4 if suf2 == "a" else 0.9)
        v1 = OFFSETS[ch2] + v2s
    else:
        e = v0 + (0.4 if suf == "a" else 0.9)
        v1 = v0
    return (s, e, v0, v1)


# hoods (annex is matched only by id, never by verse arithmetic — rule 1)
HOODS = []  # (id, ref, span)
for dist in city["districts"]:
    for w in dist["wards"]:
        for h in w["hoods"]:
            HOODS.append((h["id"], h["ref"], ref_span(h["ref"])))
HOOD_BY_REF = {ref: hid for hid, ref, _ in HOODS}
HOOD_ORDER = [hid for hid, _, _ in HOODS] + [city["annex"]["id"]]


NEAREST = []  # refs resolved by the step-4 nearest-hood fallback (tripwire)
ARCS = []     # refs resolved to a multi-hood arc (tripwire)


def resolve_hood(ref):
    """→ (hood, hoodSpan, how) — the four-step join rule (integer verse
    arithmetic; a/b suffixes are deliberately ignored, they only ever split a
    verse both neighbours already share):
      1. exact string match of ref against a hood ref
      2. containment on v0/v1 — narrowest container wins, ties to lower v0;
         when several candidates share a boundary verse that an a/b suffix
         splits (7:14a|b, 16:4a|b, 19:16a|b), the suffix decides first —
         "7:14b" lives in n40 (7:14b–18), not n37 (7:10–14a)
      3. arc: hoodSpan = every hood fully contained in the span (the annex is
         never in HOODS, so invariant 4 keeps 7:53–8:11 out of arcs)
      4. nearest hood by verse distance, ties to the lower v1
    Steps 3 and 4 are tripwired: the build fails if their lists drift from
    exactly ["7:14b–8:59"] and ["8:20"]."""
    if ref is None:
        return None, None, None
    if ref in HOOD_BY_REF:
        return HOOD_BY_REF[ref], None, "exact"
    span = ref_span(ref)
    if span is None:
        return None, None, None
    v0, v1 = span[2], span[3]
    inside = [hs for _, _, hs in HOODS if hs[2] <= v0 and v1 <= hs[3]]
    if len(inside) > 1:  # boundary half-verse: let the a/b suffix decide first
        s, e = span[0], span[1]
        halves = [hs for hs in inside if hs[0] <= s and e <= hs[1]]
        if halves:
            inside = halves
    if inside:
        best = min(inside, key=lambda hs: (hs[3] - hs[2], hs[2]))
        hid = next(hid for hid, _, hs in HOODS if hs is best)
        return hid, None, "contain"
    contained = [hid for hid, _, hs in HOODS if v0 <= hs[2] and hs[3] <= v1]
    if len(contained) >= 2:
        ARCS.append(ref)
        return None, contained, "arc"
    near = min(HOODS, key=lambda t: (max(t[2][2] - v1, v0 - t[2][3], 0), t[2][3]))
    NEAREST.append(ref)
    return near[0], None, "nearest"


# ── read source ──────────────────────────────────────────────────────────────
raw = SRC.read_text(encoding="utf-8")
lines = raw.split("\n")  # lines[i] is source line i+1


def parse_label(s, lineno):
    m = LABEL_RE.match(s)
    kw = m.group(1)
    kind, n = kw, None
    m2 = re.match(r"^(.*?)\s+([IVX]+|\d+)$", kw)
    if m2:
        kind, tok = m2.group(1), m2.group(2)
        n = int(tok) if tok.isdigit() else roman_to_int(tok)
    mref = None if kind == "Later Insertion" else REF_RE.search(s)
    return {
        "line": lineno,
        "kind": kind,
        "n": n,
        "text": s,
        "ref": mref.group(0) if mref else None,
    }


def take_ref(s):
    """Split a leading verse reference off a row's text. → (ref|None, rest)."""
    m = REF_RE.match(s)
    if m:
        return m.group(0), s[m.end():].lstrip()
    return None, s


# ── pass 1: sections, headings, raw units ────────────────────────────────────
sections = []
heads = []  # shared dicts, embedded into units
units_raw = []
cur_section = None
cur_head = None
cur_label = None
cur_unit = None


def close_unit():
    global cur_unit
    if cur_unit is not None and (cur_unit["rows"] or cur_unit["label"]):
        units_raw.append(cur_unit)
    cur_unit = None


def open_unit(label=None):
    global cur_unit
    cur_unit = {
        "section": cur_section["id"] if cur_section else None,
        "head": cur_head,
        "label": label,
        "rows": [],
    }


for lineno in range(8, 993):
    line = lines[lineno - 1]
    s = line.strip()
    if not s:
        close_unit()
        cur_label = None
        continue
    indent = len(line) - len(line.lstrip())

    if indent == 0:
        m = SEC_RE.match(s)
        if m:
            close_unit()
            title = m.group(2)
            ref = None
            mref = re.search(r"\((" + REF + r")\)\s*$", title)
            if mref:
                ref = mref.group(1)
                title = title[: mref.start()].rstrip()
            cur_section = {
                "id": "s%d" % (len(sections) + 1),
                "roman": m.group(1),
                "line": lineno,
                "title": title,
                "ref": ref,
                "chiasm": None,
            }
            sections.append(cur_section)
            cur_head = None
            cur_label = None
            continue
        m = LETTER_HEAD_RE.match(s)
        if m:
            close_unit()
            cur_head = {
                "line": lineno,
                "ref": m.group(2),
                "title": m.group(3),
                "sectionTag": m.group(1),
                "group": None,
            }
            heads.append(cur_head)
            cur_label = None
            continue
        m = PERI_HEAD_RE.match(s)
        if m:
            close_unit()
            cur_head = {
                "line": lineno,
                "ref": m.group(1),
                "title": m.group(2),
                "sectionTag": None,
                "group": None,
            }
            heads.append(cur_head)
            cur_label = None
            continue

    # body rows / labels (any indent), in spec order
    row = None
    parts = s.split(None, 1)
    if len(parts) == 2 and RUNG_TAG_RE.fullmatch(parts[0]):
        m = RUNG_TAG_RE.fullmatch(parts[0])
        ref, text = take_ref(parts[1])
        row = {
            "type": "rung",
            "tag": parts[0],
            "letter": m.group(1),
            "prime1": m.group(2),
            "digit": m.group(3),
            "prime2": m.group(4),
            "ref": ref,
            "text": text,
        }
    elif NUM_RE.match(s):
        m = NUM_RE.match(s)
        ref, text = take_ref(m.group(2))
        row = {"type": "num", "tag": m.group(1), "ref": ref, "text": text}
    elif ROMAN_ROW_RE.match(s) and re.fullmatch(r"[IVX]+", s.split(None, 1)[0]):
        m = ROMAN_ROW_RE.match(s)
        ref, text = take_ref(m.group(2))
        row = {"type": "roman", "tag": m.group(1), "ref": ref, "text": text}
    elif LABEL_RE.match(s):
        close_unit()
        cur_label = parse_label(s, lineno)
        open_unit(cur_label)
        continue
    elif s.startswith("Themes of "):
        row = {"type": "subtitle", "tag": None, "ref": None, "text": s}
    else:
        ref, text = take_ref(s)
        row = {"type": "text", "tag": None, "ref": ref, "text": text}

    row["line"] = lineno
    row["indent"] = indent
    if cur_unit is None:
        open_unit(None)
    cur_unit["rows"].append(row)

close_unit()

# ── heading groups (rule 6: container pericopes must survive) ────────────────
for i, h in enumerate(heads):
    hs = ref_span(h["ref"])
    for g in reversed(heads[:i]):
        gs = ref_span(g["ref"])
        if gs[0] <= hs[0] and hs[1] <= gs[1] and gs[:2] != hs[:2]:
            h["group"] = {"line": g["line"], "ref": g["ref"], "title": g["title"]}
            break

# ── centre derivation ────────────────────────────────────────────────────────


def derive_centre(idxs, rows, unit_rows_between=True):
    """idxs: indices (into rows) of one chiasm's rungs, in order.
    Returns {kind, rows, pair, enclosed} with values as indices into rows."""
    rungs = [rows[i] for i in idxs]
    bases = {}
    order = []
    for j, r in enumerate(rungs):
        b = r["base"]
        if b not in bases:
            bases[b] = []
            order.append(b)
        bases[b].append(j)
    spans = {b: (m[0], m[-1]) for b, m in bases.items() if len(m) >= 2}
    enc = [sum(1 for a, z in spans.values() if a < j < z) for j in range(len(rungs))]
    mx = max(enc) if enc else 0

    if mx == 0:
        best = None
        for b in order:
            m = bases[b]
            if len(m) == 2 and m[1] == m[0] + 1:
                lo, hi = idxs[m[0]], idxs[m[1]]
                if unit_rows_between:
                    between = list(range(lo + 1, hi))
                else:
                    between = []
                if between:
                    best = (lo, hi, between)  # LAST qualifying pair wins
        if best:
            return {"kind": "enclosed", "rows": [], "pair": [best[0], best[1]],
                    "enclosed": best[2]}
        return {"kind": "none", "rows": [], "pair": None, "enclosed": []}

    cands = [j for j in range(len(rungs)) if enc[j] == mx]
    # R1
    if len(cands) == 1:
        j = cands[0]
        kind = "unpaired" if len(bases[rungs[j]["base"]]) == 1 else "pivot-single"
        return {"kind": kind, "rows": [idxs[j]], "pair": None, "enclosed": []}
    # R2
    solo = [j for j in cands if len(bases[rungs[j]["base"]]) == 1]
    if len(solo) == 1:
        return {"kind": "unpaired", "rows": [idxs[solo[0]]], "pair": None,
                "enclosed": []}
    # R3
    cbases = []
    for j in cands:
        b = rungs[j]["base"]
        if b not in cbases:
            cbases.append(b)
    if len(cbases) == 1:
        mem = bases[cbases[0]]
        kind = "pivot" if len(mem) == 2 else "pivot-group"
        return {"kind": kind, "rows": [idxs[m] for m in mem], "pair": None,
                "enclosed": []}
    # R4
    r4 = [b for b in order
          if len(bases[b]) == 2 and bases[b][1] == bases[b][0] + 1
          and all(m in cands for m in bases[b])]
    if r4:
        if len(r4) > 1:
            DIAG.append("R4 tie between bases %s at rung line %d — took last (%s)"
                        % (r4, rungs[0]["line"], r4[-1]))
        mem = bases[r4[-1]]
        return {"kind": "pivot", "rows": [idxs[m] for m in mem], "pair": None,
                "enclosed": []}
    # R5
    return {"kind": "band", "rows": [idxs[j] for j in cands], "pair": None,
            "enclosed": []}


SPLITS = []


def split_segments(idxs, rows):
    """Split one label's level-0 ladder into chiasms (fires once: Theme 5)."""
    rungs = [rows[i] for i in idxs]
    n = len(rungs)
    bases = {}
    for j, r in enumerate(rungs):
        bases.setdefault(r["base"], []).append(j)
    spans = [(m[0], m[-1]) for m in bases.values() if len(m) >= 2]

    def depth(seg):
        bs = {}
        for k, j in enumerate(seg):
            bs.setdefault(rungs[j]["base"], []).append(k)
        sp = {b: (m[0], m[-1]) for b, m in bs.items() if len(m) >= 2}
        return max((sum(1 for a, z in sp.values() if a < k < z)
                    for k in range(len(seg))), default=0)

    segs = []
    start = 0
    for k in range(1, n):
        if any(a < k <= z for a, z in spans):
            continue  # a base is open across k
        seg = list(range(start, k))
        rem = list(range(k, n))
        if (depth(seg) >= 2
                and not ({rungs[j]["base"][0] for j in seg}
                         & {rungs[j]["base"][0] for j in rem})
                and len(rem) >= 2):
            segs.append(seg)
            SPLITS.append("split at rung line %d" % rungs[k]["line"])
            start = k
    segs.append(list(range(start, n)))
    return [[idxs[j] for j in seg] for seg in segs]


# ── pass 2: build units ──────────────────────────────────────────────────────
BARE_DIGIT_REPORT = []
units = []

for uidx, ru in enumerate(units_raw):
    uid = "u%03d" % (uidx + 1)
    rows = ru["rows"]
    label = ru["label"]
    head = ru["head"]

    # note extraction (only unit with roman rows: 7:14b–8:59 marker table).
    # The prose stays in place as a text row — no row is ever dropped — and is
    # additionally surfaced verbatim as unit.note.
    note = None
    if any(r["type"] == "roman" for r in rows):
        for t in rows:
            if t["type"] != "text":
                break
            note = t["text"] if note is None else note + " " + t["text"]

    # kind
    if label and label["kind"] == "Later Insertion":
        kind = "note"
    elif any(r["type"] == "roman" for r in rows):
        kind = "markerTable"
    elif any(r["type"] == "rung" for r in rows):
        kind = "chiasm"
    else:
        kind = "forecourt"

    # rule 9: letter+digit ambiguity resolved per unit
    prime_before_digit = any(r["type"] == "rung" and r["prime1"] and r["digit"]
                             for r in rows)
    has_upper = any(r["type"] == "rung" and r["letter"].isupper() for r in rows)

    prev_row = None
    prev_letter_level = None
    for i, r in enumerate(rows):
        r["i"] = i
        if r["type"] == "rung":
            if r["digit"] is None:
                r["base"], r["sub"] = r["letter"], None
            elif prime_before_digit:
                r["base"], r["sub"] = r["letter"], int(r["digit"])
            else:
                r["base"], r["sub"] = r["letter"] + r["digit"], None
            if r["digit"] and not r["prime1"] and not r["prime2"]:
                BARE_DIGIT_REPORT.append(
                    "line %d tag %s → base %s%s" % (
                        r["line"], r["tag"], r["base"],
                        " sub %d" % r["sub"] if r["sub"] else ""))
            r["primes"] = PRIMES.get(r["prime1"] or r["prime2"] or "", 0)
            r["level"] = 0 if r["letter"].isupper() else (1 if has_upper else 0)
            prev_letter_level = r["level"]
        elif r["type"] == "num":
            r["level"] = (prev_letter_level + 1) if prev_letter_level is not None else 1
        elif r["type"] in ("roman", "subtitle"):
            r["level"] = 0
        else:  # text
            if prev_row is None:
                r["level"] = 0
            else:
                r["level"] = prev_row["level"] + (
                    1 if r["indent"] > prev_row["indent"] else 0)
        prev_row = r

    # references and hood
    ref = None
    if kind != "note":
        ref = (label["ref"] if label and label["ref"] else None) or \
              (head["ref"] if head else None)
    span = ref_span(ref) if ref else None
    v0, v1 = (span[2], span[3]) if span else (None, None)
    if kind == "note":
        hood, hood_span, hood_by = city["annex"]["id"], None, "annex-id"
    else:
        hood, hood_span, hood_by = resolve_hood(ref)
    if hood_span:
        hood_span = sorted(hood_span, key=HOOD_ORDER.index)

    # chiasms
    chiasms = []
    if kind == "chiasm":
        level0 = [r["i"] for r in rows if r["type"] == "rung" and r["level"] == 0]
        if level0:
            for seg in split_segments(level0, rows):
                chiasms.append({
                    "id": "%sc%d" % (uid, len(chiasms) + 1),
                    "parentRow": None,
                    "rows": seg,
                    "pattern": " ".join(rows[i]["tag"] for i in seg),
                    "centre": derive_centre(seg, rows),
                })
        # nested lowercase groups (rule 11): adjacent runs of level-1 rungs
        run = []
        last_level0 = None

        def flush_run():
            if len(run) >= 2 and last_level0 is not None:
                chiasms.append({
                    "id": "%sc%d" % (uid, len(chiasms) + 1),
                    "parentRow": last_level0,
                    "rows": list(run),
                    "pattern": " ".join(rows[i]["tag"] for i in run),
                    "centre": derive_centre(list(run), rows),
                })

        prev_i = None
        for r in rows:
            if r["type"] == "rung" and r["level"] == 1:
                if run and r["i"] != prev_i + 1:
                    flush_run()
                    run = []
                run.append(r["i"])
                prev_i = r["i"]
            else:
                if run:
                    flush_run()
                    run = []
                if r["type"] == "rung" and r["level"] == 0:
                    last_level0 = r["i"]
        if run:
            flush_run()

    out_rows = []
    for r in rows:
        o = {"i": r["i"], "line": r["line"], "indent": r["indent"],
             "type": r["type"], "tag": r.get("tag"),
             "base": r.get("base"), "primes": r.get("primes"),
             "sub": r.get("sub"), "level": r["level"],
             "ref": r.get("ref"), "text": r["text"]}
        out_rows.append(o)

    first_line = rows[0]["line"] if rows else label["line"]
    units.append({
        "id": uid,
        "kind": kind,
        "line": first_line,
        "section": ru["section"],
        "head": head,
        "label": ({"line": label["line"], "kind": label["kind"], "n": label["n"],
                   "text": label["text"], "ref": label["ref"]} if label else None),
        "ref": ref,
        "v0": v0, "v1": v1,
        "hood": hood,
        "hoodBy": hood_by,
        "hoodSpan": hood_span,
        "bracketWith": None,
        "note": note,
        "rows": out_rows,
        "chiasms": chiasms,
    })

# ── bracketWith (rule 18) ────────────────────────────────────────────────────
brackets = [u for u in units
            if u["label"] and "forms bracket with" in u["label"]["text"]]
assert len(brackets) == 2, "expected exactly 2 'forms bracket with' units"
brackets[0]["bracketWith"] = brackets[1]["id"]
brackets[1]["bracketWith"] = brackets[0]["id"]

# ── section chiasms (IX and X) ───────────────────────────────────────────────
for si, sec in enumerate(sections):
    nxt = sections[si + 1]["line"] if si + 1 < len(sections) else 993
    tagged = [h for h in heads
              if h["sectionTag"] and sec["line"] < h["line"] < nxt]
    if not tagged:
        continue
    rungs = []
    pseudo = []
    for h in tagged:
        hood, _, _ = resolve_hood(h["ref"])
        unit = next((u["id"] for u in units
                     if u["head"] and u["head"]["line"] == h["line"]), None)
        rungs.append({"tag": h["sectionTag"], "line": h["line"], "ref": h["ref"],
                      "hood": hood, "unit": unit, "text": h["title"]})
        pseudo.append({"base": h["sectionTag"].rstrip("′″ʺ‴"),
                       "line": h["line"], "tag": h["sectionTag"]})
    centre = derive_centre(list(range(len(pseudo))), pseudo,
                           unit_rows_between=False)
    sec["chiasm"] = {
        "id": sec["id"] + "c",
        "pattern": " ".join(r["tag"] for r in rungs),
        "rungs": rungs,
        "centre": {"kind": centre["kind"], "rungs": centre["rows"]},
    }

# ── index ────────────────────────────────────────────────────────────────────
by_hood = {hid: {"units": [], "arcs": []} for hid in HOOD_ORDER}
for u in units:
    if u["hood"]:
        by_hood[u["hood"]]["units"].append(u["id"])
    if u["hoodSpan"]:
        for hid in u["hoodSpan"]:
            by_hood[hid]["arcs"].append(u["id"])
for sec in sections:
    if sec["chiasm"]:
        centre_idx = set(sec["chiasm"]["centre"]["rungs"])
        for i, r in enumerate(sec["chiasm"]["rungs"]):
            if r["hood"]:
                by_hood[r["hood"]]["sectionRung"] = {
                    "section": sec["id"], "tag": r["tag"],
                    "isCentre": i in centre_idx}
by_unit = {u["id"]: {"hood": u["hood"],
                     "chiasms": [c["id"] for c in u["chiasms"]]}
           for u in units}

# ── tripwires ────────────────────────────────────────────────────────────────
# These four facts were measured against john-data.json and chiasms-source.md;
# if an edit to either file breaks one, the build must fail loudly rather than
# silently orphan chiasms.


def die(msg):
    print("TRIPWIRE FAILURE: " + msg, file=sys.stderr)
    sys.exit(1)


orphans = [(u["id"], u["ref"], u["line"]) for u in units
           if u["hood"] is None and u["hoodSpan"] is None]
if orphans:
    die("units landing on no hood, no arc and no fallback: %s" % orphans)
if ARCS != ["7:14b–8:59"]:
    die("arc list is %s, expected exactly ['7:14b–8:59']" % ARCS)
if NEAREST != ["8:20"]:
    die("nearest-hood fallback list is %s, expected exactly ['8:20']" % NEAREST)
covered = set()
for _, _, hs in HOODS:
    covered |= set(range(hs[2], hs[3] + 1))
ax = city["annex"]
covered |= set(range(ax["v0"], ax["v1"] + 1))
gaps = set(range(1, city["totalVerses"] + 1)) - covered
if gaps != {357}:
    die("hood-coverage gap set is %s, expected exactly {357} (= 8:20)" % gaps)

# ── meta ─────────────────────────────────────────────────────────────────────
top_chiasms = sum(1 for u in units for c in u["chiasms"] if c["parentRow"] is None)
sub_chiasms = sum(1 for u in units for c in u["chiasms"] if c["parentRow"] is not None)
total_rows = sum(len(u["rows"]) for u in units)

meta = {
    "citation": lines[996],
    "sourceFile": "data/chiasms-source.md",
    "sourceLines": raw.count("\n"),
    "sourceSha256": hashlib.sha256(raw.encode("utf-8")).hexdigest(),
    "transcribedBy": "PaulDz",
    "generator": "scripts/build_chiasms.py",
    "preamble": {"lines": [1, 5], "text": "\n".join(lines[0:5])},
    "counts": {"units": len(units), "chiasms": top_chiasms,
               "subChiasms": sub_chiasms, "rows": total_rows,
               "sections": len(sections)},
}

doc = {"meta": meta, "sections": sections, "units": units,
       "index": {"byHood": by_hood, "byUnit": by_unit}}

with open(OUT, "w", encoding="utf-8") as f:
    json.dump(doc, f, ensure_ascii=False, indent=1)
    f.write("\n")

# ── build-time report ────────────────────────────────────────────────────────
kinds = {}
for u in units:
    kinds[u["kind"]] = kinds.get(u["kind"], 0) + 1
centres = {}
for u in units:
    for c in u["chiasms"]:
        if c["parentRow"] is None:
            centres[c["centre"]["kind"]] = centres.get(c["centre"]["kind"], 0) + 1
print("chiasms.json written: %d units %s" % (len(units), kinds))
print("top-level chiasms: %d  sub-chiasms: %d  rows: %d  sections: %d"
      % (top_chiasms, sub_chiasms, total_rows, len(sections)))
print("centre kinds (top-level): %s" % centres)
print("splits fired: %d  (%s)" % (len(SPLITS), "; ".join(SPLITS)))
print("bare letter+digit tags (rule 9 report, expect 5):")
for b in BARE_DIGIT_REPORT:
    print("  " + b)
for d in DIAG:
    print("NOTE: " + d)
nohood = [(u["id"], u["ref"], u["line"]) for u in units
          if u["hood"] is None and u["hoodSpan"] is None]
print("units with no hood: %s" % nohood)
nones = [(u["id"], u["ref"], c["id"]) for u in units for c in u["chiasms"]
         if c["parentRow"] is None and c["centre"]["kind"] == "none"]
print("top-level chiasms with no derivable centre (source marks none): %s" % nones)
