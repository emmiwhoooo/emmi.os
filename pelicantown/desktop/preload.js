const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("pelican", {
  cfg: () => ipcRenderer.invoke("cfg"),
  win: (what) => ipcRenderer.send("win", what),
  copy: (text) => ipcRenderer.send("copy", text),
  onMax: (fn) => ipcRenderer.on("max", (_e, v) => fn(v))
});
