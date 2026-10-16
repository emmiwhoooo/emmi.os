# night shift

School, after dark. The evening desk: what tomorrow needs from tonight.

The window seat's rule is *light is transmitted, never emitted*. This page is the other
half of that sentence. Light here comes **from** things (the screen, the lamp, the moon),
and nothing else glows.

---

## Layout

```
index.template.html      the page, with {{SPRITES}}
index.html               the built page. Generated, do not edit by hand
px/sprites.py            10 pixel sprites as ASCII maps -> SVG <symbol> sheet
px/sprites.svg           generated. px/preview.svg is a contact sheet.
build/build.py           the compiler
```

There are no raster assets. The CRT, the lamp pool and the desk are CSS, so there is
one build mode and its output is what Pages serves.

## Building

```bash
cd nightshift/px && python3 sprites.py && cd ..   # only if sprites.py changed
python3 build/build.py
```

The build refuses to write a broken page. It fails on an unresolved `{{placeholder}}`,
a sprite reference with no `<symbol>` behind it, including the ones the script draws
through `sp('name', size)`, and any sprite size that is not a multiple of 8.

`sprites.py` also refuses a bad map (wrong width, wrong row count, or a character
not in `PAL`) instead of rendering it with holes. The moon is generated (a disc minus
an offset disc), not typed.

## Data

One pull, two pages. Night shift reads `../windowseat/data.json`, written by the
refresh Action. It uses two keys that only it needs:

- `ahead`: every session in the next eight days. `upcoming` stops at six, which would
  leave the back half of the timecard blank.
- `backlog`: unmerged sessions counted per course. `walkHome` is capped at ten.

Until those land, the page falls back to `upcoming` and `walkHome`. Any day the data
does not reach is drawn hatched and marked **not loaded**, never as an empty day.

## The shift

Past midnight is the same night. Before 5am Pacific, the day being prepped for is
*today*. From 5am on it is *tomorrow*. Every day boundary is Pacific, as in the
window seat.

## Type

| role | face |
|---|---|
| names, headings | Petrona (shared with the window seat) |
| prose | Zen Kaku Gothic New |
| anything on a screen | VT323, one weight, never bolded |

## Colour

Phosphor `#7FE0A8` means done or read. Amber `#F2B65A` means due or to read. Rose
`#EE9BB0` means overdue. There is still no red. `--dust` is for chips only, never text.

## Writing back

Buttons on the page write to Notion through a Cloudflare Worker in `worker/`.
That covers logging tonight's mood, marking reading done, checking off
assignments, claiming quests, and marking a session merged. Setup is in
`worker/README.md`. Until the page is connected, every button opens the
connect sheet first, and after connecting it carries on with what you clicked.

The connection (the Worker's address and the passphrase) lives in this
browser's localStorage and nowhere else. **forget this device** clears it.

## Hero mode

`?view=hero` hides everything marked `.below` and keeps the mast and the timecard,
for an embed at the top of the Notion page.

## Known open

- The Notion page `3c906349-…-d9e9bac4d716` is still skinned by `savepoint.user.css`.
  A night shift userstyle would mean taking that id out of save point's allowlist.
- The nav's Notion links point at the same pages the window seat uses.
- Uploads (slides, transcripts, notes) that create and merge class-notes pages
  are next. The Worker is where they will go.
