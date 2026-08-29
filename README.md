# emmi.os

One system, four skins. Each folder is a dashboard; `shared/` is what more than one of them uses.

```
savepoint/     dark, game
windowseat/    daylight            ← live
nightshift/    school, after dark
nook/          pastel              ← unbuilt
shared/        widgets used by more than one
```

## live

**the window seat** — https://emmiwhoooo.github.io/emmi.os/windowseat/

Add `?view=hero` for the embed variant: it hides every section marked `.below`,
which is the part Notion still renders underneath. Migrating off Notion later is
deleting blocks and dropping the query param, not a rewrite.

```
https://emmiwhoooo.github.io/emmi.os/windowseat/?view=hero
```

## skins

Stylus userstyles for the Notion side. **Install by URL** — open the raw link in
Chrome with Stylus installed and it offers an Install button, then keeps the
style updated from `@updateURL`. Pasting by hand works but never auto-updates.

```
https://raw.githubusercontent.com/emmiwhoooo/emmi.os/main/savepoint/savepoint.user.css
https://raw.githubusercontent.com/emmiwhoooo/emmi.os/main/windowseat/windowseat.user.css
```

Both are **allowlists of Notion page ids**, not domain rules. `savepoint` covers
save point, night shift and pocket; `windowseat` covers the one daylight page.
Every other Notion page renders stock. They cannot fight each other, because no
page matches both.

Fonts are embedded as subset woff2 — Notion's CSP blocks `fonts.googleapis.com`,
so a linked font silently falls back to a system face.

## widgets

```
shared/widgets/ticker.html?msg=one|two|three&speed=20&color=%23ff5ecb&border=%23…&bg=%23…
shared/widgets/clock.html?label=night%20shift&tz=America/Los_Angeles
shared/widgets/countdown.html?to=2026-12-02&label=finals&from=2026-08-25
```

Percent-encode the whole `msg` value.

## building

```bash
cd windowseat
python3 build/build.py            # embedded — one portable 790KB file
python3 build/build.py --hosted   # hosted  — 75KB + assets/ served separately
```

`--hosted` is what Pages serves. The build refuses to write a broken page: it
fails on an unresolved placeholder, a missing asset, a `<use>` pointing at a
sprite that does not exist, or **a sprite drawn at a size that is not a multiple
of 8**. That last guard matters — every sprite is a 16×16 grid, and rendering one
at 13px puts each source pixel on a fraction of a CSS pixel, which the browser
smears no matter how crisp the edges are.

`windowseat/README.md` has the design rules; `windowseat/docs/` has the changelog
and the note on the inverted gamma exponent in the grade script.
