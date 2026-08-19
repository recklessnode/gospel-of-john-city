"""Per-verse Greek-word weights for the Gospel of John.

The spreadsheet gives Greek word counts per pericope (block), and for nine blocks it
also gives counts for named sub-units. To weigh a *theme* — an arbitrary set of verses —
we need a per-verse number, so each unit's count is spread evenly across the verses it
covers, using the finest unit available. That is an apportionment, not a measurement:
callers must label totals derived from it as estimates.
"""
import json, re, os

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "..", "data", "john-data.json")
DASH = re.compile(r"[–—-]")


def load():
    with open(DATA, encoding="utf-8") as f:
        return json.load(f)


def hoods(J):
    return [h for d in J["districts"] for w in d["wards"] for h in w["hoods"]]


def abs_index(J, ch, v):
    return J["chapterOffsets"][str(ch)] + v


def chapter_verse(J, i):
    """Inverse of abs_index: absolute verse index -> (chapter, verse)."""
    off = J["chapterOffsets"]
    for ch in range(21, 0, -1):
        if i > off[str(ch)]:
            return ch, i - off[str(ch)]
    raise ValueError(i)


def detail_range(J, desc, ch_hint):
    """'1:9–11 Light in Israel' -> (9, 11) as absolute indices in chapter ch_hint."""
    m = re.match(r"\s*(\d+):(\d+)(?:\s*[–—-]\s*(?:(\d+):)?(\d+))?", desc)
    if not m:
        return None
    ch = int(m.group(1)); v0 = int(m.group(2))
    ch2 = int(m.group(3)) if m.group(3) else ch
    v1 = int(m.group(4)) if m.group(4) else v0
    return abs_index(J, ch, v0), abs_index(J, ch2, v1)


def weights(J):
    """dict: absolute verse index -> estimated Greek word count."""
    w = {}
    for h in hoods(J):
        units = []
        if h.get("details"):
            ch = chapter_verse(J, h["v0"])[0]
            for d in h["details"]:
                rng = detail_range(J, d["desc"], ch)
                if rng and h["v0"] <= rng[0] <= rng[1] <= h["v1"]:
                    units.append((rng[0], rng[1], d["greek"]))
            covered = sum(b - a + 1 for a, b, _ in units)
            got = sum(g for _, _, g in units)
            # sub-units must tile the block exactly, or we fall back to the block
            if covered != h["v1"] - h["v0"] + 1 or got != h["greek"]:
                units = []
        if not units:
            units = [(h["v0"], h["v1"], h["greek"])]
        for a, b, g in units:
            n = b - a + 1
            for i in range(a, b + 1):
                # += not =: three blocks split a verse between them (7:14a/b, 16:4a/b,
                # 19:16a/b), so a shared verse's words are the sum of both halves.
                w[i] = w.get(i, 0) + g / n
    return w


if __name__ == "__main__":
    J = load()
    w = weights(J)
    H = hoods(J)
    print("verses with a weight:", len(w), "of", J["totalVerses"])
    print("sum of weights: %.1f  (blocks total %d)" % (sum(w.values()), sum(h["greek"] for h in H)))
    missing = [i for i in range(1, J["totalVerses"] + 1) if i not in w]
    print("verses in no block:", len(missing),
          [f"{c}:{v}" for c, v in (chapter_verse(J, i) for i in missing)])
    fine = sum(1 for h in H if h.get("details"))
    print("blocks with sub-unit detail:", fine)
    for ref in ["1:1", "1:13", "1:14", "3:16", "11:35", "21:25"]:
        c, v = map(int, ref.split(":"))
        print("  %-6s %.1f" % (ref, w.get(abs_index(J, c, v), 0)))
