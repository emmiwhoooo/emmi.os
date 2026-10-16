#!/usr/bin/env python3
"""
night shift — page build.

Compiles index.template.html into index.html by substituting {{SPRITES}} with
the pixel sprite <symbol> sheet (px/sprites.svg). There are no raster assets on
this page — the CRT, the lamp light and the desk are CSS — so unlike the window
seat there is one mode, and the output is the file Pages serves.

Run from anywhere. Regenerate sprites first if px/sprites.py changed:
  cd px && python3 sprites.py

The build refuses to write a broken page. It fails on an unresolved
{{placeholder}}, a <use href="#px-…"> pointing at a sprite that does not exist,
or a sprite drawn at a size that is not a multiple of 8 — every sprite is a
16x16 grid, and any other scale puts source pixels on fractions of a CSS pixel,
which the browser smears.
"""

import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
TEMPLATE = ROOT / "index.template.html"
OUTPUT = ROOT / "index.html"
SPRITES = ROOT / "px" / "sprites.svg"


def build() -> None:
    if not TEMPLATE.exists():
        raise SystemExit(f"missing template: {TEMPLATE}")
    if not SPRITES.exists():
        raise SystemExit(f"missing sprite sheet: {SPRITES} — run px/sprites.py first")
    html = TEMPLATE.read_text().replace("{{SPRITES}}", SPRITES.read_text())

    left = sorted(set(re.findall(r"\{\{[^}]*\}\}", html)))
    if left:
        raise SystemExit("unresolved placeholders: " + ", ".join(left))

    # the hydration script draws sprites through sp('name', size) — check
    # those too, or a typo there renders a blank box the build never saw
    js = re.findall(r"sp\('([a-z0-9]+)',\s*(\d+)\)", html)
    used = set(re.findall(r'href=\\?"#(px-[a-z0-9]+)', html)) | {"px-" + n for n, _ in js}
    defined = set(re.findall(r'<symbol id="(px-[a-z0-9]+)"', html))
    if used - defined:
        raise SystemExit("sprites referenced but not defined: " + ", ".join(sorted(used - defined)))

    bad = [
        (w, h)
        for w, h in re.findall(r'class="sp[^"]*" width="(\d+)" height="(\d+)"', html) + [(s, s) for _, s in js]
        if int(w) % 8 or int(h) % 8
    ]
    if bad:
        raise SystemExit(
            "sprite sizes off the 8px grid (blurs the pixel art): "
            + ", ".join(f"{w}x{h}" for w, h in sorted(set(bad)))
        )

    OUTPUT.write_text(html)
    print(f"built {OUTPUT.relative_to(ROOT)}  {len(html) / 1024:,.0f}KB")


if __name__ == "__main__":
    build()
