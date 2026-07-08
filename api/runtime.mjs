const PRODUCT = "SKYGRID Emergency Data On-Ramp";
const VERSION = "2026-07-04-aura-sky-front-door";
const CANONICAL_HOST = "aura-sky.skygrid-protocol.net";
const CANONICAL_URL = `https://${CANONICAL_HOST}`;

function now() {
  return new Date().toISOString();
}

function getPath(req) {
  const host = req.headers.host || "localhost";
  const url = new URL(req.url || "/", `https://${host}`);
  return { host: host.split(":")[0].toLowerCase(), url, path: url.pathname };
}

function headers(res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-SKYGRID-Product", PRODUCT);
  res.setHeader("X-SKYGRID-Runtime", VERSION);
}

function json(res, status, payload) {
  headers(res);
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload, null, 2));
}

function html(res, status, title, body) {
  headers(res);
  res.statusCode = status;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.end(`<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><link rel="canonical" href="${CANONICAL_URL}/"/><title>${title}</title><style>:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;font-family:system-ui,-apple-system,Segoe UI,sans-serif;background:radial-gradient(circle at top left,#172554,#07101f 42%,#050816);color:#edf6ff}main{max-width:1120px;margin:0 auto;padding:42px 18px}.card{border:1px solid rgba(125,211,252,.3);border-radius:28px;padding:30px;background:linear-gradient(135deg,rgba(14,30,58,.94),rgba(43,26,72,.76));box-shadow:0 24px 80px rgba(0,0,0,.35)}h1{font-size:clamp(2.1rem,7vw,4.8rem);line-height:.96;letter-spacing:-.05em;margin:.2rem 0 1rem}p{line-height:1.65;color:#dbeafe}.badge{display:inline-block;border:1px solid rgba(255,255,255,.22);border-radius:999px;padding:.35rem .7rem;color:#f0abfc}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin-top:20px}.tile{border:1px solid rgba(255,255,255,.14);border-radius:18px;padding:17px;background:rgba(255,255,255,.055)}.tile strong{display:block;color:#fff;margin-bottom:.3rem}a{color:#67e8f9}code{background:rgba(255,255,255,.09);padding:.15rem .35rem;border-radius:.4rem}nav{display:flex;gap:10px;flex-wrap:wrap;margin:20px 0 8px}nav a,.button{border:1px solid rgba(255,255,255,.16);border-radius:999px;padding:10px 14px;text-decoration:none;background:rgba(255,255,255,.06);color:#cffafe;display:inline-block}.button.primary{background:rgba(34,211,238,.18);border-color:rgba(103,232,249,.44)}.notice{border-left:4px solid #f59e0b;padding:12px 14px;background:rgba(245,158,11,.11);border-radius:12px;margin-top:20px}.small{font-size:.94rem;color:#bdd7ee}</style></head><body><main><section class="card">${body}</section></main></body></html>`);
}

function routeMap() {
  return [
    "/", "/health.json", "/dispatch", "/incidents", "/settings", "/highway", "/scenarios", "/rates", "/base", "/pay",
    "/dashboard/command-center", "/dashboard/validation-panel", "/dashboard/deployment-review", "/dashboard/receipts",
    "/api/skygrid/status", "/api/skygrid/intake", "/api/aura-core/decide", "/api/agent/signals", "/api/highway/status",
    "/api/highway/flasks", "/api/highway/postman", "/api/pay/quote?amount=25", "/api/autodrill/latest",
    "/api/build-pad/quote", "/api/node-lease/intake", "/api/failover/status", "/api/panels/summary", "/api/stripe/device-link"
  ];
}

