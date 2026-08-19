"""Merge the parsed theme sections, measure each theme against the text, and emit
data/themes.json — the input the city uses to draw theme ways.

"Measure" means: how much of the Gospel of John does this theme occupy? Two numbers,
because they disagree in interesting ways — verse count (how many verses it touches)
and Greek word count (how much *text* those verses actually are). PaulDz's rule is
"the more text it takes to describe a theme, the larger the way", so the Greek count
is the ranking key and the verse count is reported alongside it.

Greek counts per verse are apportioned from per-block totals (see verse_weights.py),
so every theme total here is an ESTIMATE and is labelled as one downstream.
"""
import json, os, sys, glob

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from verse_weights import load, hoods, abs_index, weights, chapter_verse  # noqa: E402

OUT = os.path.join(HERE, "..", "data", "themes.json")
WAYS = os.path.join(HERE, "..", "data", "way-types.json")
CHAPTER_TOTALS = {1: 51, 2: 25, 3: 36, 4: 54, 5: 47, 6: 71, 7: 53, 8: 59, 9: 41, 10: 42,
                  11: 57, 12: 50, 13: 38, 14: 31, 15: 27, 16: 33, 17: 26, 18: 40,
                  19: 42, 20: 31, 21: 25}


def expand(ref):
    """'6:35' or '6:35-41' -> list of (chapter, verse)."""
    ch, vv = ref.split(":")
    ch = int(ch)
    if "-" in vv:
        a, b = (int(x) for x in vv.split("-"))
    else:
        a = b = int(vv)
    if ch not in CHAPTER_TOTALS or a > b or b > CHAPTER_TOTALS[ch] or a < 1:
        raise ValueError("bad ref " + ref)
    return [(ch, v) for v in range(a, b + 1)]


def main(paths):
    J = load()
    W = weights(J)
    H = hoods(J)
    themes = []
    seen = set()
    for p in sorted(paths):
        for t in json.load(open(p, encoding="utf-8")):
            if t["key"] in seen:
                raise SystemExit("duplicate theme key: " + t["key"])
            seen.add(t["key"])
            themes.append(t)

    by_key = {t["key"]: t for t in themes}
    # an umbrella theme's extent is the union of its children's
    for t in themes:
        if t.get("parent"):
            by_key[t["parent"]].setdefault("_child_refs", []).extend(t["refs"])

    orphans = []
    for t in themes:
        refs = t["refs"] + t.pop("_child_refs", []) if not t.get("parent") else t["refs"]
        verses, bad = set(), []
        for r in refs:
            try:
                verses.update(expand(r))
            except ValueError as e:
                bad.append(str(e))
        idx = {abs_index(J, c, v) for c, v in verses}
        # keep the city's own block order — ids are not all numeric (e.g. m16_4b-33)
        blocks = [h["id"] for h in H if any(h["v0"] <= i <= h["v1"] for i in idx)]
        missing = sorted(i for i in idx if i not in W)
        if missing:
            orphans.append((t["key"], [f"{c}:{v}" for c, v in map(lambda i: chapter_verse(J, i), missing)]))
        t["verses"] = len(verses)
        t["greek"] = round(sum(W.get(i, 0) for i in idx))
        t["blocks"] = blocks
        t["chapters"] = sorted({c for c, _ in verses})
        t["malformed"] = bad
        t["refs"] = refs

    # way type is DERIVED from verse count, never hand-tagged: change a threshold in
    # data/way-types.json and the whole city re-bands. Sub-entries get no way of their
    # own — their verses are already inside their parent's, so drawing both would
    # measure the same text twice.
    ways = json.load(open(WAYS, encoding="utf-8"))["types"]
    for t in themes:
        if t.get("parent"):
            continue
        t["way"] = next(w["key"] for w in ways if t["verses"] >= w["minVerses"])

    themes.sort(key=lambda t: -t["greek"])
    doc = {
        "source": "data/themes-source.md",
        "wayTypes": "data/way-types.json",
        "note": ("Greek word counts are apportioned from per-block totals in john-data.json "
                 "and are estimates; verse counts are exact."),
        "themes": themes,
    }
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False, indent=1)

    top = [t for t in themes if not t.get("parent")]
    print(f"{len(themes)} themes ({len(top)} top-level, {len(themes)-len(top)} sub-entries)")
    for w in ways:
        band = [t for t in top if t["way"] == w["key"]]
        print(f"\n{w['label'].upper()} — {w['gloss']} ({len(band)})")
        for t in band:
            print(f"  {t['greek']:>6} {t['verses']:>4}v {len(t['blocks']):>3}b  {t['label'][:58]}")
    bad = [(t['key'], t['malformed']) for t in themes if t['malformed']]
    if bad:
        print("\nMALFORMED REFS:", bad)
    if orphans:
        print("\nREFS WITH NO BLOCK ON THE MAP (pericope adulterae etc.):")
        for k, vs in orphans:
            print("  ", k, vs)


if __name__ == "__main__":
    main(sys.argv[1:] or glob.glob("/tmp/claude-1000/-home-ronald/71832c1a-77e5-436e-9e91-49721d2aecf0/scratchpad/themes-?.json"))
