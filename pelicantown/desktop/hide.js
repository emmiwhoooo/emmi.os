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
      if (r.width < vw * 0.4 || r.height < vh * 0.3) return;
      if (a > area) { best = f; area = a; }
    });
    return best;
  }
  var DIALOG = '[role="dialog"],[role="alertdialog"],[aria-modal="true"],[role="menu"],[role="listbox"]';
  function isDialog(el) { try { return el.matches(DIALOG) || !!el.querySelector(DIALOG); } catch (e) { return false; } }
  function clear() {
    var st = document.getElementById(STYLE_ID); if (st) st.remove();
    document.documentElement.removeAttribute("data-pelican");
    document.querySelectorAll("[data-pelican-hide]").forEach(function (x) { x.removeAttribute("data-pelican-hide"); });
    document.querySelectorAll("[data-pelican-up]").forEach(function (x) { x.removeAttribute("data-pelican-up"); });
  }
  function apply() {
    var f = frame();
    if (!on || !f) { clear(); if (!f) document.querySelectorAll("iframe[data-pelican]").forEach(function (x) { delete x.dataset.pelican; }); return !!f; }
    f.dataset.pelican = "1";
    if (!document.getElementById(STYLE_ID)) {
      var st = document.createElement("style"); st.id = STYLE_ID;
      st.textContent =
        "html[data-pelican],html[data-pelican] body{background:#2b3440!important;overflow:hidden!important}" +
        // everything that isn't on the path to the tracker disappears, whatever layer it's on
        "html[data-pelican] [data-pelican-hide]{visibility:hidden!important;pointer-events:none!important}" +
        // the path itself can't trap or clip the pinned frame
        "html[data-pelican] [data-pelican-up]{transform:none!important;filter:none!important;backdrop-filter:none!important;perspective:none!important;contain:none!important;container-type:normal!important;will-change:auto!important;clip-path:none!important;overflow:visible!important;visibility:visible!important;opacity:1!important}" +
        "html[data-pelican] iframe[data-pelican]{position:fixed!important;inset:0!important;top:0!important;left:0!important;width:100vw!important;height:100vh!important;max-width:none!important;max-height:none!important;min-height:0!important;margin:0!important;border:0!important;border-radius:0!important;z-index:2147483000!important;background:#2b3440!important;visibility:visible!important;opacity:1!important;transform:none!important}";
      document.head.appendChild(st);
    }
    document.documentElement.setAttribute("data-pelican", "1");
    for (var el = f; el && el !== document.documentElement; el = el.parentElement) {
      if (el !== f) el.setAttribute("data-pelican-up", "1");
      var p = el.parentElement; if (!p) break;
      for (var i = 0; i < p.children.length; i++) { var sib = p.children[i];
        if (sib === el || /^(SCRIPT|STYLE|LINK|META|HEAD)$/.test(sib.tagName)) continue;
        // prompts Claude layers on top (permission dialogs, menus) stay usable
        if (isDialog(sib)) { sib.removeAttribute("data-pelican-hide"); continue; }
        sib.setAttribute("data-pelican-hide", "1");
      }
    }
    return true;
  }
  window.__pelican = function (want) { on = want !== false; window.__pelicanWant = on; return apply(); };
  timer = setInterval(apply, 1500);
  new MutationObserver(function () { apply(); }).observe(document.documentElement, { childList: true, subtree: true });
  apply();
})();