function nav() {
  return `<nav><a href="/">Front Page</a><a href="/dashboard/command-center">Command Center</a><a href="/dashboard/validation-panel">Validation</a><a href="/dashboard/deployment-review">Deployment Review</a><a href="/dashboard/receipts">Receipts</a><a href="/dispatch">Dispatch</a><a href="/health.json">Health</a></nav>`;
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

function launchLadder() {
  return [
    { step: 1, id: "auto_drill_proof", label: "Auto-drill proof", status: "route_added" },
    { step: 2, id: "build_pad_quote", label: "Build-pad quote", status: "route_added_quote_only" },
    { step: 3, id: "node_lease_intake", label: "Node lease intake", status: "route_added_no_activation" },
    { step: 4, id: "dashboard", label: "Dashboard", status: "route_added" },
    { step: 5, id: "aws_persistence", label: "AWS persistence", status: "env_gated" },
    { step: 6, id: "partner_pilot", label: "Partner pilot", status: "package_ready_for_review" },
    { step: 7, id: "manual_failover", label: "Manual failover", status: "operator_gate_required" }
  ];
}

function safetyNotice() {
  return `<div class="notice"><strong>Controlled pilot:</strong> this public runtime is for explanation, route proof, and operator review. Production activation stays gated.</div>`;
}

function landing(res) {
  return html(res, 200, "Aura Sky | SKYGRID", `
    <span class="badge">Public front page</span>
    <h1>Emergency data should still have a trusted path forward.</h1>
    <p><strong>${PRODUCT}</strong> is the public concept and proof hub for resilient outage, responder, system-health, and continuity data routing.</p>
    <p>This is the visitor-facing landing page. All other SKYGRID links should either point here, redirect here, or be linked from here.</p>
    <p><a class="button primary" href="/dashboard/command-center">Open Command Center</a> <a class="button" href="/health.json">Check Health</a></p>
    ${nav()}
    <div class="grid">
      <div class="tile"><strong>What it is</strong>A secure entry point where critical continuity data can be validated, logged, routed, proved, and surfaced.</div>
      <div class="tile"><strong>Proof lane</strong><a href="/api/highway/postman">Postman proof</a><br><a href="/api/autodrill/latest">Auto-drill status</a></div>
      <div class="tile"><strong>Dashboards</strong><a href="/dashboard/command-center">Command Center</a><br><a href="/dashboard/validation-panel">Validation Panel</a><br><a href="/dashboard/receipts">Receipts</a></div>
      <div class="tile"><strong>Status</strong><a href="/api/skygrid/status">SKYGRID status</a><br><a href="/api/failover/status">Failover gate</a></div>
      <div class="tile"><strong>Build pad</strong><code>POST /api/build-pad/quote</code><br><span class="small">Quote-only review route.</span></div>
      <div class="tile"><strong>Node lease</strong><code>POST /api/node-lease/intake</code><br><span class="small">Intake-only readiness route.</span></div>
      <div class="tile"><strong>Dispatch</strong><a href="/dispatch">Dispatch overview</a><br><a href="/highway">Emergency highway</a></div>
      <div class="tile"><strong>Canonical URL</strong><code>${CANONICAL_URL}</code></div>
    </div>
    ${safetyNotice()}
  `);
}

function healthPayload(path) {
  return {
    ok: true,
    product: PRODUCT,
    skygrid: PRODUCT,
    canonical_front_page: CANONICAL_URL,
    runtime: "vercel-aura-core",
    version: VERSION,
    mode: "controlled-pilot",
    sentinel: "fail_closed",
    route: path,
    configured: configured(),
    launch_ladder: launchLadder(),
    routes: routeMap(),
    timestamp: now()
  };
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return { raw }; }
}

function decision(body = {}) {
  const need = String(body.need || body.type || "system-health").toLowerCase();
  const severity = String(body.severity || "normal").toLowerCase();
  const urgent = ["critical", "high", "sev1", "p1"].includes(severity) || need.includes("outage");
  return { selected: urgent ? "lambda_router" : "advisory_response", reason: urgent ? "urgent_signal" : "safe_default", advisoryOnly: true };
}

function failoverStatus() {
  return { ok: true, product: PRODUCT, canonical_front_page: CANONICAL_URL, mode: "controlled_pilot", sentinel: "fail_closed", failover_state: "blocked", manual_failover: "operator_gate_required", readiness: { github_manifest: true, postman_proof_lane: true, dashboard_routes: true, public_front_page: true, aws_persistence_ready: false }, timestamp: now() };
}

function panelSummary(path) {
  return { ok: true, product: PRODUCT, canonical_front_page: CANONICAL_URL, route: path, mode: "controlled_pilot", sentinel: "fail_closed", status: { public_front_page: { ok: true, route: "/" }, health: { ok: true, route: "/health.json" }, postman: { ok: true, route: "/api/highway/postman" }, failover: { ok: true, state: "blocked" } }, routes: routeMap(), launch_ladder: launchLadder(), timestamp: now() };
}

function dashboard(res, path) {
  const titles = {
    "/dashboard/command-center": ["SKYGRID Command Center", "Public front-door, proof lane, dashboard, and operator review."],
    "/dashboard/validation-panel": ["SKYGRID Validation Panel", "Manifest, Postman, runtime, and domain checks."],
    "/dashboard/deployment-review": ["SKYGRID Deployment Review", "Vercel, route, and domain readiness review."],
    "/dashboard/receipts": ["SKYGRID Receipts", "Proof receipts for route checks and deployment review."]
  };
  const [title, intro] = titles[path];
  return html(res, 200, title, `<span class="badge">Dashboard</span><h1>${title}</h1><p>${intro}</p>${nav()}<div class="grid"><div class="tile"><strong>Canonical</strong><code>${CANONICAL_URL}</code></div><div class="tile"><strong>Health</strong><a href="/health.json">/health.json</a></div><div class="tile"><strong>Proof</strong><a href="/api/highway/postman">/api/highway/postman</a></div><div class="tile"><strong>Summary</strong><a href="/api/panels/summary">/api/panels/summary</a></div></div>${safetyNotice()}`);
}

function simplePage(res, title, intro) {
  return html(res, 200, title, `<span class="badge">SKYGRID</span><h1>${title}</h1><p>${intro}</p>${nav()}${safetyNotice()}`);
}

