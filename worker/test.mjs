// Runs the worker against a fake Notion. `node worker/test.mjs`
// The sandbox that built this cannot reach api.notion.com, so every Notion
// call here is answered from the in-memory pages below and recorded.
import assert from "node:assert/strict";
import worker, { shiftDay, cleanToken } from "./src/index.js";

const DB = { classes: "8ee2ec9a-796b-4bdd-a1ed-287177f1a100", quests: "aef1c9cc-f5ce-43d2-b4de-a4d43c85a28d",
             moods: "c10062d0-f683-426f-bfbb-9b22488a4e3d", assignments: "0c795daa-579d-460e-845e-4d53afcc1290" };
const env = { NOTION_TOKEN: "secret_" + "x".repeat(40), SHIFT_KEY: "moonlight" };
let pages, calls;

function reset(status = "not started") {
  calls = [];
  pages = {
    "3c9063496baf8170916afde6a010d939": { id: "3c906349-6baf-8170-916a-fde6a010d939", parent: { database_id: DB.quests },
      properties: { status: { select: { name: status } }, "done tonight": { checkbox: false },
        "last done": { date: { start: "2026-10-14" } }, kind: { select: { name: "daily" } },
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

// --- dates: 6am Pacific is the cutover, same as the dawn pass
assert.equal(shiftDay(new Date("2026-10-16T08:30:00Z")), "2026-10-15");   // 1:30am PDT -> still the 15th
assert.equal(shiftDay(new Date("2026-10-16T12:30:00Z")), "2026-10-15");   // 5:30am PDT -> still the 15th
assert.equal(shiftDay(new Date("2026-10-16T04:30:00Z")), "2026-10-15");   // 9:30pm PDT
assert.equal(shiftDay(new Date("2026-10-16T13:30:00Z")), "2026-10-16");   // 6:30am PDT

// --- the passphrase
reset();
let r = await json(await req({ action: "prep", id: "11111111111111111111111111111111", value: true }, "nope"));
assert.equal(r.status, 401); assert.equal(calls.length, 0, "no notion call without the passphrase");

// --- unknown + prototype keys are refused
r = await json(await req({ action: "constructor" })); assert.equal(r.status, 400);

// --- prep writes the checkbox on a class page
r = await json(await req({ action: "prep", id: "11111111-1111-1111-1111-111111111111", value: true }));
assert.equal(r.status, 200); assert.equal(pages["11111111111111111111111111111111"].properties["✓ prepped"].checkbox, true);

// --- a page from some other database is refused before any write
reset();
r = await json(await req({ action: "prep", id: "22222222222222222222222222222222", value: true }));
assert.equal(r.status, 403); assert.ok(!calls.some(c => c.method === "PATCH"));

// --- quests: wrong database refused (a class page is not a quest)
r = await json(await req({ action: "quest", id: "11111111111111111111111111111111" }));
assert.equal(r.status, 403);

// --- mood: a new mood log entry, then the quest MARKED done — never credited.
// The dawn pass owns streak / total completions / last done; touching them here
// would double-count every night.
reset();
r = await json(await req({ action: "mood", mood: "🌙 quiet", note: "long day, good one" }));
assert.equal(r.status, 200, JSON.stringify(r));
const created = calls.find(c => c.path === "/pages" && c.method === "POST");
assert.equal(created.body.parent.database_id, DB.moods.replace(/-/g, ""));
assert.equal(created.body.properties.mood.select.name, "🌙 quiet");
assert.equal(created.body.properties.Name.title[0].text.content, "long day, good one");
assert.equal(created.body.properties.date.date.start, shiftDay());
const q = pages["3c9063496baf8170916afde6a010d939"].properties;
assert.equal(q.status.select.name, "done today"); assert.equal(q["done tonight"].checkbox, true);
assert.equal(q.streak.number, 3, "streak untouched");
assert.equal(q["total completions"].number, 6, "completions untouched");
assert.equal(q["last done"].date.start, "2026-10-14", "last done untouched");

// --- claiming again before the dawn pass is a no-op
const before = calls.length;
r = await json(await req({ action: "quest", id: "3c9063496baf8170916afde6a010d939" }));
assert.equal(r.already, true); assert.ok(!calls.slice(before).some(c => c.method === "PATCH"));

// --- a quest already marked done in Notion counts as claimed
reset("done today");
r = await json(await req({ action: "quest", id: "3c9063496baf8170916afde6a010d939" }));
assert.equal(r.already, true);

// --- moods outside the log's own options are refused
r = await json(await req({ action: "mood", mood: "great" })); assert.equal(r.status, 400);

// --- a key pasted with invisible junk still works; a wrong thing says what it is
const KEY = "ntn_" + "a1B2".repeat(10);
for (const messy of [KEY, KEY + "\n", " " + KEY + " ", "\u00a0" + KEY, '"' + KEY + '"', "Bearer " + KEY, "\u201c" + KEY + "\u201d", KEY.slice(0, 20) + "\u200b" + KEY.slice(20)])
  assert.equal(cleanToken(messy), KEY, JSON.stringify(messy));
assert.throws(() => cleanToken("https://www.notion.so/my-integrations"), /starts "http…"/);
assert.throws(() => cleanToken(""), /is empty/);
r = await json(await worker.fetch(new Request("https://w.dev/v1", { method: "POST",
  headers: { "x-shift-key": "moonlight" }, body: JSON.stringify({ action: "quest", id: "3c9063496baf8170916afde6a010d939" }) }),
  { NOTION_TOKEN: "my integration", SHIFT_KEY: "moonlight" }));
assert.equal(r.status, 500); assert.match(r.error, /doesn't look like a Notion key/);

console.log("worker: all checks passed");
