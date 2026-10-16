/*
  night shift — the write side.

  A Cloudflare Worker that holds the Notion token so the page never does. The
  page is public on GitHub Pages; this is the only thing that can change
  Notion, and it only does the handful of things listed in ACTIONS below.

  Two locks:
    1. Every request carries the passphrase (SHIFT_KEY) in `x-shift-key`.
       Without it nothing happens, whatever the origin.
    2. Every page it is asked to touch is fetched first and its parent
       database checked against DB. A valid passphrase still cannot be used to
       edit an arbitrary page in the workspace.

  Secrets (Cloudflare dashboard -> Worker -> Settings -> Variables, "Encrypt"):
    NOTION_TOKEN   the same integration token the refresh Action uses
    SHIFT_KEY      a passphrase you make up; the page asks for it once per device

  Single file on purpose: it can be pasted straight into the dashboard editor.
*/

const API = "https://api.notion.com/v1";
const VERSION = "2022-06-28";

const DB = {
  classes:     "8ee2ec9a796b4bdda1ed287177f1a100",   // Class Notes v6
  assignments: "0c795daa579d460e845e4d53afcc1290",   // Assignments v6
  quests:      "aef1c9ccf5ce43d2b4dea4d43c85a28d",   // ⋆ q u e s t s ⋆
  moods:       "c10062d0f683426fbfbb9b22488a4e3d",   // ⋆ m o o d  l o g ⋆
};
const MOOD_QUEST = "3c9063496baf8170916afde6a010d939"; // 🌙 log tonight's mood
// the mood log's own options, exactly as Notion spells them
const MOODS = ["🌸 soft", "⚡ wired", "🌙 quiet", "🌧 heavy", "✨ good", "🔥 stressed", "🎐 drifting", "💤 idling"];

// CORS only decides which browsers may READ the reply. It is not the lock —
// the passphrase is — but there is no reason to answer anyone else.
const ORIGINS = ["https://emmiwhoooo.github.io", "http://localhost:8765"];

const TZ = "America/Los_Angeles";

class Fail extends Error {
  constructor(status, msg) { super(msg); this.status = status; }
}

/* ---------------- dates: Pacific, and the night belongs to its evening ---------------- */

function pacific(now) {
  const o = {};
  new Intl.DateTimeFormat("en-US", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", hourCycle: "h23" }).formatToParts(now).forEach(p => { o[p.type] = p.value; });
  return { iso: `${o.year}-${o.month}-${o.day}`, h: +o.hour % 24 };
}
function addDays(iso, n) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}
/* Logging the mood at 1am is still logging the night before. 6am is the
   cutover the dawn pass closes the day on, and the page uses it too, so all
   three agree about which day a thing belongs to. */
export function shiftDay(now = new Date()) {
  const p = pacific(now);
  return p.h < 6 ? addDays(p.iso, -1) : p.iso;
}

/* ---------------- notion ---------------- */

function hex(id) {
  const h = String(id || "").replace(/-/g, "").toLowerCase();
  if (!/^[0-9a-f]{32}$/.test(h)) throw new Fail(400, "bad page id");
  return h;
}

