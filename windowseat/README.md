# the window seat

The daylight dashboard. One of four skins over one system — `save point` (dark, game),
`night shift` (school, after dark), `the nook` (pastel, unbuilt), and this one.

Rain on the glass, clearing by four. Cozy retro anime, not arcade.

---

## Layout

```
index.template.html      the page, with {{placeholders}}
index.html               the built page — do not edit by hand, it is generated
windowseat.user.css      Stylus userstyle for the Notion page
build/build.py           the compiler
px/sprites.py            17 pixel sprites as ASCII maps -> SVG <symbol> sheet
px/sprites.svg           generated. px/preview.svg is a contact sheet.
assets/                  graded art, dividers, and the ungraded reserve
docs/                    the written record
```

## Building

```bash
cd px && python3 sprites.py && cd ..     # only if sprites.py changed
python3 build/build.py                   # embedded: one portable 790KB file
python3 build/build.py --hosted          # hosted: 75KB + assets/ served separately
```

`--hosted` is what emmi.os should serve. The 715KB difference is base64 image data
that a browser would otherwise cache once and reuse.

The build refuses to write a broken page. It fails on:

- an unresolved `{{placeholder}}`
- a missing file under `assets/`
- a `<use href="#px-…">` pointing at a sprite that does not exist
- **a sprite drawn at a size that is not a multiple of 8**

That last one is the important guard. Every sprite is a 16×16 grid. Rendering one at
13px or 22px puts each source pixel on a fraction of a CSS pixel, and the browser
smears the grid no matter how crisp the edges are — which is exactly what made the
first eleven versions of this page look soft rather than pixelated. Only 8, 16, 32
and 48 are allowed.

## Two modes, one file

`?view=hero` adds `body.hero-only`, which hides every section marked `.below` — the
parts Notion currently renders underneath the embed.

Migrating off Notion later is **deleting blocks and dropping the query param**, not a
rewrite. The seam is drawn on the page on purpose so it is always obvious which half
is which.

## Type

Three faces, three jobs. Do not add a fourth.

| role | face | note |
|---|---|---|
| names, headings | Petrona | warm, slightly narrow serif; carries the lowercase title |
| prose, small labels | Zen Kaku Gothic New | |
| the game HUD | DotGothic16 | japanese 16-dot bitmap gothic |

DotGothic16 replaced Pixelify Sans because Pixelify's **5 reads as an S** at tag sizes
— a real bug that shipped as `+2S XP` and `S OPEN`. DotGothic16's 5 has a flat top bar
that cannot be misread, and it comes from the same visual culture as the reference art,
which no Western game face does.

**It ships one weight.** Never ask for 600 — the browser fakes it by smearing the
bitmap. Every pixel run is pinned to 400 with `font-synthesis-weight: none`.

## Colour

`light is transmitted, never emitted.` No glow, no neon, no emitted light anywhere.
That rule is why the HUD-eye reference in `assets/reserve/` is held back for night
shift rather than graded into this palette — the glow *is* its subject.

`status is a lamp.` Semantic colour is a small filled square, never a red banner.
**There is no red in the palette.** Overdue is rose; due is butter.

Every text token clears WCAG AA against panel, ground, and its own tint. `--dust`
(2.77:1) fails and is chips-only — never text.

## Sprites

`px/sprites.py` holds each sprite as an ASCII map plus a palette dict, and emits
run-length `<rect>` runs into a single `<symbol>` sheet. To add one, write the map and
re-run. Two rules:

- 16 rows of exactly 16 characters (wide sprites: 32)
- **ASCII only.** A Cyrillic `о` and `с` once punched transparent holes through the
  sprout and signal sprites, and an uppercase `K`/`W` that was not in the palette did
  the same to the train and bird. Characters not in `PAL` render as nothing.

## The ticker

The departures rail is a **horizontal rule, not a monument** — roughly 115px, and it
stays moving so it reads as a separator: the ties scroll on a 1.1s loop, the tram runs
end to end, droplets fall, the bird hops, the lamp blinks.

The tram's pass **is** the tick. One `CYCLE` constant drives everything: at 34% the
arrivals lamp warms, at 52% the flaps flip as the tram clears centre, at 70% the lamp
goes cold. The CSS animation is the source of truth and JS listens for
`animationiteration`, so backgrounding the tab and returning does not drift the board
out of phase with the train.

## The Notion side

`windowseat.user.css` is scoped **by page id**, not by domain, so it cannot bleed onto
save point or night shift:

```
@-moz-document regexp(".*notion\\.(so|com)/.*3cb063496baf81b48fe1d7cd63123b8c.*")
```

The single highest-value rule in it is `border-radius: 0` on everything inside
`.notion-page-content`. Notion's 3–6px rounding is the loudest tell that a page is
Notion; removing it moves the needle further than the entire palette.

Notion's `--theme--*` custom property names drift between releases. That block is
deliberately over-inclusive — unknown names are ignored — and the element selectors
below it are the real backstop. If a release breaks something, fix the element rule.

## Known open

- Assets are not hosted; `index.html` ships embedded. Hosting unblocks `--hosted`,
  the Notion embed, and permanent image URLs instead of expiring S3 ones.
- Data is placeholder. A nightly export writing `data.json` is the intended source.
- Nav links are `#`.
- Notion's embed height is fixed — hero mode needs a pinned height or it scrolls
  inside its own iframe.
- The gamma exponent in the original grade script was inverted (ffmpeg's `eq` applies
  `in^(1/gamma)`). The first 19 assets were graded with it; batch 18 was not. See
  `docs/` for the full note before re-running anything.
