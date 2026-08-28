# emmi.os

assets and widgets for em's dashboard system. one folder per dashboard,
served by GitHub Pages at <https://emmiwhoooo.github.io/emmi.os/>.

| folder | what's in it |
| --- | --- |
| `shared/widgets/` | ticker, clock, countdown - themed by URL params, shared by every dashboard |
| `savepoint/` | **save point** - the dark, neon, late night primary dashboard. stylus skin + sprites, banners, dividers |
| `windowseat/` | **the window seat** - the brighter daylight primary dashboard. tuned gif library |

dashboards themselves live in Notion; this repo is what they point at.

## widgets

all three are configured entirely by URL params, so re-theming one means
editing the embed link - never redeploying.

```
shared/widgets/ticker.html?msg=one|two|three&speed=20&color=%23ff5ecb&border=%23…&bg=%23…
shared/widgets/clock.html?label=night%20shift&tz=America/Los_Angeles
shared/widgets/countdown.html?to=2026-12-02&label=finals&from=2026-08-25
```

percent-encode the whole `msg` value. notion truncates an embed URL at the
first space, and the widget then silently never appears.

reduced motion **slows** animation rather than stopping it - a system-wide
'animation effects off' setting otherwise freezes a ticker dead.

## skins

install or update in Stylus from:

```
https://raw.githubusercontent.com/emmiwhoooo/emmi.os/main/savepoint/savepoint.user.css
```

two things that bite: Notion serves from **app.notion.com** (not notion.so),
and its CSP blocks Google Fonts - embed fonts as data: URIs instead.

## assets

`savepoint/assets/` - sprites, banners, dividers.
`windowseat/assets/` - `ws-<role>.gif`, graded to the window seat palette.