async function notion(env, method, path, body) {
  const r = await fetch(API + path, {
    method,
    headers: { Authorization: "Bearer " + env.NOTION_TOKEN, "Notion-Version": VERSION,
               "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const hint = r.status === 404 ? " (share that database with the integration)" : "";
    throw new Fail(502, `notion ${r.status}: ${j.message || "error"}${hint}`);
  }
  return j;
}

/* The second lock: the page must live in the database the action is for. */
async function guard(env, id, db) {
  const page = await notion(env, "GET", "/pages/" + hex(id));
  const parent = (page.parent && page.parent.database_id || "").replace(/-/g, "");
  if (parent !== DB[db]) throw new Fail(403, "that page is not in " + db);
  return page;
}

const prop = (page, name) => (page.properties || {})[name] || {};
const set = (env, id, properties) => notion(env, "PATCH", "/pages/" + hex(id), { properties });

/* Claiming a quest marks it done, exactly as the Done button and the
   "done tonight" checkbox do, and nothing more. The 🌅 dawn pass (6am) is the
   ONLY writer of streak, total completions and last done: it credits any quest
   whose status is "done today" or whose "done tonight" is checked, then resets
   both. Crediting here as well would count every claim twice. */
async function markQuestDone(env, page) {
  if (prop(page, "locked").checkbox) throw new Fail(409, "that quest is still locked");
  const when = (prop(page, "time of day").select || {}).name;
  const gold = prop(page, "gold per completion").number || 0;
  const status = (prop(page, "status").select || {}).name;
  if (status === "done today" || prop(page, "done tonight").checkbox) return { already: true, gold: 0 };
  const properties = { "status": { select: { name: "done today" } } };
  if (when === "night") properties["done tonight"] = { checkbox: true };
  await set(env, page.id, properties);
  return { already: false, gold };
}

/* ---------------- actions ---------------- */

const ACTIONS = {
  // ✓ prepped on a class session
  async prep(env, b) {
    const page = await guard(env, b.id, "classes");
    await set(env, page.id, { "✓ prepped": { checkbox: !!b.value } });
    return { prepped: !!b.value };
  },

  // ✓ done on an assignment, with Submitted stamped (or cleared on undo)
  async done(env, b) {
    const page = await guard(env, b.id, "assignments");
    const on = !!b.value;
    await set(env, page.id, { "✓ done": { checkbox: on },
                              "Submitted": { date: on ? { start: shiftDay() } : null } });
    return { done: on };
  },

  // a session's notes are merged: "not merged" -> "notes clean"
  async merged(env, b) {
    const page = await guard(env, b.id, "classes");
    const name = b.value === false ? "not merged" : "notes clean";
    await set(env, page.id, { "Status": { select: { name } } });
    return { status: name };
  },

  async quest(env, b) {
    return markQuestDone(env, await guard(env, b.id, "quests"));
  },

  /* A new ⋆ mood log ⋆ entry for tonight (the note is its title, as the log's
     "@Today" template leaves it), then the mood quest marked done. */
  async mood(env, b) {
    if (!MOODS.includes(b.mood)) throw new Fail(400, "mood must be one of " + MOODS.join(", "));
    const note = String(b.note || "").slice(0, 1800);
    const day = shiftDay();
    const row = await notion(env, "POST", "/pages", {
      parent: { database_id: DB.moods },
      icon: { type: "emoji", emoji: "💭" },
      properties: {
        "Name": { title: note ? [{ text: { content: note } }] : [] },
        "date": { date: { start: day } },
        "mood": { select: { name: b.mood } },
      } });
    const q = await markQuestDone(env, await guard(env, MOOD_QUEST, "quests"));
    return { day, row: row.url, ...q };
  },
};

/* ---------------- http ---------------- */

function cors(origin) {
  const h = { "Vary": "Origin" };
  if (ORIGINS.includes(origin)) {
    h["Access-Control-Allow-Origin"] = origin;
    h["Access-Control-Allow-Methods"] = "POST, OPTIONS";
    h["Access-Control-Allow-Headers"] = "content-type, x-shift-key";
    h["Access-Control-Max-Age"] = "86400";
  }
  return h;
}
function reply(status, obj, origin) {
  return new Response(JSON.stringify(obj), {
    status, headers: { "Content-Type": "application/json", ...cors(origin) } });
}
/* constant-time, so the passphrase cannot be guessed a character at a time */
function same(a, b) {
  a = String(a || ""); b = String(b || "");
  let d = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) d |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return d === 0;
}

export default {
  async fetch(req, env) {
    const origin = req.headers.get("Origin") || "";
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origin) });
    const path = new URL(req.url).pathname;
    if (req.method === "GET" && path === "/") return reply(200, { ok: true, service: "night shift" }, origin);
    if (req.method !== "POST" || path !== "/v1") return reply(404, { error: "not found" }, origin);
    if (!env.NOTION_TOKEN || !env.SHIFT_KEY) return reply(500, { error: "worker secrets are not set" }, origin);
    if (!same(req.headers.get("x-shift-key"), env.SHIFT_KEY)) return reply(401, { error: "wrong passphrase" }, origin);

    let body;
    try { body = await req.json(); } catch { return reply(400, { error: "body must be json" }, origin); }
    const fn = Object.prototype.hasOwnProperty.call(ACTIONS, body.action) && ACTIONS[body.action];
    if (!fn) return reply(400, { error: "unknown action" }, origin);
    try {
      return reply(200, { ok: true, ...(await fn(env, body)) }, origin);
    } catch (e) {
      return reply(e.status || 500, { error: e.message || "failed" }, origin);
    }
  },
};
