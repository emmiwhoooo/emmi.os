# the window seat — build log

## v16 · sep 1
- **The HUD stops borrowing.** All four cards were school counts wearing game labels:
  STREAK was `counts.overdue`, GOLD was unmerged sessions, XP was open assignments, and
  LEVEL was a number typed into the template. The card read STREAK 0 on a day both
  habits were on a two-night run — and read 0 *because* the last overdue thing had just
  been cleared. Level, xp, purse and next-unlock now come from ☆ player one ☆; the
  streak is the ladder's own `G`, the lowest streak among active dailies.
- **The quest rows are the real roster.** They were three hard-coded rows, two of which
  are not on her board — `brain dump before bed` is still locked behind the 7-night
  gate — and the middle one was hydrated into "prep tomorrow's reading", a habit the
  page invented and then reported progress against. That hydration is deleted. Rows now
  come from ⋆ quests ⋆, dailies first, capped at three so the two columns still end on
  the same line.
- **What ships in the file is an em-dash.** The old placeholders asserted a level, an xp
  total, a purse and a streak. If the Action cannot reach the two databases, the cards
  now read `—` / "not loaded yet" and the stamp says a source is unavailable, which is
  the true statement.
- Known remainder: the XP bar under the card is still a fixed 6/10. Nothing in the
  player schema gives xp-within-level, so it cannot be computed yet.

## v15 · sep 1
- **The line under the window is generated, not typed.** It had read "Rain on the glass
  all morning, clearing by four. Nothing is due until Monday" since Aug 28 — four days
  of confident weather and a workload claim that had stopped being true, on a page whose
  every other number was live. It is now two derived sentences: sky, then workload.
- **Weather is real.** `pull_notion.py` also calls Open-Meteo (no key, no account,
  Oakland hard-coded) and writes a `sky` block into `data.json`. The hourly precipitation
  probabilities are what make "clearing by four" possible — the page names the hour after
  the last hour rain is likely, and picks the tense by whether that hour has passed.
- The weather call is strictly optional: any failure appends to `errors`, leaves `sky`
  null, and the page writes the workload sentence alone rather than inventing a sky. The
  sentence that ships in the file claims nothing about any particular day, so a page
  opened from disk — or before the first refresh — is not lying either.

## v14 · aug 29
- **Type stack replaced.** Pixelify Sans out (its 5 reads as an S at tag sizes — shipped
  as `+2S XP` and `S OPEN`), DotGothic16 in. Cabin out, Zen Kaku Gothic New in. Petrona
  stays on headings. Nine rules were asking DotGothic16 for weight 600, which the browser
  fakes by smearing a single-weight bitmap face; all pinned to 400 with
  `font-synthesis-weight: none`.
- **HUD sprites 32px -> 48px** and moved beside the number instead of marking the corner.
- **Ticker rebuilt as a rail.** ~240px -> ~115px. Cut the stepped hood, deck strip,
  recessed well, footer bar and feet; status folded into the head plate. Continuous
  motion added so it reads as a separator: scrolling ties, faster tram, falling droplets,
  hopping bird.

## v13 · aug 29
- Batch 18 art in: new hero (girl at a window), seawall and power-pole shelf tiles, a
  rain-wires divider. Page weight 1.37MB -> 0.77MB.
- The hero image carries its own mullions, so `.mull` / `.sash` are suppressed on that
  pane — otherwise the frame double-bars it.
- HUD-eye reference held back for night shift: emitted CRT glow contradicts
  `light is transmitted, never emitted`, and no grade fixes that because the glow is
  the subject.

## v12 · aug 29
- The tram's pass became the tick. One CYCLE constant drives lamp, flaps and footer
  line; CSS animation is the source of truth via `animationiteration`, so the board
  never drifts out of phase after a backgrounded tab.

## v11 · aug 29
- **Every sprite snapped to the 8px grid.** Sizes of 13/15/18/22/26/30px put each source
  pixel on a fraction of a CSS pixel; the browser smears the grid regardless of
  `crispEdges`. This, not the artwork, is why eleven versions looked soft.
- New sprites: clock, arrow, cloud, and a 32x16 tram.
- Fixed two pre-existing bugs: a stray `K` in the train and `W` in the bird were
  punching transparent holes through both.

## v10 · aug 29
- The Shelf gallery restored (six pinned, framed tiles on a wooden rail).
- Level card shows the level-19 reward instead of repeating the XP figure beside it.
- Departures sign rebuilt as pixel art: riveted girder, chain links, stepped hood,
  concentric rings, recessed flap tray, base plate.

## v9 · aug 28
- Window frame rebuilt as concentric chunky rings with hard-stop grain and corner bolts.
- Tinted cards lost their darker-tone borders (neutral `--edge` throughout).
