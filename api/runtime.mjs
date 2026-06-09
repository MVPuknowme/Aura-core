// SKYGRID Emergency Data On-Ramp public runtime
// Vercel Node function. Advisory / controlled-pilot only.
// Required env when proxying to AWS:
//   SKYGRID_AWS_STATUS_URL
//   SKYGRID_AWS_INTAKE_URL
//   SKYGRID_EMERGENCY_CALL_ID
//   SKYGRID_PARTNERSHIP_CODE

const PRODUCT = "SKYGRID Emergency Data On-Ramp";
const VERSION = "2026-06-09-ramp-dropin";

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
</style>
</head>
<body><main><section class="card">${body}</section></main></body>
</html>`);
}

function routeMap() {
  return [
    "/", "/health.json", "/dispatch", "/highway", "/scenarios", "/rates", "/base", "/pay",
    "/api/skygrid/status", "/api/skygrid/intake", "/api/highway/status",
    "/api/highway/flasks", "/api/highway/postman", "/api/pay/quote?amount=25",
    "/api/stripe/device-link"
  ];
}

function configured() {
  return {
    awsStatusUrl: Boolean(process.env.SKYGRID_AWS_STATUS_URL),
    awsIntakeUrl: Boolean(process.env.SKYGRID_AWS_INTAKE_URL),
    emergencyCallId: Boolean(process.env.SKYGRID_EMERGENCY_CALL_ID),
    partnershipCode: Boolean(process.env.SKYGRID_PARTNERSHIP_CODE)
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

  return {
    status: response.status,
    ok: response.ok,
    body
  };
}

function landing(res) {
  html(res, 200, PRODUCT, `
    <span class="badge">Controlled Pilot Runtime</span>
    <h1>${PRODUCT}</h1>
    <p>Secure public entry point for emergency, outage, responder, system-health, and continuity data.</p>
    <p>This Vercel/Web3 bridge validates public traffic, keeps AWS protected, and surfaces proof routes for Postman Auto-Drill.</p>
    <div class="grid">
      <div class="tile"><strong>Status</strong><br><a href="/api/skygrid/status">/api/skygrid/status</a></div>
      <div class="tile"><strong>Dispatch</strong><br><a href="/dispatch">/dispatch</a></div>
      <div class="tile"><strong>Highway</strong><br><a href="/highway">/highway</a></div>
      <div class="tile"><strong>Health</strong><br><a href="/health.json">/health.json</a></div>
    </div>
  `);
}

export default async function handler(req, res) {
  const { url, path } = getPath(req);

  if (req.method === "GET" && path === "/") return landing(res);

  if (req.method === "GET" && ["/health.json", "/api/skygrid/status", "/api/highway/status"].includes(path)) {
    const base = {
      ok: true,
      product: PRODUCT,
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

  if (req.method === "POST" && ["/api/skygrid/intake", "/intake"].includes(path)) {
    const body = await readBody(req);
    const event = {
      eventId: `skygrid_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      receivedAt: now(),
      product: PRODUCT,
      advisoryOnly: true,
      source: body?.source || "postman-autodrill",
      type: body?.type || "system-health",
      payload: body
    };

    if (process.env.SKYGRID_AWS_INTAKE_URL && process.env.SKYGRID_EMERGENCY_CALL_ID && process.env.SKYGRID_PARTNERSHIP_CODE) {
      try {
        const aws = await forwardToAws(process.env.SKYGRID_AWS_INTAKE_URL, event, "POST");
        return json(res, aws.ok ? 202 : 502, { accepted: aws.ok, event, aws });
      } catch (error) {
        return json(res, 502, { accepted: false, event, aws: { ok: false, error: String(error?.message || error) } });
      }
    }

    return json(res, 202, { accepted: true, event, aws: { proxied: false, reason: "AWS bridge env not fully configured" } });
  }

  if (req.method === "GET" && path === "/dispatch") {
    return html(res, 200, "SKYGRID Dispatch", `
      <span class="badge">Advisory Dispatcher</span>
      <h1>SKYGRID Dispatch</h1>
      <p>Controlled-pilot dispatch page for network status, advisory failover selection, and proof logging.</p>
      <p>API: <code>POST /api/skygrid/intake</code></p>
    `);
  }

  if (req.method === "GET" && path === "/highway") {
    return html(res, 200, "SKYGRID Emergency Highway", `
      <span class="badge">Emergency Highway</span>
      <h1>SKYGRID Emergency Highway</h1>
      <p>Public proof lane for emergency data ramp status, route map, and Postman Auto-Drill validation.</p>
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
      checks: ["status", "health", "intake", "dispatch", "highway"],
      timestamp: now()
    });
  }

  if (req.method === "GET" && ["/scenarios", "/rates", "/base"].includes(path)) {
    return json(res, 200, {
      ok: true,
      product: PRODUCT,
      route: path,
      mode: "demo",
      scenarios: ["outage", "latency-spike", "aws-protected-route", "web3-bridge"],
      timestamp: now()
    });
  }

  if (req.method === "GET" && path === "/pay") {
    return html(res, 200, "SKYGRID Pay Demo", `
      <span class="badge">Prototype Only</span>
      <h1>SKYGRID Pay Demo</h1>
      <p>No active financial services. Quote-only route available at <code>/api/pay/quote?amount=25</code>.</p>
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
    product: PRODUCT,
    error: "Route not found",
    route: path,
    routes: routeMap(),
    timestamp: now()
  });
}
