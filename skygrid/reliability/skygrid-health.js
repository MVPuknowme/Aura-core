// SkyGrid Reliability Health Endpoint
// aura-skygrid.protocol — powered by Aura-Core
// Safe to commit: no private keys, no RPC secrets, no wallet credentials.

const DEFAULT_CONFIG_PATH = "config/l2/aura-skygrid.protocol.yaml";

function nowIso() {
  return new Date().toISOString();
}

function buildSkyGridHealth(overrides = {}) {
  const checks = {
    homepage_load: "pending_external_probe",
    navigation_buttons: "pending_browser_test",
    cta_buttons: "pending_browser_test",
    web3_provider_detection: "pending_wallet_runtime",
    websocket_reconnect: "pending_socket_probe",
    l2_rpc_health: "pending_env_rpc_probe",
    offline_cache_load: "pending_service_worker_test",
    mobile_safari: "pending_device_test",
    chrome: "pending_browser_test",
    firefox: "pending_browser_test",
    edge: "pending_browser_test",
    ...overrides.checks,
  };

  const passed = Object.values(checks).filter((value) => value === "pass").length;
  const failed = Object.values(checks).filter((value) => value === "fail").length;
  const total = Object.keys(checks).length;
  const measured = passed + failed;

  return {
    service: "SKYGRID",
    protocol: "aura-skygrid.protocol",
    powered_by: "Aura-Core",
    status: failed > 0 ? "degraded" : measured === total ? "ok" : "measuring",
    timestamp: nowIso(),
    config_path: overrides.configPath || DEFAULT_CONFIG_PATH,
    metrics: {
      uptime_percent: overrides.uptime_percent ?? null,
      deploy_success_percent: overrides.deploy_success_percent ?? null,
      browser_test_pass_rate: measured ? Number(((passed / measured) * 100).toFixed(2)) : null,
      offline_cache_success_rate: overrides.offline_cache_success_rate ?? null,
      websocket_reconnect_count: overrides.websocket_reconnect_count ?? null,
      failover_events: overrides.failover_events ?? 0,
    },
    resilience_targets: [
      "ISP outage fallback",
      "grid/power interruption continuity",
      "L2/Web3 route failover",
      "offline cached site availability",
      "edge/peripheral environment support",
    ],
    supported_routes: [
      "web2_cache",
      "cdn_edge",
      "web3_l2",
      "wifi",
      "ethernet",
      "cellular",
      "lora_meshtastic",
      "mqtt",
      "satellite_candidate",
    ],
    checks,
  };
}

function registerSkyGridHealthEndpoint(app, route = "/skygrid/health") {
  if (!app || typeof app.get !== "function") {
    throw new Error("registerSkyGridHealthEndpoint requires an Express-compatible app with app.get().");
  }

  app.get(route, (_req, res) => {
    res.json(buildSkyGridHealth());
  });
}

module.exports = {
  buildSkyGridHealth,
  registerSkyGridHealthEndpoint,
};
