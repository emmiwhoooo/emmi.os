# Pelican Town desktop

valley.log in its own window: a frameless Electron window with a wooden title
bar, showing the tracker artifact from claude.ai with Claude's own page tucked
away (`hide.js`). It keeps its own signed-in session, so sign in to Claude once
inside the window.

- `just the farm` / `showing Claude` (Ctrl+Shift+C) toggles the hiding, for the
  rare time Claude's own page is needed.
- On Windows it is an installer (`Pelican-Town-Setup.exe`) that adds desktop and Start menu shortcuts.
- Builds run in `.github/workflows/pelicantown-desktop.yml` and land on the
  `pelican-town-desktop` release.
- Local run: `npm install && npm start`.
