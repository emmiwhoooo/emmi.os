# night shift — the write side

A Cloudflare Worker that lets night shift change Notion. The page is public on
GitHub Pages, so it can never hold the Notion token. This Worker holds it, and
does only these five things:

| action   | what it writes |
|---|---|
| `mood`   | a new **⋆ mood log ⋆** entry (`mood`, `date`, and the note as its title), then marks 🌙 log tonight's mood done |
| `prep`   | `✓ prepped` on a class session |
| `done`   | `✓ done` on an assignment, and stamps `Submitted` with today |
| `merged` | a class session's `Status`, from `not merged` to `notes clean` |
| `quest`  | marks a quest done: `status` → `done today`, plus `done tonight` for night quests. Same as the Done button. |

Two locks:

- Every request needs the passphrase.
- Every page is checked against the database its action is for, so even with
  the passphrase it can't touch any other page in the workspace.

Days use the same rule as the 🌅 dawn pass: Pacific time, and anything before
6am belongs to the night before.

**Quests are marked done, never credited.** The dawn pass (6am) is the only
thing that writes `streak`, `total completions` and `last done`. It credits
every quest whose status is `done today` or whose `done tonight` is checked,
then resets both. The Worker sets exactly those two fields, like the Done
button does, so a claim from night shift and a tap in Notion count the same
way, and only once.

## Set it up (about 5 minutes, no terminal)

1. Make a free account at **dash.cloudflare.com**.
2. Go to **Workers & Pages → Create → Create Worker**. Name it `night-shift` and
   click **Deploy**.
3. Click **Edit code**. Delete what's there, paste in all of `src/index.js`, and
   click **Deploy**.
4. Go to **Settings → Variables and Secrets**. Add two, both as type **Secret**:
   - `NOTION_TOKEN`: the same integration token the refresh Action uses
     (the `NOTION_TOKEN` repo secret on GitHub)
   - `SHIFT_KEY`: a passphrase you make up. Long is good; you type it once per
     device.
5. Copy the Worker's address, e.g. `https://night-shift.<you>.workers.dev`.
6. On night shift, click **connect to notion** (bottom of the page), then paste
   the address and the passphrase.

**In Notion,** the integration must be connected to **⋆ mood log ⋆**. Open it,
then **••• → Connections → add your integration**. It already has the other
three databases, because the refresh reads them. It also needs **update** and
**insert** content capabilities (notion.so/my-integrations → your integration
→ Capabilities).

## Or from a terminal

```bash
cd worker
npx wrangler deploy
npx wrangler secret put NOTION_TOKEN
npx wrangler secret put SHIFT_KEY
```

## Test

```bash
node worker/test.mjs
```

This runs every action against a fake Notion. It checks the passphrase, the
database check, the 6am cutover, that a mood creates a mood log entry, and
that claiming a quest marks it done without touching streak, completions or
last done.

## Known limits

- **data.json lags.** It refreshes every ~15 minutes. The page remembers each
  write in this browser and shows it until a newer refresh lands, so nothing
  appears to undo itself in the meantime.
