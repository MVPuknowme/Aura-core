import { createHmac, timingSafeEqual } from "node:crypto";

const PRODUCT = "SKYGRID Emergency Data On-Ramp";
const VERSION = "2026-07-13-hardened-runtime";
const CANONICAL_URL = "https://aura-sky.skygrid-protocol.net";
const MAX_BODY_BYTES = Number(process.env.SKYGRID_MAX_BODY_BYTES || 65536);
const SIGNATURE_TOLERANCE_SECONDS = Number(process.env.SKYGRID_SIGNATURE_TOLERANCE_SECONDS || 300);
const REQUEST_TIMEOUT_MS = Number(process.env.SKYGRID_UPSTREAM_TIMEOUT_MS || 8000);

const now = () => new Date().toISOString();
const routeMap = () => ["/", "/health.json", "/dispatch", "/incidents", "/settings", "/highway", "/scenarios", "/rates", "/base", "/pay", "/dashboard/command-center", "/dashboard/validation-panel", "/dashboard/deployment-review", "/dashboard/receipts", "/api/health", "/api/status", "/api/skygrid/status", "/api/skygrid/intake", "/api/aura-core/decide", "/api/agent/signals", "/api/highway/status", "/api/highway/flasks", "/api/highway/postman", "/api/pay/quote?amount=25", "/api/autodrill/latest", "/api/build-pad/quote", "/api/node-lease/intake", "/api/pacific-heart/ingest", "/api/failover/status", "/api/panels/summary", "/api/stripe/device-link"];

function getPath(req) {
  const host = req.headers.host || "localhost";
  const url = new URL(req.url || "/", `https://${host}`);
  return { url, path: url.pathname };
}

function setHeaders(res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Security-Policy", "default-src 'self'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-SKYGRID-Product", PRODUCT);
  res.setHeader("X-SKYGRID-Runtime", VERSION);
}

function json(res, status, payload) {
  setHeaders(res);
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload, null, 2));
}

