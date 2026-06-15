// SKYGRID Emergency Data On-Ramp public runtime
// Vercel Node function. Advisory / controlled-pilot only.
// Required env when proxying to AWS:
//   SKYGRID_AWS_STATUS_URL
//   SKYGRID_AWS_INTAKE_URL
//   SKYGRID_EMERGENCY_CALL_ID
//   SKYGRID_PARTNERSHIP_CODE

const PRODUCT = "SKYGRID Emergency Data On-Ramp";
const VERSION = "2026-06-14-public-demo-routes";

function now() {
  return new Date().toISOString();
}

function getPath(req) {
  const host = req.headers.host || "localhost";
  const url = new URL(req.url || "/", `https://${host}`);
  return { url, path: url.pathname };
}

function noStore(res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-SKYGRID-Runtime", VERSION);
  res.setHeader("X-SKYGRID-Product", PRODUCT);
}

function json(res, status, payload) {
  noStore(res);
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload, null, 2));
}

function html(res, status, title, body) {
  noStore(res);
  res.statusCode = status;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.end(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${title}</title>
<style>
:root { color-scheme: dark; }
body { margin:0; font-family: system-ui, -apple-system, Segoe UI, sans-serif; background:#07101f; color:#edf6ff; }
main { max-width: 940px; margin: 0 auto; padding: 48px 24px; }
.card { border:1px solid rgba(125,211,252,.28); border-radius:22px; padding:28px; background:linear-gradient(135deg,rgba(14,30,58,.92),rgba(43,26,72,.72)); box-shadow:0 24px 80px rgba(0,0,0,.35); }
a { color:#67e8f9; }
code { background:rgba(255,255,255,.08); padding:.15rem .35rem; border-radius:.4rem; }
.badge { display:inline-block; padding:.3rem .6rem; border:1px solid rgba(255,255,255,.22); border-radius:999px; color:#f0abfc; margin-bottom:1rem; }
.grid { display:grid; gap:12px; grid-template-columns: repeat(auto-fit, minmax(210px,1fr)); margin-top:20px; }
.tile { border:1px solid rgba(255,255,255,.13); border-radius:16px; padding:16px; background:rgba(255,255,255,.05); }
.notice { border-left:4px solid #f59e0b; padding:12px 14px; background:rgba(245,158,11,.11); border-radius:12px; margin-top:18px; }
nav { display:flex; flex-wrap:wrap; gap:10px; margin:18px 0 4px; }
nav a { border:1px solid rgba(255,255,255,.14); border-radius:999px; padding:8px 12px; text-decoration:none; background:rgba(255,255,255,.05); }
</style>
</head>
<body><main><section class="card">${body}</section></main></body>
</html>`);
}

function routeMap() {
  return [
    "/", "/health.json", "/dispatch", "/incidents", "/settings", "/highway", "/scenarios", "/rates", "/base", "/pay",
    "/api/skygrid/status", "/api/skygrid/intake", "/api/aura-core/decide", "/api/agent/signals", "/api/highway/status",
    "/api/highway/flasks", "/api/highway/postman", "/api/pay/quote?amount=25",
    "/api/stripe/device-link"
  ];
}

function nav() {
  return `<nav>
    <a href="/">Home</a>
    <a href="/dispatch">Dispatch</a>
    <a href="/scenarios">Scenarios</a>
    <a href="/incidents">Incidents</a>
    <a href="/settings">Settings</a>
    <a href="/health.json">Health</a>
  </nav>`;
}

function safetyCopy() {
  return `<div class="notice"><strong>Advisory / Simulation Mode.</strong> SkyGrid helps evaluate network health and recommend fallback paths. It is not certified emergency infrastructure and does not replace 911, FirstNet, GMDSS, VHF, AIS, EPIRB, or official emergency procedures.</div>`;
}

function configured() {
  return {
    awsStatusUrl: Boolean(process.env.SKYGRID_AWS_STATUS_URL),
    awsIntakeUrl: Boolean(process.env.SKYGRID_AWS_INTAKE_URL),
    emergencyCallId: Boolean(process.env.SKYGRID_EMERGENCY_CALL_ID),
    partnershipCode: Boolean(process.env.SKYGRID_PARTNERSHIP_CODE),
    lambdaRouterUrl: Boolean(process.env.SKYGRID_LAMBDA_ROUTER_URL),
    s3Bucket: Boolean(process.env.SKYGRID_S3_BUCKET)
  };
}

function auraCoreDecision(payload = {}) {
  const need = String(payload.need || payload.type || payload.event_type || "system-health").toLowerCase();
  const severity = String(payload.severity || payload.priority || "normal").toLowerCase();
  const urgent = ["critical", "emergency", "high", "sev1", "p1"].includes(severity) || need.includes("emergency") || need.includes("outage");
  const bridge = Boolean(payload.allbridge || payload.bridge) || need.includes("bridge") || need.includes("failover");
  const archive = Boolean(payload.archive || payload.s3) || need.includes("log") || need.includes("audit") || need.includes("proof");
  const compute = Boolean(payload.lambda || payload.compute) || need.includes("process") || need.includes("route");

  let selected = "advisory_response";
  if (urgent) selected = "lambda_router";
  else if (bridge) selected = "allbridge_failover_advisory";
  else if (compute) selected = "lambda_router";
  else if (archive) selected = "s3_proof_log";

  return {
    selected,
    reason: urgent ? "urgent_or_outage_signal" : bridge ? "bridge_or_failover_need" : compute ? "compute_or_route_need" : archive ? "archive_or_proof_need" : "safe_default",
    options: {
      s3_proof_log: "audit, proof, status history, non-urgent continuity record",
      lambda_router: "urgent outage, emergency, validation, partner routing, compute decision",
      allbridge_failover_advisory: "cross-network bridge, failover fabric, route recommendation",
      advisory_response: "demo, safe default, no external execution"
    },
    advisoryOnly: true
  };
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return { raw };
  }
}

async function forwardToAws(url, payload, method = "POST") {
  const headers = {
    "Content-Type": "application/json",
    "X-Emergency-Call-ID": process.env.SKYGRID_EMERGENCY_CALL_ID || "",
    "X-Partnership-Code": process.env.SKYGRID_PARTNERSHIP_CODE || "",
    "X-SKYGRID-Bridge": "vercel-web3-ramp"
  };

  const response = await fetch(url, {
    method,
    headers,
    body: method === "GET" ? undefined : JSON.stringify(payload)
  });

  const text = await response.text();
  let body;
  try { body = JSON.parse(text); } catch { body = { raw: text }; }

  return { status: response.status, ok: response.ok, body };
}

function landing(res) {
  html(res, 200, PRODUCT, `
    <span class="badge">Controlled Pilot Runtime</span>
    <h1>${PRODUCT}</h1>
    <p>Secure public entry point for emergency, outage, responder, system-health, and continuity data.</p>
    <p>Aura-Core provides advisory option selection for S3 proof logs, Lambda routing, and Allbridge failover fabric.</p>
    ${nav()}
    <div class="grid">
      <div class="tile"><strong>Status</strong><br><a href="/api/skygrid/status">/api/skygrid/status</a></div>
      <div class="tile"><strong>Dispatch</strong><br><a href="/dispatch">/dispatch</a></div>
      <div class="tile"><strong>Scenarios</strong><br><a href="/scenarios">/scenarios</a></div>
      <div class="tile"><strong>Incidents</strong><br><a href="/incidents">/incidents</a></div>
      <div class="tile"><strong>Settings</strong><br><a href="/settings">/settings</a></div>
      <div class="tile"><strong>Health</strong><br><a href="/health.json">/health.json</a></div>
    </div>
    ${safetyCopy()}
  `);
}

export default async function handler(req, res) {
  const { url, path } = getPath(req);

  if (req.method === "GET" && path === "/") return landing(res);

  if (req.method === "GET" && ["/health.json", "/api/skygrid/status", "/api/highway/status"].includes(path)) {
    const base = {
      ok: true,
      skygrid: PRODUCT,
      aura_core: "AI control layer for Allbridge routing",
      allbridge: "cross-network bridge and failover fabric",
      runtime: "vercel-aura-core",
      version: VERSION,
      mode: "controlled-pilot",
      advisoryOnly: true,
      timestamp: now(),
      route: path,
      configured: configured(),
      routes: routeMap()
    };

    if (process.env.SKYGRID_AWS_STATUS_URL && process.env.SKYGRID_EMERGENCY_CALL_ID && process.env.SKYGRID_PARTNERSHIP_CODE) {
      try {
        const aws = await forwardToAws(process.env.SKYGRID_AWS_STATUS_URL, {}, "GET");
        return json(res, aws.ok ? 200 : 502, { ...base, aws });
      } catch (error) {
        return json(res, 502, { ...base, aws: { ok: false, error: String(error?.message || error) } });
      }
    }

    return json(res, 200, { ...base, aws: { proxied: false, reason: "AWS bridge env not fully configured" } });
  }

  if (req.method === "POST" && ["/api/skygrid/intake", "/intake", "/api/aura-core/decide", "/api/agent/signals"].includes(path)) {
    const body = await readBody(req);
    const decision = auraCoreDecision(body);
    const event = {
      eventId: `skygrid_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      receivedAt: now(),
      skygrid: PRODUCT,
      aura_core: "AI control layer for Allbridge routing",
      allbridge: "cross-network bridge and failover fabric",
      runtime: "vercel-aura-core",
      advisoryOnly: true,
      source: body?.source || (path === "/api/agent/signals" ? "agent-signals" : "postman-autodrill"),
      type: body?.type || body?.event_type || body?.need || "system-health",
      decision,
      payload: body
    };

    if (path === "/api/agent/signals") {
      return json(res, 202, {
        accepted: true,
        contract: "/api/agent/signals",
        advisoryOnly: true,
        requiredFields: ["source", "type"],
        optionalFields: ["severity", "latencyMs", "lossPercent", "transport", "region", "scenario"],
        event
      });
    }

    if (decision.selected === "lambda_router" && process.env.SKYGRID_LAMBDA_ROUTER_URL) {
      try {
        const lambda = await forwardToAws(process.env.SKYGRID_LAMBDA_ROUTER_URL, event, "POST");
        return json(res, lambda.ok ? 202 : 502, { accepted: lambda.ok, event, lambda });
      } catch (error) {
        return json(res, 502, { accepted: false, event, lambda: { ok: false, error: String(error?.message || error) } });
      }
    }

    if (process.env.SKYGRID_AWS_INTAKE_URL && process.env.SKYGRID_EMERGENCY_CALL_ID && process.env.SKYGRID_PARTNERSHIP_CODE) {
      try {
        const aws = await forwardToAws(process.env.SKYGRID_AWS_INTAKE_URL, event, "POST");
        return json(res, aws.ok ? 202 : 502, { accepted: aws.ok, event, aws });
      } catch (error) {
        return json(res, 502, { accepted: false, event, aws: { ok: false, error: String(error?.message || error) } });
      }
    }

    return json(res, 202, {
      accepted: true,
      event,
      aws: {
        proxied: false,
        reason: "AWS bridge env not fully configured",
        recommendedNext: decision.selected === "s3_proof_log" ? "configure SKYGRID_S3_BUCKET or SKYGRID_AWS_INTAKE_URL" : "configure SKYGRID_LAMBDA_ROUTER_URL or SKYGRID_AWS_INTAKE_URL"
      }
    });
  }

  if (req.method === "GET" && path === "/dispatch") {
    return html(res, 200, "SKYGRID Dispatch", `
      <span class="badge">Advisory Dispatcher</span>
      <h1>SKYGRID Dispatch</h1>
      <p>Controlled-pilot dispatch page for network status, advisory failover selection, and proof logging.</p>
      ${nav()}
      <div class="grid">
        <div class="tile"><strong>WiFi</strong><br>Real browser-visible path</div>
        <div class="tile"><strong>Cellular</strong><br>Real when browser-visible</div>
        <div class="tile"><strong>LoRa</strong><br>Simulated unless daemon connected</div>
        <div class="tile"><strong>Tor</strong><br>Simulated unless daemon connected</div>
        <div class="tile"><strong>Satellite</strong><br>Simulated unless gateway feed connected</div>
      </div>
      <p>API: <code>POST /api/skygrid/intake</code></p>
      ${safetyCopy()}
    `);
  }

  if (req.method === "GET" && path === "/incidents") {
    return html(res, 200, "SKYGRID Incidents", `
      <span class="badge">Incident Log</span>
      <h1>SKYGRID Incidents</h1>
      <p>Chronological incident review page for demo triggers, recommendations, YES/NO decisions, and exportable JSON records.</p>
      ${nav()}
      <div class="grid">
        <div class="tile"><strong>Current state</strong><br>No local incident store is attached in this public runtime.</div>
        <div class="tile"><strong>Export contract</strong><br><code>{ eventId, receivedAt, type, decision, payload }</code></div>
        <div class="tile"><strong>Next integration</strong><br>Lovable Cloud or local browser fallback.</div>
      </div>
      ${safetyCopy()}
    `);
  }

  if (req.method === "GET" && path === "/settings") {
    return html(res, 200, "SKYGRID Settings", `
      <span class="badge">Demo Configuration</span>
      <h1>SKYGRID Settings</h1>
      <p>Configuration reference for thresholds, ping targets, transport toggles, and the agent signals contract.</p>
      ${nav()}
      <div class="grid">
        <div class="tile"><strong>Latency threshold</strong><br><code>&gt;300ms sustained 5s</code></div>
        <div class="tile"><strong>Loss threshold</strong><br><code>&gt;20%</code></div>
        <div class="tile"><strong>Default targets</strong><br>Oregon, N. Virginia, N. California</div>
        <div class="tile"><strong>Agent contract</strong><br><code>POST /api/agent/signals</code></div>
      </div>
      ${safetyCopy()}
    `);
  }

  if (req.method === "GET" && path === "/highway") {
    return html(res, 200, "SKYGRID Emergency Highway", `
      <span class="badge">Emergency Highway</span>
      <h1>SKYGRID Emergency Highway</h1>
      <p>Public proof lane for emergency data ramp status, route map, and Postman Auto-Drill validation.</p>
      ${nav()}
      <p>Status: <a href="/api/highway/status">/api/highway/status</a></p>
    `);
  }

  if (req.method === "GET" && path === "/api/highway/flasks") {
    return json(res, 200, {
      ok: true,
      product: PRODUCT,
      flasks: [
        { id: "aws", status: "protected" },
        { id: "vercel", status: "public-bridge" },
        { id: "postman", status: "proof-runner" },
        { id: "b12", status: "public-brochure" }
      ],
      timestamp: now()
    });
  }

  if (req.method === "GET" && path === "/api/highway/postman") {
    return json(res, 200, {
      ok: true,
      product: PRODUCT,
      collection: "skygrid-autodrill.collection.json",
      checks: ["status", "health", "intake", "dispatch", "highway", "aura-core-decision", "agent-signals", "incidents", "settings"],
      timestamp: now()
    });
  }

  if (req.method === "GET" && ["/scenarios", "/rates", "/base"].includes(path)) {
    return json(res, 200, {
      ok: true,
      product: PRODUCT,
      route: path,
      mode: "demo",
      scenarios: ["outage", "latency-spike", "aws-protected-route", "web3-bridge", "s3-proof-log", "lambda-router", "marine-dead-in-water"],
      timestamp: now()
    });
  }

  if (req.method === "GET" && path === "/pay") {
    return html(res, 200, "SKYGRID Pay Demo", `
      <span class="badge">Prototype Only</span>
      <h1>SKYGRID Pay Demo</h1>
      <p>No active financial services. Quote-only route available at <code>/api/pay/quote?amount=25</code>.</p>
      ${nav()}
    `);
  }

  if (req.method === "GET" && path === "/api/pay/quote") {
    const amount = Number(url.searchParams.get("amount") || "0");
    return json(res, 200, {
      ok: true,
      product: PRODUCT,
      quoteOnly: true,
      amount,
      currency: "USD",
      infrastructureFeePercent: 3,
      infrastructureFee: Number((amount * 0.03).toFixed(2)),
      estimatedNet: Number((amount * 0.97).toFixed(2)),
      noPaymentExecuted: true,
      timestamp: now()
    });
  }

  if (req.method === "GET" && path === "/api/stripe/device-link") {
    return json(res, 501, {
      ok: false,
      product: PRODUCT,
      route: path,
      reason: "Prototype route only. No payment/device activation enabled.",
      timestamp: now()
    });
  }

  return json(res, 404, {
    ok: false,
    skygrid: PRODUCT,
    aura_core: "AI control layer for Allbridge routing",
    allbridge: "cross-network bridge and failover fabric",
    runtime: "vercel-aura-core",
    error: "route_not_found",
    path,
    routes: routeMap(),
    timestamp: now()
  });
}
