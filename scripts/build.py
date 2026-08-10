#!/usr/bin/env python3
"""Assemble index.html from index.template.html + data/john-data.json + scripts/app.js"""
import json

with open("index.template.html") as f:
    tpl = f.read()
with open("data/john-data.json") as f:
    data = json.load(f)
with open("scripts/app.js") as f:
    app = f.read()

out = tpl.replace("/*__DATA__*/;", json.dumps(data, ensure_ascii=False) + ";")
out = out.replace("/*__APP__*/", app)
with open("index.html", "w") as f:
    f.write(out)
print(f"index.html written ({len(out):,} bytes)")

with open("city3d.template.html") as f:
    tpl3 = f.read()
with open("scripts/app3d.js") as f:
    app3 = f.read()
out3 = tpl3.replace("/*__DATA__*/;", json.dumps(data, ensure_ascii=False) + ";")
out3 = out3.replace("/*__APP__*/", app3)
with open("city3d.html", "w") as f:
    f.write(out3)
print(f"city3d.html written ({len(out3):,} bytes)")
