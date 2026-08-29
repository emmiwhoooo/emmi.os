#!/usr/bin/env python3
"""
the window seat — page build.

Compiles index.template.html into index.html by substituting:
  {{SPRITES}}  the pixel sprite <symbol> sheet (px/sprites.svg)
  {{name}}     an image, inlined as a base64 data URI

Two modes:
  python3 build.py            embed every asset as a data URI (one portable file,
                              ~0.8MB — what the artifact publishes)
  python3 build.py --hosted   rewrite the same placeholders as assets/<file> URLs
                              (~40KB — what emmi.os should serve once assets are
                              hosted, so the browser caches them separately)

Run from the repo root. Regenerate sprites first if px/sprites.py changed:
  cd px && python3 sprites.py
"""

import argparse
import base64
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
TEMPLATE = ROOT / "index.template.html"
OUTPUT = ROOT / "index.html"
SPRITES = ROOT / "px" / "sprites.svg"
ASSETS = ROOT / "assets"

# placeholder -> file under assets/. One job per name; the template never
# refers to a file path directly, so switching to hosted URLs is one flag.
IMAGES = {
    "hero2":      "ws-hero-window.webp",
    "d_wires":    "ws-divider-wires.webp",
    "a_shelter":  "gallery/shelter.webp",
    "a_working":  "gallery/working.webp",
    "a_transit":  "gallery/transit.webp",
    "a_growth":   "gallery/growth.webp",
    "a_seawall":  "ws-seawall.webp",
    "a_pole":     "ws-pole.webp",
    "side1":      "ws-side-eaves.webp",
    # ghibli divider bands, extracted from the notion export
    "g_rain":     "dividers/ghibli/g_rain.webp",
    "g_grass":    "dividers/ghibli/g_grass.webp",
    "g_kodama":   "dividers/ghibli/g_kodama.webp",
    "g_sleep":    "dividers/ghibli/g_sleep.webp",
}

MIME = {".webp": "image/webp", ".gif": "image/gif", ".png": "image/png"}


def data_uri(path: pathlib.Path) -> str:
    mime = MIME.get(path.suffix.lower())
    if mime is None:
        raise SystemExit(f"unknown image type: {path}")
    return "data:%s;base64,%s" % (mime, base64.b64encode(path.read_bytes()).decode())


def build(hosted: bool) -> None:
    if not TEMPLATE.exists():
        raise SystemExit(f"missing template: {TEMPLATE}")
    html = TEMPLATE.read_text()

    if not SPRITES.exists():
        raise SystemExit(f"missing sprite sheet: {SPRITES} — run px/sprites.py first")
    html = html.replace("{{SPRITES}}", SPRITES.read_text())

    missing = []
    for key, rel in IMAGES.items():
        token = "{{%s}}" % key
        if token not in html:
            continue  # placeholder retired from the template; not an error
        path = ASSETS / rel
        if not path.exists():
            missing.append(rel)
            continue
        html = html.replace(token, f"assets/{rel}" if hosted else data_uri(path))
    if missing:
        raise SystemExit("missing assets:\n  " + "\n  ".join(missing))

    left = sorted(set(re.findall(r"\{\{[^}]*\}\}", html)))
    if left:
        raise SystemExit("unresolved placeholders: " + ", ".join(left))

    # every <use href="#px-*"> must resolve, or a sprite renders as a blank box
    used = set(re.findall(r'href="#(px-[a-z0-9]+)"', html))
    defined = set(re.findall(r'<symbol id="(px-[a-z0-9]+)"', html))
    if used - defined:
        raise SystemExit("sprites referenced but not defined: " + ", ".join(sorted(used - defined)))

    # every sprite is drawn on a 16px grid; a non-integer scale is what makes
    # pixel art look smeared, so refuse to ship one.
    bad = [
        (w, h)
        for w, h in re.findall(r'class="sp[^"]*" width="(\d+)" height="(\d+)"', html)
        if int(w) % 8 or int(h) % 8
    ]
    if bad:
        raise SystemExit(
            "sprite sizes off the 8px grid (blurs the pixel art): "
            + ", ".join(f"{w}x{h}" for w, h in sorted(set(bad)))
        )

    OUTPUT.write_text(html)
    kb = len(html) / 1024
    print(f"built {OUTPUT.relative_to(ROOT)}  {kb:,.0f}KB  ({'hosted' if hosted else 'embedded'})")


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--hosted", action="store_true",
                    help="reference assets/<file> instead of inlining them")
    build(ap.parse_args().hosted)
