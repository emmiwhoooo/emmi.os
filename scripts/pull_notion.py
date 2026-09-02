#!/usr/bin/env python3
"""
Pull the window seat's live data out of Notion into windowseat/data.json.

Runs in GitHub Actions, not locally — the Claude sandbox cannot reach
api.notion.com, and Em's laptop is not always on. Actions has neither problem.

Needs NOTION_TOKEN in the environment (repo secret). The integration must be
shared with each database below, or Notion returns 404 for it — that is a
sharing problem, not a token problem, and the error text says which.

Design rule: NEVER fail the whole run for one bad database. A dashboard showing
four of five sections beats a dashboard showing a stale file forever. Failures
land in data.json's "errors" so they are visible on the page instead of silent.
"""

import json
import os
import sys
import urllib.error
import urllib.request
from datetime import date, datetime, timedelta, timezone

# Every day boundary on this page is Pacific, because that is the day Em is
# living in. Notion hands back timed properties as UTC instants, so the
# conversion has to happen here rather than by string-slicing downstream.
try:
    from zoneinfo import ZoneInfo
    PACIFIC = ZoneInfo("America/Los_Angeles")
except Exception:                                         # noqa: BLE001
    PACIFIC = timezone(timedelta(hours=-7))               # DST-naive fallback

TOKEN = os.environ.get("NOTION_TOKEN", "").strip()
API = "https://api.notion.com/v1"
VERSION = "2022-06-28"          # long-stable; do not chase the newest header

DB = {
    "classes":    "8ee2ec9a-796b-4bdd-a1ed-287177f1a100",   # Class Notes v6
    "assignments":"0c795daa-579d-460e-845e-4d53afcc1290",   # Assignments v6
    "cases":      "cfca3b5f-1ce2-48b2-a879-966edfe610c9",   # Case Bank v6
    "courses":    "c1977d28-e2e1-4125-8ddb-2a38a9d23b41",   # courses
    "resources":  "a52c8648-160e-43a1-9d88-302664a48bd4",   # Resources v6
    "quests":     "aef1c9cc-f5ce-43d2-b4de-a4d43c85a28d",   # ⋆ q u e s t s ⋆
    "player":     "6e371468-38f6-4a2d-8017-a5f669ea5a38",   # ☆ p l a y e r  o n e ☆
}

TERM_START, TERM_END, TERM_WEEKS = date(2026, 8, 17), date(2026, 12, 2), 14
errors = []


