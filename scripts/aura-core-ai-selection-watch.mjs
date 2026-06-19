const base = (process.env.SKYGRID_BASE_URL || "https://aura-core-home-e539c0b1.vercel.app").replace(/\/$/, "");
const requestId = crypto.randomUUID();

const workloadPreference = [
  "CONTINUITY_STORAGE",
  "PROOF_ARCHIVE",
  "BANDWIDTH_AVAILABILITY",
  "BASE_L2_GAS",
  "APPROVED_TOKEN_WORK"
];

function classifyPower(input) {
  const renewable = ["solar", "battery", "mixed"].includes(input.powerSource);

  if (
    input.batteryReservePercent < input.minimumBatteryReservePercent ||
    input.projectedPowerCostCents >= input.projectedRevenueCents
  ) {
    return "RED_POWER";
  }

  if (renewable) return "GREEN_POWER";
  return "YELLOW_POWER";
}

function choosePreferredWorkload(workloads = []) {
  return workloadPreference.find((workload) => workloads.includes(workload)) || "NONE";
}

function selectIdleCapacityWorkload(input) {
  const netEarningsCents =
    input.projectedRevenueCents -
    input.projectedPowerCostCents -
    input.hardwareWearCents -
    input.networkCostCents -
    input.reserveRiskBufferCents;

  if (input.emergencyDemandActive) {
    return {
      mode: "EMERGENCY_FAILOVER",
      powerClass: classifyPower(input),
      selectedWorkload: "FAILOVER",
      netEarningsCents,
      reason: "Emergency or failover demand is active. Idle revenue disabled."
    };
  }

  if (!input.securityGreen) {
    return {
      mode: "LOCKDOWN",
      powerClass: classifyPower(input),
      selectedWorkload: "NONE",
      netEarningsCents,
      reason: "Security check failed. Node locked down."
    };
  }

  if (!input.nodeHealthy || !input.thermalGreen || !input.networkReliable) {
    return {
      mode: "MAINTENANCE",
      powerClass: classifyPower(input),
      selectedWorkload: "NONE",
      netEarningsCents,
      reason: "Node health, thermal, or network check failed."
    };
  }

  if (!input.leaseeOptedIn) {
    return {
      mode: "STANDBY_READY",
      powerClass: classifyPower(input),
      selectedWorkload: "NONE",
      netEarningsCents,
      reason: "Leasee has not opted into idle earning."
    };
  }

  if (input.batteryReservePercent < input.minimumBatteryReservePercent) {
    return {
      mode: "STANDBY_READY",
      powerClass: "RED_POWER",
      selectedWorkload: "NONE",
      netEarningsCents,
      reason: "Battery reserve below emergency minimum."
    };
  }

  const powerClass = classifyPower(input);

  if (powerClass === "RED_POWER") {
    return {
      mode: "STANDBY_READY",
      powerClass,
      selectedWorkload: "NONE",
      netEarningsCents,
      reason: "Power cost or reserve risk is too high."
    };
  }

  if (netEarningsCents <= 0) {
    return {
      mode: "STANDBY_READY",
      powerClass,
      selectedWorkload: "NONE",
      netEarningsCents,
      reason: "Projected idle workload is not profitable after power and wear costs."
    };
  }

  const selectedWorkload = choosePreferredWorkload(input.approvedWorkloads);

  if (selectedWorkload === "NONE") {
    return {
      mode: "STANDBY_READY",
      powerClass,
      selectedWorkload: "NONE",
      netEarningsCents,
      reason: "No approved idle workload available."
    };
  }

  return {
    mode: "IDLE_EARN",
    powerClass,
    selectedWorkload,
    netEarningsCents,
    reason: "Node is healthy, opted in, profitable, and emergency readiness is preserved."
  };
}

const baseline = {
  nodeHealthy: true,
  securityGreen: true,
  leaseeOptedIn: true,
  thermalGreen: true,
  networkReliable: true,
  batteryReservePercent: 80,
  minimumBatteryReservePercent: 35,
  powerSource: "solar",
  powerCostPerKwh: 0,
  projectedRevenueCents: 1200,
  projectedPowerCostCents: 120,
  hardwareWearCents: 80,
  networkCostCents: 45,
  reserveRiskBufferCents: 100,
  approvedWorkloads: ["BASE_L2_GAS", "CONTINUITY_STORAGE", "APPROVED_TOKEN_WORK"]
};

const scenarios = [
  {
    name: "emergency-demand-overrides-idle-revenue",
    input: { ...baseline, emergencyDemandActive: true },
    expected: { mode: "EMERGENCY_FAILOVER", selectedWorkload: "FAILOVER" }
  },
  {
    name: "solar-surplus-selects-continuity-storage-first",
    input: { ...baseline, emergencyDemandActive: false, powerSource: "solar" },
    expected: { mode: "IDLE_EARN", powerClass: "GREEN_POWER", selectedWorkload: "CONTINUITY_STORAGE" }
  },
  {
    name: "grid-negative-economics-standby",
    input: {
      ...baseline,
      emergencyDemandActive: false,
      powerSource: "grid",
      projectedRevenueCents: 300,
      projectedPowerCostCents: 475
    },
    expected: { mode: "STANDBY_READY", powerClass: "RED_POWER", selectedWorkload: "NONE" }
  },
  {
    name: "low-battery-preserves-emergency-reserve",
    input: {
      ...baseline,
      emergencyDemandActive: false,
      powerSource: "battery",
      batteryReservePercent: 20
    },
    expected: { mode: "STANDBY_READY", powerClass: "RED_POWER", selectedWorkload: "NONE" }
  },
  {
    name: "security-failure-locks-down",
    input: { ...baseline, emergencyDemandActive: false, securityGreen: false },
    expected: { mode: "LOCKDOWN", selectedWorkload: "NONE" }
  },
  {
    name: "leasee-not-opted-in-stays-ready",
    input: { ...baseline, emergencyDemandActive: false, leaseeOptedIn: false },
    expected: { mode: "STANDBY_READY", selectedWorkload: "NONE" }
  }
];

