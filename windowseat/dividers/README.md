# window seat — divider assets

| set | count | source | background | how to composite |
| --- | --- | --- | --- | --- |
| `original/` | 10 | drawn for this system | transparent | normal; animated SVG |
| `line/` | 20 | Notion divider pack | **white** | `mix-blend-mode: multiply` |
| `floral/` | 5 | Notion floristry pack | transparent | normal |
| `ghibli/` | 33 | Notion Studio Ghibli pack | transparent | normal |

## rule

`line/` ships on **white**, everything else is transparent. composite the line
set with `mix-blend-mode: multiply` — the white disappears against the light
ground with no quality loss. do **not** key the white out: the pale strips
(clouds especially) drop to about 11% opacity and vanish.

do **not** multiply the transparent sets — it erases white artwork,
which would take out the kodama and the white totoros.

```css
.dv  { mix-blend-mode: multiply; }  /* line/ only */
.dvt { /* normal */ }               /* original/, floral/, ghibli/ */
```

## sizes

line strips 1600px wide; floral, ghibli and original 1800px. 
