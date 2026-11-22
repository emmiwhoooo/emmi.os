// Pelican Town: valley.log in its own window.
// A frameless window draws our own wooden title bar (shell.html); the tracker
// itself is the claude.ai artifact, loaded in a <webview> that keeps its own
// signed-in session. hide.js runs inside that page and lets only the tracker show.
const { app, BrowserWindow, ipcMain, shell, session, clipboard } = require("electron");
const path = require("path");
const fs = require("fs");

const TRACKER = "https://claude.ai/artifact/XxfCjmZADHq3QWu9DbMPre#valley";
// Some sign-in pages refuse anything that says "Electron" in its user agent.
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

let win;
function create() {
  win = new BrowserWindow({
    width: 480, height: 900, minWidth: 380, minHeight: 560,
    frame: false, backgroundColor: "#4a2814", show: false,
    icon: path.join(__dirname, "icon.png"),
    webPreferences: { preload: path.join(__dirname, "preload.js"), webviewTag: true, contextIsolation: true }
  });
  win.loadFile("shell.html");
  win.once("ready-to-show", () => win.show());
  win.on("maximize", () => win.webContents.send("max", true));
  win.on("unmaximize", () => win.webContents.send("max", false));
}

app.whenReady().then(() => {
  session.fromPartition("persist:pelican").setUserAgent(UA);
  create();
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) create(); });
});
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });

// The tracker's wiki links (and anything else that wants a new window) open in the real browser.
app.on("web-contents-created", (_e, wc) => {
  wc.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\/(accounts\.google\.com|appleid\.apple\.com|claude\.ai|[a-z0-9.-]*anthropic\.com)\//i.test(url)) return { action: "allow" };
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });
});

ipcMain.on("copy", (_e, text) => clipboard.writeText(String(text).slice(0, 200000)));
ipcMain.handle("cfg", () => ({ url: TRACKER, version: app.getVersion(), hide: fs.readFileSync(path.join(__dirname, "hide.js"), "utf8") }));
ipcMain.on("win", (_e, what) => {
  if (!win) return;
  if (what === "min") win.minimize();
  else if (what === "max") win.isMaximized() ? win.unmaximize() : win.maximize();
  else if (what === "close") win.close();
});
