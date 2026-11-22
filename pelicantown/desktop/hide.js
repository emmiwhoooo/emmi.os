// Runs inside the claude.ai page. Finds the artifact's frame, pins it over the
// whole page and tucks Claude's own header and side panels away, so the window
// shows only the tracker. Anything Claude layers on top (permission prompts,
// dialogs) is left alone. window.__pelican(false) undoes it all.
(function () {
  if (window.__pelican) { window.__pelican(window.__pelicanWant !== false); return; }
  var STYLE_ID = "pelican-hide", on = true, timer = null;
  function frame() {
    var best = null, area = 0;
    document.querySelectorAll("iframe").forEach(function (f) {
      var r = f.getBoundingClientRect(), a = r.width * r.height;
      if (f.dataset.pelican || a > area) { if (f.dataset.pelican) { best = f; area = Infinity; } else if (area !== Infinity) { best = f; area = a; } }
    });
    return area >= 200 * 200 || area === Infinity ? best : null;
  }
  function apply() {
    var f = frame(), st = document.getElementById(STYLE_ID);
    if (!on || !f) { if (st) st.remove(); document.documentElement.removeAttribute("data-pelican"); return !!f; }
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
