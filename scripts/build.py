#!/usr/bin/env python3
"""Assemble the self-contained pages from templates + data/john-data.json.

  index.html        index.template.html  + scripts/app.js
  city3d.html       city3d.template.html + scripts/app3d.js          (canvas renderer)
  city3d-three.html city3d.template.html + build/city3d-three.bundle.js (Three.js)

The Three.js page needs `npm run bundle` first; if the bundle is missing it is
skipped with a warning so the pure-python build still works.
"""
import datetime
import json
import os
import subprocess

ALT_2D = '<a href="index.html">2D map ↩</a>'


def build_stamp():
    """A visible marker of which commit a page was built from, so a refresh can be
    told apart from a stale cache. The hash is HEAD at build time — the built HTML
    is committed after, so it names the source state, not the commit holding it."""
    def git(*args):
        try:
            return subprocess.run(["git", *args], capture_output=True, text=True,
                                  check=True).stdout.strip()
        except Exception:
            return ""
    sha = git("rev-parse", "--short", "HEAD")
    built = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M")
    label = f"build {built}Z" + (f" · {sha}" if sha else "")
    if not sha:
        return f'<span class="build">{label}</span>'
    url = f"https://github.com/recklessnode/gospel-of-john-city/commit/{sha}"
    return (f'<a class="build" href="{url}" target="_blank" rel="noopener" '
            f'title="the commit this page was built from">{label}</a>')


STAMP = build_stamp()


def assemble(template, app, data, out, subtitle, alt_link):
    html = template.replace("/*__DATA__*/;", json.dumps(data, ensure_ascii=False) + ";")
    html = html.replace("/*__APP__*/", app)
    html = html.replace("<!--__SUBTITLE__-->", subtitle)
    html = html.replace("<!--__ALT__-->", alt_link)
    html = html.replace("<!--__BUILD__-->", STAMP)
    with open(out, "w") as f:
        f.write(html)
    print(f"{out} written ({len(html):,} bytes)")


with open("data/john-data.json") as f:
    data = json.load(f)

with open("index.template.html") as f:
    tpl2d = f.read()
with open("scripts/app.js") as f:
    assemble(tpl2d, f.read(), data, "index.html", "", "")

with open("city3d.template.html") as f:
    tpl3d = f.read()

with open("scripts/app3d.js") as f:
    assemble(tpl3d, f.read(), data, "city3d.html",
             "3D · classic canvas renderer",
             '<a href="city3d-three.html">ancient city ↩</a>')

BUNDLE = "build/city3d-three.bundle.js"
if os.path.exists(BUNDLE):
    with open(BUNDLE) as f:
        assemble(tpl3d, f.read(), data, "city3d-three.html",
                 "3D · ancient city · building height = Greek word count",
                 '<a href="city3d.html">classic 3D ↩</a>')
else:
    print(f"! {BUNDLE} missing — run `npm run bundle` to build city3d-three.html")
