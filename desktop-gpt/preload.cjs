const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("auraGPT", {
  ask: async (text) => ipcRenderer.invoke("ask-gpt", text),
});

// === AURA PiP Telemetry Bridge ===
try {
  if (!window.auraTelemetry && contextBridge && ipcRenderer) {
    contextBridge.exposeInMainWorld("auraTelemetry", {
      getSnapshot: function () {
        return ipcRenderer.invoke("aura:get-telemetry-snapshot");
      }
    });
  }
} catch (_) {
  // Optional telemetry bridge. Never block Aura startup.
}
// === End AURA PiP Telemetry Bridge ===

// === AURA Live Ping Bridge ===
try {
  if (!window.auraPings && contextBridge && ipcRenderer) {
    contextBridge.exposeInMainWorld("auraPings", {
      getSnapshot: function () {
        return ipcRenderer.invoke("aura:get-live-pings");
      }
    });
  }
} catch (_) {
  // Optional ping bridge. Never block Aura startup.
}
// === End AURA Live Ping Bridge ===
