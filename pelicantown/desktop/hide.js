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
  // every frame on the page, including ones tucked inside shadow roots
  function allFrames(root, out) {
    out = out || [];
    var nodes = root.querySelectorAll("*");
    for (var i = 0; i < nodes.length; i++) { var n = nodes[i];
      if (n.tagName === "IFRAME") out.push(n);
      if (n.shadowRoot) allFrames(n.shadowRoot, out); }
    return out;
  }
  function candidate() {
    var best = null, area = 0, vw = window.innerWidth, vh = window.innerHeight;
    allFrames(document).forEach(function (f) {
      if (NOT_IT.test(f.src || "") || NOT_IT.test(f.title || "")) return;
      var r = f.getBoundingClientRect(), a = r.width * r.height;
      // the tracker's frame is the big one, not a small widget
      if (r.width < vw * 0.4 || r.height < vh * 0.3) return;
      if (a > area) { best = f; area = a; }
    });
    return best;
  }
  function foreign(f) { try { return !!f.src && new URL(f.src, location.href).host !== location.host; } catch (e) { return false; } }
  function frame() {
    var pinned = document.querySelector("iframe[data-pelican]"); if (pinned && pinned.isConnected) return pinned;
    var c = candidate();
    // a big frame served from another site is the tracker; only without one do sign-in clues count
    if (c && foreign(c)) return c;
    if (signedOut()) return null;
    return c;
  }
  // a description of the page for debugging: structure and sizes only, no page text
  window.__pelicanDiag = function () {
    function box(el) { var r = el.getBoundingClientRect(), cs = getComputedStyle(el);
      return { tag: el.tagName.toLowerCase(), id: el.id || undefined, cls: String(el.className && el.className.baseVal != null ? el.className.baseVal : el.className || "").slice(0, 80) || undefined, role: el.getAttribute("role") || undefined,
        rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)], pos: cs.position !== "static" ? cs.position : undefined, z: cs.zIndex !== "auto" ? cs.zIndex : undefined, vis: cs.visibility !== "visible" ? cs.visibility : undefined,
        hide: el.hasAttribute("data-pelican-hide") || undefined, up: el.hasAttribute("data-pelican-up") || undefined, shadow: el.shadowRoot ? true : undefined }; }
    function tree(el, depth) { var o = box(el); if (depth > 0) { var kids = []; for (var i = 0; i < el.children.length && i < 14; i++) { var k = el.children[i]; if (/^(SCRIPT|STYLE|LINK|META|NOSCRIPT)$/.test(k.tagName)) continue; var r = k.getBoundingClientRect(); if (r.width * r.height < 40) continue; kids.push(tree(k, depth - 1)); } if (kids.length) o.kids = kids; } return o; }
    var f = frame(), path = [];
    for (var el = f; el && el !== document.documentElement; el = el.parentElement || (el.getRootNode && el.getRootNode().host)) path.push(box(el));
    // whatever is drawn across the top of the window right now
    var top = []; [10, 30, 60].forEach(function (y) { [20, window.innerWidth / 2, window.innerWidth - 20].forEach(function (x) { var e = document.elementFromPoint(x, y); if (e) { var b = box(e); b.at = [Math.round(x), y]; top.push(b); } }); });
    return JSON.stringify({ v: "1.3.0", url: location.pathname, win: [window.innerWidth, window.innerHeight], on: on, signedOut: signedOut(), marked: document.documentElement.hasAttribute("data-pelican"), cssLive: getComputedStyle(document.documentElement).getPropertyValue("--pelican-css").trim() || "no",
      frames: allFrames(document).map(function (x) { var b = box(x); try { b.host = new URL(x.src, location.href).host; } catch (e) {} b.title = (x.title || "").slice(0, 40) || undefined; b.inShadow = x.getRootNode() !== document || undefined; return b; }),
      chosen: f ? box(f) : null, path: path, top: top, body: tree(document.body, 4) });
  };
  var DIALOG = '[role="dialog"],[role="alertdialog"],[aria-modal="true"],[role="menu"],[role="listbox"]';
  // only the pop-up itself is spared: a bar that merely contains one is still hidden, and the
  // pop-up inside it is made visible again by the stylesheet below
  function isDialog(el) { try { return el.matches(DIALOG); } catch (e) { return false; } }
  var PIN = [["position","fixed"],["top","0"],["left","0"],["right","0"],["bottom","0"],["width","100vw"],["height","100vh"],["max-width","none"],["max-height","none"],["margin","0"],["border","0"],["border-radius","0"],["z-index","2147483000"],["visibility","visible"],["opacity","1"],["transform","none"]];
  var UP = [["transform","none"],["filter","none"],["backdrop-filter","none"],["perspective","none"],["contain","none"],["container-type","normal"],["will-change","auto"],["clip-path","none"],["overflow","visible"],["visibility","visible"],["opacity","1"],["z-index","2147483000"]];
  function unstyle(el, list) { list.forEach(function (kv) { el.style.removeProperty(kv[0]); }); }
  function clear() {
    document.querySelectorAll("[data-pelican-inline]").forEach(function (x) { x.style.removeProperty("visibility"); delete x.dataset.pelicanInline; });
    document.querySelectorAll("[data-pelican-up]").forEach(function (x) { unstyle(x, UP); });
    document.querySelectorAll("iframe[data-pelican]").forEach(function (x) { unstyle(x, PIN); });
    document.documentElement.removeAttribute("data-pelican");
    document.querySelectorAll("[data-pelican-hide]").forEach(function (x) { x.removeAttribute("data-pelican-hide"); });
    document.querySelectorAll("[data-pelican-up]").forEach(function (x) { x.removeAttribute("data-pelican-up"); });
  }
  function apply() {
    var f = frame();
    if (!on || !f) { clear(); if (!f) document.querySelectorAll("iframe[data-pelican]").forEach(function (x) { delete x.dataset.pelican; }); return !!f; }
    f.dataset.pelican = "1";
    // The styles themselves live in hide.css and are added by the app (webview.insertCSS),
    // because the page's own security policy blocks <style> tags added from here.
    // As a second line of defence the important ones are also set directly on the elements.
    document.documentElement.setAttribute("data-pelican", "1");
    for (var el = f; el && el !== document.documentElement; el = el.parentElement || (el.getRootNode && el.getRootNode().host)) {
      if (el !== f) { el.setAttribute("data-pelican-up", "1"); UP.forEach(function (kv) { el.style.setProperty(kv[0], kv[1], "important"); }); }
      var p = el.parentElement; if (!p) continue;
      for (var i = 0; i < p.children.length; i++) { var sib = p.children[i];
        if (sib === el || /^(SCRIPT|STYLE|LINK|META|HEAD)$/.test(sib.tagName)) continue;
        // prompts Claude layers on top (permission dialogs, menus) stay usable
        if (isDialog(sib)) { sib.removeAttribute("data-pelican-hide"); continue; }
        sib.setAttribute("data-pelican-hide", "1");
        if (!sib.querySelector(DIALOG)) { sib.style.setProperty("visibility", "hidden", "important"); sib.dataset.pelicanInline = "1"; }
      }
    }
    PIN.forEach(function (kv) { f.style.setProperty(kv[0], kv[1], "important"); });
    return true;
  }
  window.__pelican = function (want) { on = want !== false; window.__pelicanWant = on; return apply(); };
  timer = setInterval(apply, 1500);
  new MutationObserver(function () { apply(); }).observe(document.documentElement, { childList: true, subtree: true });
  apply();
})();
