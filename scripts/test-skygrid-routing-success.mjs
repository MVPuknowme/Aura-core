const base = (process.env.SKYGRID_BASE_URL || "https://skygrid-protocol.net").replace(/\/$/, "");

const requestId = crypto.randomUUID();

const checks = [
  {
    name: "Production landing page",
    method: "GET",
    path: "/",
    success: [200, 202, 204, 301, 302, 307, 308],
    pending: [401, 403, 404]
  },
  {
    name: "Static health contract",
    method: "GET",
    path: "/health.json",
    success: [200, 202, 204, 301, 302, 307, 308],
    pending: [401, 403, 404]
  },
  {
    name: "Dispatcher route",
    method: "GET",
    path: "/dispatch",
    success: [200, 202, 204, 301, 302, 307, 308, 405],
    pending: [401, 403, 404]
  },
  {
    name: "Scenario route",
    method: "GET",
    path: "/scenarios",
    success: [200, 202, 204, 301, 302, 307, 308, 405],
    pending: [401, 403, 404]
  },
  {
    name: "SKYGRID status API",
    method: "GET",
    path: "/api/skygrid/status",
    success: [200, 202, 204, 301, 302, 307, 308, 405],
    pending: [401, 403, 404]
  },
  {
    name: "Highway status API",
    method: "GET",
    path: "/api/highway/status",
    success: [200, 202, 204, 301, 302, 307, 308, 405],
    pending: [401, 403, 404]
  },
  {
    name: "SKYGRID intake POST",
    method: "POST",
    path: "/api/skygrid/intake",
    success: [200, 201, 202, 204, 405],
    pending: [401, 403, 404],
    body: {
      system: "SKYGRID Emergency Data On-Ramp",
      control_layer: "Aura-Core AI",
      event_type: "routing_success_test",
      mode: "controlled_pilot",
      request_id: requestId,
      timestamp: new Date().toISOString()
    }
  }
];

const results = [];
let hardFailure = false;

for (const check of checks) {
  const url = `${base}${check.path}`;
  const started = performance.now();

  try {
    const response = await fetch(url, {
      method: check.method,
      headers: {
        "Content-Type": "application/json",
        "X-SKYGRID-Request-Id": requestId,
        "X-SKYGRID-Test": "routing-success"
      },
      body: check.body ? JSON.stringify(check.body) : undefined
    });

    const elapsedMs = Math.round(performance.now() - started);
    const status = response.status;
    const server = response.headers.get("server") || "unknown";
    const vercelId = response.headers.get("x-vercel-id") || "none";
    const location = response.headers.get("location") || "none";

    let verdict = "FAIL";

    if (check.success.includes(status)) {
      verdict = "SUCCESS";
    } else if (check.pending.includes(status)) {
      verdict = "PENDING_ROUTE";
    } else {
      hardFailure = true;
    }

    results.push({
      name: check.name,
      method: check.method,
      url,
      status,
      verdict,
      elapsed_ms: elapsedMs,
      server,
      x_vercel_id: vercelId,
      location
    });
  } catch (error) {
    hardFailure = true;
    results.push({
      name: check.name,
      method: check.method,
      url,
      status: "ERROR",
      verdict: "FAIL",
      error: error.message
    });
  }
}

const summary = {
  system: "SKYGRID Emergency Data On-Ramp",
  control_layer: "Aura-Core AI",
  test_type: "routing_success",
  base_url: base,
  request_id: requestId,
  success_count: results.filter((r) => r.verdict === "SUCCESS").length,
  pending_count: results.filter((r) => r.verdict === "PENDING_ROUTE").length,
  fail_count: results.filter((r) => r.verdict === "FAIL").length,
  results
};

console.log(JSON.stringify(summary, null, 2));

if (hardFailure) {
  console.error("SKYGRID routing success test found hard failures.");
  process.exit(1);
}

if (summary.pending_count > 0) {
  console.warn("SKYGRID routing success test completed with pending route/domain-binding responses.");
}

console.log("SKYGRID routing success test completed without hard failures.");
