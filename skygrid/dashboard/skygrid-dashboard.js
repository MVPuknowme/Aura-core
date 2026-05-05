const HEALTH_ENDPOINT = "/skygrid/health";

async function fetchHealth() {
  try {
    const res = await fetch(HEALTH_ENDPOINT, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("Health endpoint unavailable, using demo payload.", err);
    return demoPayload();
  }
}

function demoPayload() {
  return {
    status: "measuring",
    timestamp: new Date().toISOString(),
    metrics: {
      uptime_percent: 99.12,
      deploy_success_percent: 96.4,
      browser_test_pass_rate: 92.3,
      failover_events: 4
    },
    supported_routes: ["web2_cache","cdn_edge","web3_l2","wifi","cellular","lora_meshtastic"],
    checks: {
      chrome: "pass",
      firefox: "pass",
      edge: "pass",
      mobile_safari: "pending",
      websocket_reconnect: "pass",
      offline_cache_load: "pass",
      l2_rpc_health: "pending"
    }
  };
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value ?? "—";
}

function renderStatus(status) {
  const pill = document.getElementById("statusPill");
  if (!pill) return;
  pill.className = `pill ${status}`;
  pill.textContent = status.toUpperCase();
}

function renderRoutes(routes = []) {
  const el = document.getElementById("routes");
  if (!el) return;
  el.innerHTML = "";
  routes.forEach(r => {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = r;
    el.appendChild(chip);
  });
}

function renderChecks(checks = {}) {
  const el = document.getElementById("checks");
  if (!el) return;
  el.innerHTML = "";
  Object.entries(checks).forEach(([k,v]) => {
    const row = document.createElement("div");
    row.className = `check ${v}`;
    row.textContent = `${k}: ${v}`;
    el.appendChild(row);
  });
}

(async function init(){
  const data = await fetchHealth();

  renderStatus(data.status);
  setText("lastUpdated", new Date(data.timestamp).toLocaleString());

  setText("uptime", data.metrics?.uptime_percent ? `${data.metrics.uptime_percent}%` : "—");
  setText("deploySuccess", data.metrics?.deploy_success_percent ? `${data.metrics.deploy_success_percent}%` : "—");
  setText("browserPass", data.metrics?.browser_test_pass_rate ? `${data.metrics.browser_test_pass_rate}%` : "—");
  setText("failoverEvents", data.metrics?.failover_events ?? "—");

  renderRoutes(data.supported_routes);
  renderChecks(data.checks);

  const raw = document.getElementById("rawPayload");
  if (raw) raw.textContent = JSON.stringify(data, null, 2);
})();
