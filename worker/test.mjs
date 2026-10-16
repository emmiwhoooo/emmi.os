// Runs the worker against a fake Notion. `node worker/test.mjs`
// The sandbox that built this cannot reach api.notion.com, so every Notion
// call here is answered from the in-memory pages below and recorded.
import assert from "node:assert/strict";
import worker, { shiftDay, dayTitle } from "./src/index.js";

const DB = { classes: "8ee2ec9a-796b-4bdd-a1ed-287177f1a100", quests: "aef1c9cc-f5ce-43d2-b4de-a4d43c85a28d",
             daily: "3b4d2a37-62bd-4c82-9e06-faa24f6f96be", assignments: "0c795daa-579d-460e-845e-4d53afcc1290" };
const env = { NOTION_TOKEN: "secret_x", SHIFT_KEY: "moonlight" };
let pages, calls;

function reset(lastDone) {
  calls = [];
  pages = {
    "3c9063496baf8170916afde6a010d939": { id: "3c906349-6baf-8170-916a-fde6a010d939", parent: { database_id: DB.quests },
      properties: { "last done": { date: { start: lastDone } }, kind: { select: { name: "daily" } },
        "time of day": { select: { name: "night" } }, streak: { number: 3 }, "total completions": { number: 6 },
        "gold per completion": { number: 5 }, locked: { checkbox: false } } },
    "11111111111111111111111111111111": { id: "11111111-1111-1111-1111-111111111111", parent: { database_id: DB.classes }, properties: {} },
    "22222222222222222222222222222222": { id: "22222222-2222-2222-2222-222222222222", parent: { database_id: "ffffffffffffffffffffffffffffffff" }, properties: {} },
  };
}

globalThis.fetch = async (url, init = {}) => {
  const path = url.replace("https://api.notion.com/v1", "");
  const body = init.body ? JSON.parse(init.body) : null;
  calls.push({ method: init.method, path, body });
  const ok = j => new Response(JSON.stringify(j), { status: 200 });
  let m;
  if ((m = path.match(/^\/pages\/([0-9a-f]{32})$/))) {
    const p = pages[m[1]];
    if (!p) return new Response(JSON.stringify({ message: "not found" }), { status: 404 });
    if (init.method === "PATCH") Object.assign(p.properties, body.properties);
    return ok(p);
  }
  if (path.endsWith("/query")) return ok({ results: [] });
  if (path === "/pages" && init.method === "POST") return ok({ id: "new", url: "https://notion.so/new" });
  throw new Error("unexpected " + path);
};

const req = (body, key = "moonlight") => worker.fetch(new Request("https://w.dev/v1", {
  method: "POST", headers: { "x-shift-key": key, Origin: "https://emmiwhoooo.github.io" }, body: JSON.stringify(body) }), env);
const json = async r => ({ status: r.status, ...(await r.json()) });

// --- dates
assert.equal(shiftDay(new Date("2026-10-16T08:30:00Z")), "2026-10-15");   // 1:30am PDT -> still the 15th
assert.equal(shiftDay(new Date("2026-10-16T04:30:00Z")), "2026-10-15");   // 9:30pm PDT
assert.equal(shiftDay(new Date("2026-10-16T13:00:00Z")), "2026-10-16");   // 6am PDT
assert.equal(dayTitle("2026-10-15"), "Thu, Oct 15");

// --- the passphrase
reset("2026-01-01");
let r = await json(await req({ action: "prep", id: "11111111111111111111111111111111", value: true }, "nope"));
assert.equal(r.status, 401); assert.equal(calls.length, 0, "no notion call without the passphrase");

// --- unknown + prototype keys are refused
r = await json(await req({ action: "constructor" })); assert.equal(r.status, 400);

// --- prep writes the checkbox on a class page
r = await json(await req({ action: "prep", id: "11111111-1111-1111-1111-111111111111", value: true }));
assert.equal(r.status, 200); assert.equal(pages["11111111111111111111111111111111"].properties["✓ prepped"].checkbox, true);

// --- a page from some other database is refused before any write
reset("2026-01-01");
r = await json(await req({ action: "prep", id: "22222222222222222222222222222222", value: true }));
assert.equal(r.status, 403); assert.ok(!calls.some(c => c.method === "PATCH"));

// --- quests: wrong database refused (a class page is not a quest)
r = await json(await req({ action: "quest", id: "11111111111111111111111111111111" }));
assert.equal(r.status, 403);

// --- mood: creates the row, claims the quest, streak continues from yesterday
const day = shiftDay();
reset(new Date(Date.parse(day) - 864e5).toISOString().slice(0, 10));
r = await json(await req({ action: "mood", mood: "good", note: "long day, good one" }));
assert.equal(r.status, 200, JSON.stringify(r));
const created = calls.find(c => c.path === "/pages" && c.method === "POST");
assert.equal(created.body.properties.Mood.select.name, "good");
assert.equal(created.body.properties.Date.date.start, day);
const q = pages["3c9063496baf8170916afde6a010d939"].properties;
assert.equal(q.streak.number, 4); assert.equal(q["total completions"].number, 7);
assert.equal(q["done tonight"].checkbox, true); assert.equal(q.status.select.name, "done today");

// --- claiming twice the same night does not double-count
r = await json(await req({ action: "quest", id: "3c9063496baf8170916afde6a010d939" }));
assert.equal(r.already, true); assert.equal(q["total completions"].number, 7);

// --- a missed night resets the streak to 1
reset("2026-01-01");
await req({ action: "quest", id: "3c9063496baf8170916afde6a010d939" });
assert.equal(pages["3c9063496baf8170916afde6a010d939"].properties.streak.number, 1);

// --- bad mood value
r = await json(await req({ action: "mood", mood: "ecstatic" })); assert.equal(r.status, 400);

console.log("worker: all checks passed");
