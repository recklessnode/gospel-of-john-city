#!/usr/bin/env python3
"""Assemble the self-contained pages from templates + data/john-data.json.

  index.html        index.template.html  + scripts/app.js
  city3d.html       city3d.template.html + scripts/app3d.js          (canvas renderer)
  city3d-three.html city3d.template.html + build/city3d-three.bundle.js (Three.js)

The Three.js page needs `npm run bundle` first; if the bundle is missing it is
skipped with a warning so the pure-python build still works.
"""
import json
import os

ALT_2D = '<a href="index.html">2D map ↩</a>'


def assemble(template, app, data, out, subtitle, alt_link):
    html = template.replace("/*__DATA__*/;", json.dumps(data, ensure_ascii=False) + ";")
    html = html.replace("/*__APP__*/", app)
    html = html.replace("<!--__SUBTITLE__-->", subtitle)
    html = html.replace("<!--__ALT__-->", alt_link)
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
