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
  daily:       "3b4d2a3762bd4c829e06faa24f6f96be",   // Daily Log v6
};
const MOOD_QUEST = "3c9063496baf8170916afde6a010d939"; // 🌙 log tonight's mood
const MOODS = ["rough", "low", "okay", "good", "great"];

// CORS only decides which browsers may READ the reply. It is not the lock —
// the passphrase is — but there is no reason to answer anyone else.
const ORIGINS = ["https://emmiwhoooo.github.io", "http://localhost:8765"];

const TZ = "America/Los_Angeles";
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

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
/* Logging the mood at 1am is still logging the night before. Same 5am
   cutover the page uses, so the two never disagree about which day it is. */
export function shiftDay(now = new Date()) {
  const p = pacific(now);
  return p.h < 5 ? addDays(p.iso, -1) : p.iso;
}
export function dayTitle(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return `${DOW[dt.getUTCDay()]}, ${MON[m - 1]} ${d}`;   // "Thu, Oct 15", as the log names its rows
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

/* Claiming a quest by hand in Notion goes through its Done button, which the
   API cannot press. This does what that button's results show it doing:
   status, last done, total completions, the streak, and done tonight for a
   night quest. Gold and xp are formulas over those, so they follow. */
async function completeQuest(env, page, day) {
  if (prop(page, "locked").checkbox) throw new Fail(409, "that quest is still locked");
  const last = ((prop(page, "last done").date || {}).start || "").slice(0, 10);
  const kind = (prop(page, "kind").select || {}).name;
  const when = (prop(page, "time of day").select || {}).name;
  const streak = prop(page, "streak").number || 0;
  const total = prop(page, "total completions").number || 0;
  const gold = prop(page, "gold per completion").number || 0;
  if (last === day) return { already: true, streak, gold: 0 };

  let next = streak;
  if (kind === "daily") next = last === addDays(day, -1) ? streak + 1 : 1;
  else if (kind === "weekly") next = last && last >= addDays(day, -13) ? streak + 1 : 1;

  const properties = {
    "status": { select: { name: "done today" } },
    "last done": { date: { start: day } },
    "total completions": { number: total + 1 },
    "streak": { number: next },
  };
  if (when === "night") properties["done tonight"] = { checkbox: true };
  await set(env, page.id, properties);
  return { already: false, streak: next, gold };
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
    const page = await guard(env, b.id, "quests");
    return completeQuest(env, page, shiftDay());
  },

  /* Tonight's mood onto tonight's Daily Log row (made if the evening job has
     not made it yet), then the mood quest claimed. */
  async mood(env, b) {
    if (!MOODS.includes(b.mood)) throw new Fail(400, "mood must be one of " + MOODS.join(", "));
    const note = String(b.note || "").slice(0, 1800);
    const day = shiftDay();
    const found = await notion(env, "POST", `/databases/${DB.daily}/query`,
      { filter: { property: "Date", date: { equals: day } }, page_size: 1 });
    let row = found.results && found.results[0];
    const mood = { "Mood": { select: { name: b.mood } },
                   "Mood note": { rich_text: note ? [{ text: { content: note } }] : [] } };
    if (row) await set(env, row.id, mood);
    else row = await notion(env, "POST", "/pages", { parent: { database_id: DB.daily }, properties: {
      "Name": { title: [{ text: { content: dayTitle(day) } }] },
      "Date": { date: { start: day } }, ...mood } });
    const quest = await guard(env, MOOD_QUEST, "quests");
    const q = await completeQuest(env, quest, day);
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
