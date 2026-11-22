const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("pelican", {
  cfg: () => ipcRenderer.invoke("cfg"),
  win: (what) => ipcRenderer.send("win", what),
  onMax: (fn) => ipcRenderer.on("max", (_e, v) => fn(v))
});
