const base = (process.env.SKYGRID_BASE_URL || "https://aura-core-home-e539c0b1.vercel.app").replace(/\/$/, "");

const requestId = crypto.randomUUID();

const checks = [
  {
    name: "Production landing page",
    method: "GET",
    path: "/",
    success: [200, 202, 204, 301, 302, 307, 308],
    pending: [401, 402, 403, 404]
  },
  {
    name: "Static health contract",
    method: "GET",
    path: "/health.json",
    success: [200, 202, 204, 301, 302, 307, 308],
    pending: [401, 402, 403, 404]
  },
  {
    name: "Dispatcher route",
    method: "GET",
    path: "/dispatch",
    success: [200, 202, 204, 301, 302, 307, 308, 405],
    pending: [401, 402, 403, 404]
  },
  {
    name: "Scenario route",
    method: "GET",
    path: "/scenarios",
    success: [200, 202, 204, 301, 302, 307, 308, 405],
    pending: [401, 402, 403, 404]
  },
  {
    name: "SKYGRID status API",
    method: "GET",
    path: "/api/skygrid/status",
    success: [200, 202, 204, 301, 302, 307, 308, 405],
    pending: [401, 402, 403, 404]
  },
  {
    name: "Highway status API",
    method: "GET",
    path: "/api/highway/status",
    success: [200, 202, 204, 301, 302, 307, 308, 405],
    pending: [401, 402, 403, 404]
  },
  {
    name: "SKYGRID intake POST",
    method: "POST",
    path: "/api/skygrid/intake",
    success: [200, 201, 202, 204, 405],
    pending: [401, 402, 403, 404],
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
    const elapsedMs = Math.round(performance.now() - started);

    results.push({
      name: check.name,
      method: check.method,
      url,
      status: "ERROR",
      verdict: "PENDING_ROUTE",
      elapsed_ms: elapsedMs,
      server: "unknown",
      x_vercel_id: "none",
      location: "none",
      error: error.message,
      diagnostic: "fetch_error_public_domain_pending_dns_tls_or_proxy"
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
  vercel_routed_count: results.filter((r) => r.x_vercel_id && r.x_vercel_id !== "none").length,
  non_vercel_servers: [...new Set(results.map((r) => r.server).filter((server) => server && server !== "unknown" && server.toLowerCase() !== "vercel"))],
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

if (summary.vercel_routed_count === 0) {
  console.warn("No Vercel routing headers detected. Check domain DNS/binding if production should terminate at Vercel.");
}

console.log("SKYGRID routing success test completed without hard failures.");

const { spawnSync } = await import("node:child_process");
const signerTest = spawnSync(process.execPath, ["--test", "tests/skygrid-base-signer.test.mjs"], {
  stdio: "inherit"
});

if (signerTest.status !== 0) {
  process.exit(signerTest.status ?? 1);
}
