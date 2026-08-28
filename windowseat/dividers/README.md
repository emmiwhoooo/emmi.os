# window seat — divider assets

Served from GitHub Pages at:
`https://emmiwhoooo.github.io/emmi.os/windowseat/dividers/<set>/<name>.webp`

| set | count | source | background | how to composite |
| --- | --- | --- | --- | --- |
| `original/` | 10 | drawn for this system | transparent | normal; animated SVG |
| `line/` | 20 | Notion divider pack | **white** | `mix-blend-mode: multiply` |
| `floral/` | 5 | Notion floristry pack | transparent | normal |
| `ghibli/` | 33 | Notion Studio Ghibli pack | transparent | normal |

## the one rule that matters

`line/` ships on **white**, everything else is transparent. Composite the line
set with `mix-blend-mode: multiply` — the white disappears against the light
ground with no quality loss. Do **not** key the white out: the pale strips
(clouds especially) drop to about 11% opacity and vanish.

Conversely, do **not** multiply the transparent sets — it erases white artwork,
which would take out the kodama and the white totoros.

```css
.dv  { mix-blend-mode: multiply; }  /* line/ only */
.dvt { /* normal */ }               /* original/, floral/, ghibli/ */
```

## original set

Only `original/` is drawn for this system. It is animated (leaves sway, rain
falls and ripples, signals blink, the train rolls), ships as editable SVG
alongside PNG, and every colour is a window seat palette token. CSS animation
inside an SVG runs even when loaded as a plain `<img>`, so it animates in
Notion image blocks too.

The other three sets are third-party decorative packs from Em's Notion
resources, kept here for personal use on this dashboard.

## sizes

Line strips 1600px wide; floral, ghibli and original 1800px. All WebP except
the original SVGs. Whole folder is under 2MB.
