# night shift — the write side

A Cloudflare Worker that lets night shift change Notion. The page is public on
GitHub Pages, so it can never hold the Notion token. This Worker holds it, and
does only these five things:

| action   | what it writes |
|---|---|
| `mood`   | tonight's **Daily Log v6** row: `Mood` and `Mood note` (creates the row if the evening job hasn't yet), then claims 🌙 log tonight's mood |
| `prep`   | `✓ prepped` on a class session |
| `done`   | `✓ done` on an assignment, and stamps `Submitted` with today |
| `merged` | a class session's `Status`, from `not merged` to `notes clean` |
| `quest`  | claims a quest: `status`, `last done`, `total completions`, `streak`, and `done tonight` for night quests |

Two locks:

- Every request needs the passphrase.
- Every page is checked against the database its action is for, so even with
  the passphrase it can't touch any other page in the workspace.

Days use the page's rule: Pacific time, and anything before 5am belongs to the
night before.

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

**In Notion,** the integration must be connected to **Daily Log v6**. Open it,
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
database check, the streak (it continues from yesterday, resets after a missed
night, and doesn't double-count a second claim the same night), and creating
a Daily Log row.

## Known limits

- **The Done button can't be pressed through the API.** `quest` repeats what
  the button visibly changes. If the button also does something else (a
  relation, another field), that part won't happen from night shift.
- **A duplicate log row is possible.** If you log a mood before the evening
  job has made the night's Daily Log row, the Worker makes one. If that job
  then creates its own row anyway, you'll have two for the day.
- **data.json lags.** It refreshes every ~15 minutes. The page remembers each
  write in this browser and shows it until a newer refresh lands, so nothing
  appears to undo itself in the meantime.
