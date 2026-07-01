const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("auraGPT", {
  ask: async (text) => ipcRenderer.invoke("ask-gpt", text),
});
