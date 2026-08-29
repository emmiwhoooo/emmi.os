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
from datetime import date, datetime, timezone

TOKEN = os.environ.get("NOTION_TOKEN", "").strip()
API = "https://api.notion.com/v1"
VERSION = "2022-06-28"          # long-stable; do not chase the newest header

DB = {
    "classes":    "8ee2ec9a-796b-4bdd-a1ed-287177f1a100",   # Class Notes v6
    "assignments":"0c795daa-579d-460e-845e-4d53afcc1290",   # Assignments v6
    "cases":      "cfca3b5f-1ce2-48b2-a879-966edfe610c9",   # Case Bank v6
    "courses":    "c1977d28-e2e1-4125-8ddb-2a38a9d23b41",   # courses
    "resources":  "a52c8648-160e-43a1-9d88-302664a48bd4",   # Resources v6
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


def day_only(s):
    return (s or "")[:10]


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
                     filter={"property": "Status", "select": {"equals": "not merged"}},
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

    # ---- the shelf — recent cases, rule/holding lives on the page itself ----
    shelf = []
    for row in query("cases", page_size=8,
                     sorts=[{"timestamp": "created_time", "direction": "descending"}]):
        p = row["properties"]
        shelf.append({"title": title_of(p), "course": course_of(p), "url": row.get("url")})

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

    d = date.today()
    week = max(1, min(TERM_WEEKS, ((d - TERM_START).days // 7) + 1))

    out = {
        "generated":   datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "today":       today,
        "term":        {"week": week, "of": TERM_WEEKS,
                        "start": TERM_START.isoformat(), "end": TERM_END.isoformat(),
                        "daysToFinals": (TERM_END - d).days},
        "next":        sessions[0] if sessions else None,
        "upcoming":    sessions[:6],
        "walkHome":    walk_home[:10],
        "shelf":       shelf,
        "reserve":     reserve,
        "weather":     open_work[:10],
        "longHaul":    graded[:6],
        "counts":      {"open": len(open_work), "overdue": len(overdue),
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
