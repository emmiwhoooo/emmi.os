// Runs inside the claude.ai page. Finds the artifact's frame, pins it over the
// whole page and tucks Claude's own header and side panels away, so the window
// shows only the tracker. Anything Claude layers on top (permission prompts,
// dialogs) is left alone. window.__pelican(false) undoes it all.
(function () {
  if (window.__pelican) { window.__pelican(window.__pelicanWant !== false); return; }
  var STYLE_ID = "pelican-hide", on = true, timer = null;
  // Sign-in widgets and bot checks also live in frames; never mistake one for the tracker.
  var NOT_IT = /google\.|gstatic|recaptcha|hcaptcha|cloudflare|turnstile|arkose|funcaptcha|stripe|appleid|intercom|sentry/i;
  function signedOut() {
    if (document.querySelector('input[type="email"],input[type="password"],input[autocomplete="one-time-code"],input[name="code"]')) return true;
    var b = document.querySelectorAll("button,a"), n = 0;
    for (var i = 0; i < b.length && i < 400; i++) { var t = (b[i].textContent || "").trim().toLowerCase();
      if (/^(continue with (google|email|apple|sso)|log in|sign in|sign up)$/.test(t)) n++; }
    return n > 0;
  }
  function frame() {
    if (signedOut()) return null;
    var pinned = document.querySelector("iframe[data-pelican]"); if (pinned) return pinned;
    var best = null, area = 0, vw = window.innerWidth, vh = window.innerHeight;
    document.querySelectorAll("iframe").forEach(function (f) {
      if (NOT_IT.test(f.src || "") || NOT_IT.test(f.title || "")) return;
      var r = f.getBoundingClientRect(), a = r.width * r.height;
      // the tracker's frame is the big one: most of the window, not a small widget
      if (r.width < vw * 0.5 || r.height < vh * 0.4) return;
      if (a > area) { best = f; area = a; }
    });
    return best;
  }
  function apply() {
    var f = frame(), st = document.getElementById(STYLE_ID);
    if (!on || !f) { if (st) st.remove(); document.documentElement.removeAttribute("data-pelican");
      if (!f) document.querySelectorAll("iframe[data-pelican]").forEach(function (x) { delete x.dataset.pelican; });
      return !!f; }
    f.dataset.pelican = "1";
    if (!st) {
      st = document.createElement("style"); st.id = STYLE_ID;
      st.textContent =
        "html[data-pelican],html[data-pelican] body{background:#2b3440!important;overflow:hidden!important}" +
        "html[data-pelican] iframe[data-pelican]{position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important;max-width:none!important;max-height:none!important;border:0!important;border-radius:0!important;z-index:40!important;background:#2b3440!important}" +
        "html[data-pelican] header,html[data-pelican] nav,html[data-pelican] aside{visibility:hidden!important}";
      document.head.appendChild(st);
    }
    document.documentElement.setAttribute("data-pelican", "1");
    // a transformed ancestor would trap position:fixed inside itself
    for (var p = f.parentElement; p && p !== document.body; p = p.parentElement) {
      var cs = getComputedStyle(p);
      if (cs.transform !== "none" || cs.filter !== "none" || cs.contain !== "none") { p.style.setProperty("transform", "none", "important"); p.style.setProperty("filter", "none", "important"); p.style.setProperty("contain", "none", "important"); }
    }
    return true;
  }
  window.__pelican = function (want) { on = want !== false; window.__pelicanWant = on; return apply(); };
  timer = setInterval(apply, 1500);
  new MutationObserver(function () { apply(); }).observe(document.documentElement, { childList: true, subtree: true });
  apply();
})();