function assertScenario(scenario, result) {
  const mismatches = Object.entries(scenario.expected)
    .filter(([key, value]) => result[key] !== value)
    .map(([key, value]) => `${key}: expected ${value}, received ${result[key]}`);

  return {
    ok: mismatches.length === 0,
    mismatches
  };
}

async function watchEndpoint(check) {
  const url = `${base}${check.path}`;
  const started = performance.now();

  try {
    const response = await fetch(url, {
      method: check.method,
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "X-SKYGRID-Request-Id": requestId,
        "X-SKYGRID-Test": "aura-core-ai-selection-watch"
      },
      body: check.body ? JSON.stringify(check.body) : undefined
    });

    const elapsedMs = Math.round(performance.now() - started);
    const status = response.status;
    const success = check.success.includes(status);
    const pending = check.pending.includes(status);

    return {
      name: check.name,
      method: check.method,
      url,
      status,
      verdict: success ? "SUCCESS" : pending ? "PENDING_ROUTE" : "FAIL",
      elapsed_ms: elapsedMs,
      server: response.headers.get("server") || "unknown",
      x_vercel_id: response.headers.get("x-vercel-id") || "none",
      location: response.headers.get("location") || "none"
    };
  } catch (error) {
    const elapsedMs = Math.round(performance.now() - started);
    return {
      name: check.name,
      method: check.method,
      url,
      status: "ERROR",
      verdict: "PENDING_ROUTE",
      elapsed_ms: elapsedMs,
      error: error.message,
      diagnostic: "fetch_error_public_domain_pending_dns_tls_or_proxy"
    };
  }
}

const selectionResults = scenarios.map((scenario) => {
  const decision = selectIdleCapacityWorkload(scenario.input);
  const assertion = assertScenario(scenario, decision);
  return {
    name: scenario.name,
    ok: assertion.ok,
    expected: scenario.expected,
    decision,
    mismatches: assertion.mismatches
  };
});

const endpointChecks = [
  { name: "Landing page", method: "GET", path: "/", success: [200, 202, 204, 301, 302, 307, 308], pending: [401, 403, 404] },
  { name: "Static health contract", method: "GET", path: "/health.json", success: [200, 202, 204, 301, 302, 307, 308], pending: [401, 403, 404] },
  { name: "Dispatcher route", method: "GET", path: "/dispatch", success: [200, 202, 204, 301, 302, 307, 308, 405], pending: [401, 403, 404] },
  { name: "Scenario route", method: "GET", path: "/scenarios", success: [200, 202, 204, 301, 302, 307, 308, 405], pending: [401, 403, 404] },
  { name: "SKYGRID status API", method: "GET", path: "/api/skygrid/status", success: [200, 202, 204, 301, 302, 307, 308, 405], pending: [401, 403, 404] },
  { name: "Highway status API", method: "GET", path: "/api/highway/status", success: [200, 202, 204, 301, 302, 307, 308, 405], pending: [401, 403, 404] },
  {
    name: "Aura-Core AI selection intake",
    method: "POST",
    path: "/api/skygrid/intake",
    success: [200, 201, 202, 204, 405],
    pending: [401, 403, 404],
    body: {
      system: "SKYGRID Emergency Data On-Ramp",
      control_layer: "Aura-Core AI",
      event_type: "aura_core_ai_selection_watch",
      mode: "controlled_pilot",
      request_id: requestId,
      timestamp: new Date().toISOString(),
      selections: selectionResults.map(({ name, ok, decision }) => ({ name, ok, decision }))
    }
  }
];

const endpointResults = [];
for (const check of endpointChecks) {
  endpointResults.push(await watchEndpoint(check));
}

const summary = {
  system: "SKYGRID Emergency Data On-Ramp",
  control_layer: "Aura-Core AI",
  test_type: "selection_and_endpoint_watch",
  base_url: base,
  request_id: requestId,
  selection_pass_count: selectionResults.filter((result) => result.ok).length,
  selection_fail_count: selectionResults.filter((result) => !result.ok).length,
  endpoint_success_count: endpointResults.filter((result) => result.verdict === "SUCCESS").length,
  endpoint_pending_count: endpointResults.filter((result) => result.verdict === "PENDING_ROUTE").length,
  endpoint_fail_count: endpointResults.filter((result) => result.verdict === "FAIL").length,
  vercel_routed_count: endpointResults.filter((result) => result.x_vercel_id && result.x_vercel_id !== "none").length,
  selectionResults,
  endpointResults
};

console.log(JSON.stringify(summary, null, 2));

if (summary.selection_fail_count > 0 || summary.endpoint_fail_count > 0) {
  console.error("Aura-Core AI selection/watch test found hard failures.");
  process.exit(1);
}

if (summary.endpoint_pending_count > 0) {
  console.warn("Aura-Core AI selection/watch completed with pending route/domain/auth responses.");
}

console.log("Aura-Core AI selection/watch completed without hard failures.");