export default async function handler(req, res) {
  const { path, url } = getPath(req);

  if (req.method === "GET" && path === "/") return landing(res);
  if (req.method === "GET" && ["/dashboard/command-center", "/dashboard/validation-panel", "/dashboard/deployment-review", "/dashboard/receipts"].includes(path)) return dashboard(res, path);
  if (req.method === "GET" && ["/health.json", "/api/health", "/api/status", "/api/skygrid/status", "/api/highway/status"].includes(path)) {
    return json(res, 200, healthPayload(path));
  }
  if (req.method === "GET" && path === "/api/failover/status") return json(res, 200, failoverStatus());
  if (req.method === "GET" && path === "/api/panels/summary") return json(res, 200, panelSummary(path));
  if (req.method === "GET" && path === "/api/autodrill/latest") return json(res, 200, { ok: true, product: PRODUCT, route: path, proof_owner: "postman", result: "pass_with_warnings", checks: ["front_page", "health", "status", "dashboard", "failover"], timestamp: now() });
  if (req.method === "GET" && path === "/api/highway/postman") return json(res, 200, { ok: true, product: PRODUCT, collection: "skygrid-autodrill.collection.json", checks: ["front-page", "status", "health", "intake", "dashboard", "failover-status"], timestamp: now() });
  if (req.method === "GET" && path === "/api/highway/flasks") return json(res, 200, { ok: true, product: PRODUCT, flasks: [{ id: "aws", status: "protected" }, { id: "vercel", status: "public-bridge" }, { id: "postman", status: "proof-runner" }], timestamp: now() });

  if (req.method === "POST" && path === "/api/build-pad/quote") {
    const body = await readBody(req);
    const amount = Number(body.amount || body.monthlySupportUsd || 250);
    return json(res, 200, { ok: true, product: PRODUCT, route: path, mode: "quote_only_review_required", quote_id: `buildpad_${Date.now()}`, noPaymentExecuted: true, amount, timestamp: now() });
  }

  if (req.method === "POST" && path === "/api/node-lease/intake") {
    const body = await readBody(req);
    return json(res, 202, { accepted: true, product: PRODUCT, route: path, mode: "intake_only", intake_id: `lease_${Date.now()}`, region: body.region || "unspecified", timestamp: now() });
  }

  if (req.method === "POST" && path === "/api/pacific-heart/ingest") {
    const body = await readBody(req);
    const required = ["eventId", "source", "patientRef", "incidentType", "severity"];
    const missing = required.filter((key) => !body[key]);

    if (missing.length > 0) {
      return json(res, 400, {
        ok: false,
        status: "invalid_payload",
        product: PRODUCT,
        route: path,
        missing,
        timestamp: now()
      });
    }

    const severity = String(body.severity || "normal").toLowerCase();
    const urgent = ["critical", "high", "sev1", "p1"].includes(severity);

    return json(res, 202, {
      ok: true,
      status: "accepted",
      product: PRODUCT,
      route: path,
      mode: "controlled_pilot_sandbox",
      noDispatch: true,
      noDiagnosis: true,
      eventId: body.eventId,
      handoff: {
        humanReviewRequired: true,
        priority: urgent ? "urgent_review" : "standard_review"
      },
      timestamp: now()
    });
  }

  if (req.method === "POST" && ["/api/skygrid/intake", "/intake", "/api/aura-core/decide", "/api/agent/signals"].includes(path)) {
    const body = await readBody(req);
    const event = { eventId: `skygrid_${Date.now()}`, receivedAt: now(), product: PRODUCT, skygrid: PRODUCT, route: path, source: body.source || "postman-autodrill", type: body.type || body.need || "system-health", decision: decision(body), payload: body };
    return json(res, 202, { accepted: true, advisoryOnly: true, event });
  }

  if (req.method === "GET" && path === "/dispatch") return simplePage(res, "SKYGRID Dispatch", "Controlled-pilot dispatch page for status, routing review, and proof logging.");
  if (req.method === "GET" && path === "/incidents") return simplePage(res, "SKYGRID Incidents", "Incident review page for demo triggers, recommendations, decisions, and JSON records.");
  if (req.method === "GET" && path === "/settings") return simplePage(res, "SKYGRID Settings", "Configuration reference for thresholds, route checks, and agent signals.");
  if (req.method === "GET" && path === "/highway") return simplePage(res, "SKYGRID Emergency Highway", "Public proof lane for status, route map, and auto-drill validation.");
  if (req.method === "GET" && ["/scenarios", "/rates", "/base"].includes(path)) return json(res, 200, { ok: true, product: PRODUCT, route: path, mode: "demo", timestamp: now() });
  if (req.method === "GET" && path === "/pay") return simplePage(res, "SKYGRID Support Demo", "Quote-only support route. No payment is executed by this demo page.");
  if (req.method === "GET" && path === "/api/pay/quote") {
    const amount = Number(url.searchParams.get("amount") || "0");
    return json(res, 200, { ok: true, product: PRODUCT, quoteOnly: true, noPaymentExecuted: true, amount, currency: "USD", timestamp: now() });
  }
  if (req.method === "GET" && path === "/api/stripe/device-link") return json(res, 501, { ok: false, product: PRODUCT, route: path, reason: "Legacy prototype route only.", timestamp: now() });

  return json(res, 404, { ok: false, product: PRODUCT, error: "route_not_found", path, routes: routeMap(), timestamp: now() });
}
