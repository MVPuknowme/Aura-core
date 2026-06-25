const BASE_URL = process.env.BASE_URL || process.argv[2] || "https://aura-core-home-e539c0b1.vercel.app";

const results = [];

async function check(name, method, path, body = null, expected = []) {
  const url = `${BASE_URL}${path}`;
  const options = {
    method,
    headers: {}
  };

  if (body) {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }

  try {
    const started = Date.now();
    const res = await fetch(url, options);
    const ms = Date.now() - started;
    let data = null;

    try {
      data = await res.json();
    } catch {
      data = { note: "non-json response" };
    }

    const pass = expected.length === 0 ? res.status < 500 : expected.includes(res.status);

    results.push({
      name,
      method,
      path,
      status: res.status,
      pass,
      ms,
      response: data
    });

    console.log(`${pass ? "✅" : "❌"} ${method} ${path} -> HTTP ${res.status} (${ms}ms)`);
  } catch (error) {
    results.push({
      name,
      method,
      path,
      status: "request_failed",
      pass: false,
      error: error.message
    });
    console.log(`❌ ${method} ${path} -> ${error.message}`);
  }
}

const pacificHeartPayload = {
  eventId: `ph-smoke-${Date.now()}`,
  source: "pacific-heart-sandbox",
  patientRef: "sandbox-patient-001",
  incidentType: "possible-overdose-vs-metabolic-event",
  severity: "high",
  vitals: {
    heartRate: 118,
    spo2: 92
  },
  alerts: [
    "naloxone-history-review",
    "glucose-check-recommended"
  ],
  consent: {
    sandbox: true
  }
};

await check("health", "GET", "/api/health", null, [200]);
await check("status", "GET", "/api/status", null, [200]);
await check("intake_get_method_guard", "GET", "/api/intake", null, [200, 405]);
await check("pacific_heart_get_method_guard", "GET", "/api/pacific-heart/ingest", null, [405]);
await check("pacific_heart_post_accept", "POST", "/api/pacific-heart/ingest", pacificHeartPayload, [202]);

const summary = {
  system: "SKYGRID Emergency Data On-Ramp",
  baseUrl: BASE_URL,
  generatedAt: new Date().toISOString(),
  total: results.length,
  passed: results.filter(r => r.pass).length,
  failed: results.filter(r => !r.pass).length,
  results
};

await import("node:fs/promises").then(fs =>
  fs.writeFile("artifacts/day1-smoke-results.json", JSON.stringify(summary, null, 2))
);

console.log("");
console.log("Saved: artifacts/day1-smoke-results.json");

if (summary.failed > 0) {
  process.exitCode = 1;
}
