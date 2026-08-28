# the window seat — divider pack

Ten original section dividers for the window seat dashboard. Drawn for this
system, so they are safe to host publicly — unlike the character packs in
Em's Notion resources, which are fan art and stay Notion-side.

| file | what it is | good for |
| --- | --- | --- |
| `clouds` | cumulus with a low sun | upcoming, sky, transit |
| `daisies` | a row of daisies | light, general |
| `meadow` | grass and wildflowers | general, warm |
| `puddles` | rain landing in puddles, rippling | rain sections, rest |
| `railway` | a train crossing hills | next up, commute |
| `rain-wire` | two birds on a wire in the rain | quiet, shelter |
| `signals` | crossing signals, alternating | status, today |
| `sprouts` | seedlings in a row | growth, streaks, habits |
| `umbrellas` | a row of open umbrellas | rain, weather |
| `vine` | leaf and blossom vine | closing a page |

## formats

- `svg/` — source, 1200×60. **Use these where you can.** Crisp at any size,
  ~4KB each, and animated: leaves sway, rain falls, signals blink, the train
  rolls. CSS animation inside an SVG runs even when it is loaded as a plain
  `<img>`, so Notion image blocks animate too.
- `png/` — 1200×60 flat renders, transparent background.
- `png2x/` — 2400×120, for retina.

## palette

Every colour is a window seat token, so they sit inside the system rather than
next to it:

```
pine   #1F5834    stem  #5C8A63    leaf  #A8CFB0
cobalt #0E5C86    sky   #BEDDEF    mist  #DCEAF2
rose   #9C3A5E    petal #F6C4D2
gold   #D9A62C    wheat #F2DFA4    amber #7A5510
cream  #FDFEFE
```

## recolouring

The SVGs are plain text with literal hex values. To reskin the whole pack for
another dashboard, find-and-replace the tokens above. To recolour one file,
open it and edit — there is no build step.

## motion

Everything honours `prefers-reduced-motion`, which slows animation to 18s
rather than stopping it. That is deliberate: a system-wide "reduce motion"
setting froze the save point ticker dead, and a divider that stops moving is
just a picture.