def post(path, payload=None):
    req = urllib.request.Request(
        API + path,
        data=json.dumps(payload or {}).encode(),
        headers={
            "Authorization": "Bearer " + TOKEN,
            "Notion-Version": VERSION,
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def query(name, **kw):
    """Query one database, following pagination. Returns [] and records the
    error rather than raising, so one broken database cannot take the run down."""
    rows, cursor = [], None
    try:
        while True:
            body = dict(kw)
            if cursor:
                body["start_cursor"] = cursor
            data = post("/databases/%s/query" % DB[name], body)
            rows += data.get("results", [])
            if not data.get("has_more"):
                return rows
            cursor = data.get("next_cursor")
    except urllib.error.HTTPError as e:
        detail = e.read().decode()[:200]
        hint = " (share the database with the integration)" if e.code == 404 else ""
        errors.append("%s: HTTP %s%s %s" % (name, e.code, hint, detail))
    except Exception as e:                                    # noqa: BLE001
        errors.append("%s: %s" % (name, e))
    return []


# ---- property readers. Notion nests everything; these flatten one field. ----

def title_of(p):
    for v in p.values():
        if v.get("type") == "title":
            return "".join(t.get("plain_text", "") for t in v["title"]).strip()
    return ""


def text_of(p, key):
    v = p.get(key) or {}
    return "".join(t.get("plain_text", "") for t in v.get("rich_text", [])).strip()


def date_of(p, key):
    v = (p.get(key) or {}).get("date") or {}
    return v.get("start")


def select_of(p, key):
    v = (p.get(key) or {}).get("select") or {}
    return v.get("name")


def checked(p, key):
    return bool((p.get(key) or {}).get("checkbox"))


def relation_ids(p, key):
    return [r["id"] for r in (p.get(key) or {}).get("relation", [])]


def number_of(p, key):
    return (p.get(key) or {}).get("number")


def formula_of(p, key):
    """A formula property carries its result under its own type key."""
    f = (p.get(key) or {}).get("formula") or {}
    for k in ("number", "string", "boolean"):
        if k in f:
            return f[k]
    return None


def rollup_of(p, key):
    return ((p.get(key) or {}).get("rollup") or {}).get("number")


def day_only(s):
    """The calendar day a Notion date falls on, in Pacific.

    Date-only properties come back as "2026-09-02" and are already local, so
    they pass through. Properties that carry a TIME come back as a UTC instant
    — and slicing the first ten characters of one puts an evening class on the
    following day. Youth Justice meets Wednesday 6:25pm Pacific, which Notion
    stores as "2026-09-03T01:25:00.000Z"; the old slice filed it under
    Thursday, so the page said "today's only stop is Property 7" on a day Em
    had two, and the horizon sentence counted it twice over. The daily log had
    the same bug fixed by hand on Sep 1 — this is the source of it.
    """
    if not s:
        return ""
    if len(s) <= 10:
        return s[:10]
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00")).astimezone(PACIFIC).date().isoformat()
    except Exception as e:                                    # noqa: BLE001
        errors.append("date %r: %s" % (s, e))
        return s[:10]


def is_placeholder(title):
    """Template/placeholder rows use ⟨ ⟩ brackets or an em-dashed 'new x' label."""
    t = (title or "").strip()
    return (not t) or t.startswith("⟨") or "— new " in t or t.lower().startswith("new ")


# ---- the sky ----------------------------------------------------------------
# The caption's first clause is weather, so it has to be actual weather. Open-
# Meteo needs no key and no account; Oakland's coordinates are hard-coded because
# a dashboard for one person at one window does not need a location service.
#
# This is the only non-Notion call in the script and it is strictly optional. Any
# failure records an error and leaves "sky" null, and the page then writes the
# caption from the workload alone rather than inventing weather — which is the
# whole point of moving that line off hand-written copy.

WX = ("https://api.open-meteo.com/v1/forecast"
      "?latitude=37.8044&longitude=-122.2712"
      "&timezone=America%2FLos_Angeles&temperature_unit=fahrenheit"
      "&current=weather_code,temperature_2m"
      "&hourly=precipitation_probability"
      "&daily=weather_code,temperature_2m_max,temperature_2m_min,"
      "precipitation_probability_max&forecast_days=4")


def sky():
    try:
        with urllib.request.urlopen(WX, timeout=20) as r:
            w = json.load(r)
    except Exception as e:                                    # noqa: BLE001
        errors.append("weather: %s" % e)
        return None

    def first(block, key):
        v = (w.get(block) or {}).get(key)
        return v[0] if isinstance(v, list) and v else None

    cur = w.get("current") or {}
    hourly = w.get("hourly") or {}
    times = hourly.get("time") or []
    probs = hourly.get("precipitation_probability") or []

    # The last hour today the rain is still likely. This is what lets the page
    # say "clearing by four" rather than just "raining"; None means today never
    # gets wet enough to be worth a clause.
    #
    # forecast_days is 4 now (the page carries a three-day strip), so "hourly"
    # runs four days deep. Without the date guard below this loop walks off the
    # end of today and reports Friday's rain as tonight's.
    today_iso = date.today().isoformat()
    wet_until = None
    for t, p in zip(times, probs):
        if not str(t).startswith(today_iso):
            continue
        if p is not None and p >= 40:
            wet_until = t

    # The strip's three cells. Kept deliberately thin — a code, a high, a low
    # and a rain chance is everything the page draws, and anything more would
    # be a second forecast to keep honest.
    daily = w.get("daily") or {}

    def col(key, i):
        v = daily.get(key)
        return v[i] if isinstance(v, list) and i < len(v) else None

    days = [{"date":    t,
             "code":    col("weather_code", i),
             "high":    col("temperature_2m_max", i),
             "low":     col("temperature_2m_min", i),
             "rainMax": col("precipitation_probability_max", i)}
            for i, t in enumerate((daily.get("time") or [])[:4])]

    return {
        "days":     days,
        "code":     cur.get("weather_code", first("daily", "weather_code")),
        "dayCode":  first("daily", "weather_code"),
        "temp":     cur.get("temperature_2m"),
        "high":     first("daily", "temperature_2m_max"),
        "low":      first("daily", "temperature_2m_min"),
        "rainMax":  first("daily", "precipitation_probability_max"),
        "wetUntil": wet_until,
    }


def main():
    if not TOKEN:
        print("NOTION_TOKEN is not set", file=sys.stderr)
        return 1

    today = date.today().isoformat()

    # course id -> name, so relations can be shown as words not uuids
    course_name = {}
    for row in query("courses"):
        course_name[row["id"]] = title_of(row["properties"])

    def course_of(props, key="Course"):
        ids = relation_ids(props, key)
        return course_name.get(ids[0], "") if ids else ""

    # ---- the 9:40 — next sessions from today forward ----
    sessions = []
    for row in query("classes",
                     filter={"property": "Date", "date": {"on_or_after": today}},
                     sorts=[{"property": "Date", "direction": "ascending"}]):
        p = row["properties"]
        sessions.append({
            "title":   title_of(p),
            "course":  course_of(p),
            "date":    day_only(date_of(p, "Date")),
            "session": (p.get("Class") or {}).get("number"),
            "reading": text_of(p, "Readings"),
            "prepped": checked(p, "✓ prepped"),
            "status":  select_of(p, "Status"),
            "url":     row.get("url"),
        })

    # ---- the walk home — sessions still waiting on a merge ----
    walk_home = []
    for row in query("classes",
                     filter={"and": [
                         {"property": "Status", "select": {"equals": "not merged"}},
                         {"property": "Date", "date": {"before": today}},
                     ]},
                     sorts=[{"property": "Date", "direction": "ascending"}]):
        p = row["properties"]
        walk_home.append({
            "title":  title_of(p),
            "course": course_of(p),
            "date":   day_only(date_of(p, "Date")),
            "url":    row.get("url"),
        })

    # ---- weather ahead — everything unchecked, nearest first ----
    open_work = []
    for row in query("assignments",
                     filter={"property": "✓ done", "checkbox": {"equals": False}},
                     sorts=[{"property": "Due", "direction": "ascending"}]):
        p = row["properties"]
        due = day_only(date_of(p, "Due"))
        open_work.append({
            "title":   title_of(p),
            "course":  course_of(p),
            "due":     due,
            "type":    select_of(p, "Type"),
            "weight":  text_of(p, "Weight"),
            "overdue": bool(due and due < today),
            "url":     row.get("url"),
        })

    graded = [a for a in open_work if a["type"] == "graded"]
    overdue = [a for a in open_work if a["overdue"]]
    horizon = (date.today() + timedelta(days=7)).isoformat()
    due_soon = [a for a in open_work if a["due"] and a["due"] <= horizon]

    # ---- the shelf — recent cases, rule/holding lives on the page itself ----
    shelf = []
    for row in query("cases", page_size=8,
                     sorts=[{"timestamp": "created_time", "direction": "descending"}]):
        p = row["properties"]
        name = title_of(p)
        if is_placeholder(name):
            continue
        shelf.append({"title": name, "course": course_of(p), "url": row.get("url")})

    # ---- the reserve — handouts, slides, statutes, case texts ----
    # Resources hangs off both Course and Session, and carries either an uploaded
    # file or an external Link. Prefer the Link; fall back to the Notion page.
    reserve = []
    for row in query("resources", page_size=12,
                     sorts=[{"timestamp": "created_time", "direction": "descending"}]):
        p = row["properties"]
        reserve.append({
            "title":  title_of(p),
            "course": course_of(p),
            "kind":   select_of(p, "Kind"),
            "link":   (p.get("Link") or {}).get("url") or row.get("url"),
        })

    # ---- the ladder — active quests, and the run they are on ----
    # The HUD used to show counts borrowed from school data under game labels:
    # "streak" was the overdue count, "gold" was unmerged sessions, "level" was
    # a number typed into the template. A card that says STREAK 0 on a night she
    # kept both habits is worse than a blank one, so these come from the quests
    # database or they do not render at all.
    dailies, other_quests = [], []
    for row in query("quests", filter={"property": "locked",
                                       "checkbox": {"equals": False}}):
        p = row["properties"]
        name = title_of(p)
        if is_placeholder(name):
            continue
        q = {
            "title":    name,
            "kind":     select_of(p, "kind"),
            "when":     select_of(p, "time of day"),
            "streak":   number_of(p, "streak"),
            "gold":     number_of(p, "gold per completion"),
            "status":   select_of(p, "status"),
            "done":     select_of(p, "status") == "done today",
            "lastDone": day_only(date_of(p, "last done")),
            "url":      row.get("url"),
        }
        (dailies if q["kind"] == "daily" else other_quests).append(q)

    # The ladder's own definition of the run: the lowest streak among the active
    # dailies (the gate's `G`). One missed night takes the whole run down —
    # that is the point of it — so a max or an average would flatter her.
    run = min([q["streak"] or 0 for q in dailies], default=None)
    # None, not 0 — with no dailies in hand the honest answer is "unknown", and
    # 0 would render as "all claimed today" on a day nothing was read.
    unclaimed = (sum([q["gold"] or 0 for q in dailies if not q["done"]])
                 if dailies else None)

    # ---- the player — level, xp and purse, all computed inside Notion ----
    player = {}
    prows = query("player", page_size=1)
    if prows:
        p = prows[0]["properties"]
        player = {
            "level":  formula_of(p, "level"),
            "xp":     rollup_of(p, "total xp"),
            "toNext": formula_of(p, "xp to next level"),
            "gold":   formula_of(p, "gold available"),
            "rank":   formula_of(p, "⚔ rank"),
            "next":   formula_of(p, "✦ next"),
        }

    d = date.today()
    week = max(1, min(TERM_WEEKS, ((d - TERM_START).days // 7) + 1))

    out = {
        "generated":   datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "today":       today,
        "term":        {"week": week, "of": TERM_WEEKS,
                        "start": TERM_START.isoformat(), "end": TERM_END.isoformat(),
                        "daysToFinals": (TERM_END - d).days},
        "sky":         sky(),
        "player":      player,
        "quests":      {"run": run, "unclaimed": unclaimed,
                        "dailies": dailies, "other": other_quests},
        "next":        sessions[0] if sessions else None,
        "upcoming":    sessions[:6],
        "walkHome":    walk_home[:10],
        "shelf":       shelf,
        "reserve":     reserve,
        "weather":     open_work[:10],
        "longHaul":    graded[:6],
        "counts":      {"open": len(open_work), "overdue": len(overdue),
                        "dueSoon": len(due_soon),
                        "graded": len(graded), "unmerged": len(walk_home),
                        "courses": len(course_name), "cases": len(shelf),
                        "reserve": len(reserve)},
        "courses":     sorted(course_name.values()),
        "errors":      errors,
    }

    path = os.path.join("windowseat", "data.json")
    os.makedirs("windowseat", exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(out, f, indent=1, ensure_ascii=False)
        f.write("\n")

    print("wrote %s — %d open, %d overdue, %d unmerged, %d courses, "
          "%d cases, %d resources"
          % (path, len(open_work), len(overdue), len(walk_home),
             len(course_name), len(shelf), len(reserve)))
    if errors:
        print("errors (page will show these):", file=sys.stderr)
        for e in errors:
            print("  " + e, file=sys.stderr)
    # Exit 0 even with errors — a partial refresh is better than none, and the
    # errors are visible in data.json. Only a missing token is fatal.
    return 0


if __name__ == "__main__":
    sys.exit(main())