function html(res, status, title, body) {
  setHeaders(res);
  res.statusCode = status;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.end(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="canonical" href="${CANONICAL_URL}/"><title>${title}</title><style>:root{color-scheme:dark}body{margin:0;font-family:system-ui;background:#07101f;color:#edf6ff}main{max-width:1040px;margin:auto;padding:42px 20px}.card{border:1px solid #31506f;border-radius:24px;padding:28px;background:#0e1e3a}a{color:#67e8f9}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}.tile{border:1px solid #31506f;border-radius:16px;padding:16px}code{background:#172554;padding:.15rem .35rem;border-radius:.35rem}</style></head><body><main><section class="card">${body}</section></main></body></html>`);
}

function configured() {
  return {
    ingestAuth: Boolean(process.env.SKYGRID_INGEST_SECRET),
    awsStatusUrl: Boolean(process.env.SKYGRID_AWS_STATUS_URL),
    awsIntakeUrl: Boolean(process.env.SKYGRID_AWS_INTAKE_URL),
    lambdaRouterUrl: Boolean(process.env.SKYGRID_LAMBDA_ROUTER_URL),
    emergencyCallId: Boolean(process.env.SKYGRID_EMERGENCY_CALL_ID),
    partnershipCode: Boolean(process.env.SKYGRID_PARTNERSHIP_CODE),
    proofArtifactUrl: Boolean(process.env.SKYGRID_PROOF_ARTIFACT_URL)
  };
}

async function readJsonBody(req) {
  const contentType = String(req.headers["content-type"] || "").split(";")[0].trim().toLowerCase();
  if (contentType !== "application/json") {
    const error = new Error("content_type_must_be_application_json");
    error.statusCode = 415;
    throw error;
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      const error = new Error("payload_too_large");
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return { raw: "", body: {} };
  try {
    const body = JSON.parse(raw);
    if (!body || Array.isArray(body) || typeof body !== "object") throw new Error("invalid_json_object");
    return { raw, body };
  } catch {
    const error = new Error("invalid_json");
    error.statusCode = 400;
    throw error;
  }
}

function verifySignedRequest(req, raw) {
  const secret = process.env.SKYGRID_INGEST_SECRET;
  if (!secret) return { ok: false, status: 503, error: "ingest_auth_not_configured" };
  const timestamp = String(req.headers["x-skygrid-timestamp"] || "");
  const signature = String(req.headers["x-skygrid-signature"] || "").replace(/^sha256=/, "");
  const epoch = Number(timestamp);
  if (!Number.isFinite(epoch) || Math.abs(Date.now() / 1000 - epoch) > SIGNATURE_TOLERANCE_SECONDS) {
    return { ok: false, status: 401, error: "stale_or_invalid_timestamp" };
  }
  const expected = createHmac("sha256", secret).update(`${timestamp}.${raw}`).digest("hex");
  const left = Buffer.from(signature, "hex");
  const right = Buffer.from(expected, "hex");
  if (left.length !== right.length || !timingSafeEqual(left, right)) return { ok: false, status: 401, error: "invalid_signature" };
  return { ok: true };
}

function requireFields(body, fields) {
  return fields.filter((key) => body[key] === undefined || body[key] === null || body[key] === "");
}

function sanitizeEvent(body, path) {
  return {
    eventId: `skygrid_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    receivedAt: now(),
    route: path,
    source: String(body.source || "unknown").slice(0, 120),
    type: String(body.type || body.need || "system-health").slice(0, 120),
    severity: String(body.severity || "normal").slice(0, 40),
    region: body.region ? String(body.region).slice(0, 120) : undefined
  };
}

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const text = await response.text();
    let body;
    try { body = JSON.parse(text); } catch { body = { raw: text.slice(0, 2048) }; }
    return { ok: response.ok, status: response.status, body };
  } finally {
    clearTimeout(timeout);
  }
}

async function healthPayload(path) {
  const cfg = configured();
  let aws = { checked: false, ok: false, reason: "not_configured" };
  if (cfg.awsStatusUrl && cfg.emergencyCallId && cfg.partnershipCode) {
    try {
      const result = await fetchJson(process.env.SKYGRID_AWS_STATUS_URL, { headers: { "X-Emergency-Call-ID": process.env.SKYGRID_EMERGENCY_CALL_ID, "X-Partnership-Code": process.env.SKYGRID_PARTNERSHIP_CODE } });
      aws = { checked: true, ok: result.ok, status: result.status };
    } catch (error) {
      aws = { checked: true, ok: false, error: error.name === "AbortError" ? "timeout" : "upstream_error" };
    }
  }
  const ready = cfg.ingestAuth && aws.ok;
  return { ok: true, process_healthy: true, ready, product: PRODUCT, version: VERSION, mode: "controlled-pilot", sentinel: "fail_closed", route: path, configured: cfg, dependencies: { aws }, routes: routeMap(), timestamp: now() };
}

function failoverStatus() {
  const cfg = configured();
  return { ok: true, product: PRODUCT, mode: "controlled_pilot", sentinel: "fail_closed", failover_state: "blocked", readiness: { ingest_auth_ready: cfg.ingestAuth, aws_persistence_ready: cfg.awsStatusUrl && cfg.awsIntakeUrl && cfg.emergencyCallId && cfg.partnershipCode, health_quorum_ready: false, rollback_ready: false, production_policy_ready: false }, prohibited_actions: ["automatic_wallet_signing", "automatic_transaction_broadcast", "private_data_movement", "device_activation", "production_failover_without_approval"], timestamp: now() };
}

function decision(body = {}) {
  const need = String(body.need || body.type || "system-health").toLowerCase();
  const severity = String(body.severity || "normal").toLowerCase();
  const urgent = ["critical", "high", "sev1", "p1"].includes(severity) || need.includes("outage") || need.includes("emergency");
  return { selected: urgent ? "lambda_router" : "advisory_response", reason: urgent ? "urgent_signal" : "safe_default", advisoryOnly: true };
}

function landing(res) {
  return html(res, 200, "Aura Sky | SKYGRID", `<h1>${PRODUCT}</h1><p>Controlled-pilot proof hub for resilient emergency, outage, responder, system-health, and continuity data routing.</p><div class="grid"><div class="tile"><a href="/health.json">Health</a></div><div class="tile"><a href="/api/failover/status">Failover gate</a></div><div class="tile"><a href="/api/autodrill/latest">Auto-drill evidence</a></div><div class="tile"><a href="/dashboard/command-center">Command Center</a></div></div><p><strong>Production activation remains blocked until authentication, persistence, quorum, rollback, and operator approval are verified.</strong></p>`);
}

function simplePage(res, title, intro) {
  return html(res, 200, title, `<h1>${title}</h1><p>${intro}</p><p><a href="/">Home</a> · <a href="/health.json">Health</a> · <a href="/api/failover/status">Failover</a></p>`);
}

export default async function handler(req, res) {
  const { path, url } = getPath(req);
  try {
    if (req.method === "GET" && path === "/") return landing(res);
    if (req.method === "GET" && ["/health.json", "/api/health", "/api/status", "/api/skygrid/status", "/api/highway/status"].includes(path)) {
      const payload = await healthPayload(path);
      return json(res, 200, payload);
    }
    if (req.method === "GET" && path === "/api/failover/status") return json(res, 200, failoverStatus());
    if (req.method === "GET" && path === "/api/panels/summary") return json(res, 200, { ok: true, product: PRODUCT, health: "/health.json", failover: "/api/failover/status", proof: "/api/autodrill/latest", timestamp: now() });
    if (req.method === "GET" && path === "/api/autodrill/latest") {
      const cfg = configured();
      return json(res, cfg.proofArtifactUrl ? 200 : 424, { ok: cfg.proofArtifactUrl, product: PRODUCT, proof_owner: "postman", result: cfg.proofArtifactUrl ? "artifact_configured" : "proof_artifact_missing", artifact_url_configured: cfg.proofArtifactUrl, synthetic_pass_removed: true, timestamp: now() });
    }
    if (req.method === "GET" && path === "/api/highway/postman") return json(res, 200, { ok: true, product: PRODUCT, collection: "skygrid-autodrill.collection.json", evidence_route: "/api/autodrill/latest", timestamp: now() });
    if (req.method === "GET" && path === "/api/highway/flasks") return json(res, 200, { ok: true, product: PRODUCT, flasks: [{ id: "aws", status: configured().awsStatusUrl ? "configured" : "not_configured" }, { id: "vercel", status: "public_bridge" }, { id: "postman", status: configured().proofArtifactUrl ? "artifact_configured" : "artifact_missing" }], timestamp: now() });

    if (req.method === "GET" && path === "/api/pay/quote") {
      const amount = Number(url.searchParams.get("amount") || "0");
      if (!Number.isFinite(amount) || amount < 0 || amount > 1000000) return json(res, 400, { ok: false, error: "invalid_amount", timestamp: now() });
      return json(res, 200, { ok: true, quoteOnly: true, noPaymentExecuted: true, amount, currency: "USD", timestamp: now() });
    }

    const protectedPostRoutes = ["/api/skygrid/intake", "/intake", "/api/agent/signals", "/api/node-lease/intake", "/api/pacific-heart/ingest"];
    if (req.method === "POST" && [...protectedPostRoutes, "/api/aura-core/decide", "/api/build-pad/quote"].includes(path)) {
      const { raw, body } = await readJsonBody(req);
      if (protectedPostRoutes.includes(path)) {
        const auth = verifySignedRequest(req, raw);
        if (!auth.ok) return json(res, auth.status, { ok: false, error: auth.error, timestamp: now() });
      }
      if (path === "/api/build-pad/quote") {
        const amount = Number(body.amount ?? body.monthlySupportUsd ?? 250);
        if (!Number.isFinite(amount) || amount < 0 || amount > 1000000) return json(res, 400, { ok: false, error: "invalid_amount", timestamp: now() });
        return json(res, 200, { ok: true, mode: "quote_only_review_required", quote_id: `buildpad_${Date.now()}`, noPaymentExecuted: true, amount, timestamp: now() });
      }
      if (path === "/api/aura-core/decide") return json(res, 200, { ok: true, advisoryOnly: true, decision: decision(body), timestamp: now() });
      if (path === "/api/pacific-heart/ingest") {
        const missing = requireFields(body, ["eventId", "source", "patientRef", "incidentType", "severity"]);
        if (missing.length) return json(res, 400, { ok: false, error: "invalid_payload", missing, timestamp: now() });
        return json(res, 202, { ok: true, status: "accepted", mode: "controlled_pilot_sandbox", noDispatch: true, noDiagnosis: true, receipt: { eventId: String(body.eventId).slice(0, 160), priority: ["critical", "high", "sev1", "p1"].includes(String(body.severity).toLowerCase()) ? "urgent_review" : "standard_review" }, timestamp: now() });
      }
      const event = sanitizeEvent(body, path);
      return json(res, 202, { accepted: true, advisoryOnly: true, receipt: event, decision: decision(body), payloadStored: false, payloadEchoed: false });
    }

    if (req.method === "GET" && ["/dispatch", "/incidents", "/settings", "/highway", "/dashboard/command-center", "/dashboard/validation-panel", "/dashboard/deployment-review", "/dashboard/receipts"].includes(path)) return simplePage(res, `SKYGRID ${path.split("/").filter(Boolean).pop().replaceAll("-", " ")}`, "Controlled-pilot route for status, proof, and operator review.");
    if (req.method === "GET" && ["/scenarios", "/rates", "/base"].includes(path)) return json(res, 200, { ok: true, product: PRODUCT, route: path, mode: "demo", timestamp: now() });
    if (req.method === "GET" && path === "/pay") return simplePage(res, "SKYGRID Support Demo", "Quote-only support route. No payment is executed.");
    if (req.method === "GET" && path === "/api/stripe/device-link") return json(res, 501, { ok: false, reason: "legacy_prototype_route_only", timestamp: now() });
    return json(res, 404, { ok: false, error: "route_not_found", path, routes: routeMap(), timestamp: now() });
  } catch (error) {
    const status = Number(error.statusCode || 500);
    return json(res, status, { ok: false, error: status >= 500 ? "internal_error" : error.message, timestamp: now() });
  }
}

export const __test = { readJsonBody, verifySignedRequest, sanitizeEvent, decision, healthPayload };
