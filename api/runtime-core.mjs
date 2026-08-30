import { readFileSync } from "node:fs";
import path from "node:path";
import {
  createCapacityAgreementPacket,
  createCapacityOffer
} from "../cloudflare/skygrid-edge-worker/src/capacity-lease.js";
import { capacityLeasePage } from "../cloudflare/skygrid-edge-worker/src/lease-page.js";
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

function rawHtml(res, status, content) {
  headers(res);
  res.statusCode = status;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.end(content);
}

function routeMap() {
  return [
    "/", "/lease", "/health.json", "/dispatch", "/incidents", "/settings", "/highway", "/scenarios", "/rates", "/base", "/pay",
    "/dashboard/command-center", "/dashboard/validation-panel", "/dashboard/deployment-review", "/dashboard/receipts",
    "/api/skygrid/status", "/api/skygrid/intake", "/api/skygrid/opensea-preflight", "/api/skygrid/etherscan-read", "/api/aura-core/decide", "/api/agent/signals", "/api/highway/status",
    "/api/highway/flasks", "/api/highway/postman", "/api/pay/quote?amount=25", "/api/autodrill/latest",
    "/api/build-pad/quote", "/api/node-lease/intake", "/api/node-lease/preflight", "/api/node-lease/agreements", "/api/failover/status", "/api/panels/summary", "/api/stripe/device-link"
  ];
}

function nav() {
  return `<nav><a href="/">Front Page</a><a href="/lease">Capacity Lease</a><a href="/dashboard/command-center">Command Center</a><a href="/dashboard/validation-panel">Validation</a><a href="/dashboard/deployment-review">Deployment Review</a><a href="/dashboard/receipts">Receipts</a><a href="/dispatch">Dispatch</a><a href="/health.json">Health</a></nav>`;
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
      <div class="tile"><strong>Capacity lease</strong><a href="/lease">Evaluate resources and review the pilot agreement</a><br><span class="small">PNPK preflight and owner-approval workflow.</span></div>
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

async function callEdgeLeaseApi(pathname, body) {
  const configuredBase = String(process.env.SKYGRID_EDGE_LEASE_URL || "").trim();
  if (!configuredBase) return null;

  try {
    const target = new URL(pathname, `${configuredBase.replace(/\/$/, "")}/`);
    const response = await fetch(target, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "user-agent": "SKYGRID-Vercel-Lease-Proxy/1.0"
      },
      body: JSON.stringify(body)
    });
    let payload;
    try {
      payload = await response.json();
    } catch {
      payload = { ok: false, reason: "edge_lease_response_invalid" };
    }
    return { status: response.status, payload };
  } catch (error) {
    console.error("Capacity lease edge request failed", error);
    return {
      status: 503,
      payload: {
        ok: false,
        reason: "edge_lease_unavailable",
        sentinel: "fail_closed"
      }
    };
  }
}

function normalizeRoutingInput(body = {}) {
  const event = body.event && typeof body.event === "object" ? body.event : {};
  const payload = body.payload && typeof body.payload === "object" ? body.payload : {};

  const value = (field) =>
    body[field] ??
    event[field] ??
    payload[field] ??
    event.payload?.[field] ??
    null;

  return {
    route_type: value("route_type"),
    requested_ramp: value("requested_ramp"),
    requested_node: value("requested_node"),
    requested_transport: value("requested_transport"),
    owner_approval: value("owner_approval") === true,
    emergency_operator_approval:
      value("emergency_operator_approval") === true,
    wallet_signing_requested:
      value("wallet_signing_requested") === true,
    transaction_broadcast_requested:
      value("transaction_broadcast_requested") === true,
    payment_execution_requested:
      value("payment_execution_requested") === true,
    production_failover_requested:
      value("production_failover_requested") === true,
    private_data_movement_requested:
      value("private_data_movement_requested") === true,
    disk_partition_requested: value("disk_partition_requested") === true,
    volume_shrink_requested: value("volume_shrink_requested") === true,
    partition_delete_requested: value("partition_delete_requested") === true,
    system_or_boot_disk_requested:
      value("system_or_boot_disk_requested") === true,
    gpu_enrollment_requested: value("gpu_enrollment_requested") === true,
    bridge_execution_requested: value("bridge_execution_requested") === true,
    program_deployment_requested: value("program_deployment_requested") === true,
    os_network_switching_requested:
      value("os_network_switching_requested") === true,
    interface_reconfiguration_requested:
      value("interface_reconfiguration_requested") === true
  };
}

function loadPnpkPolicy() {
  const policyPath = path.resolve(
    process.cwd(),
    "bridge",
    "skygrid-emergency-onramp.pnpk"
  );

  return JSON.parse(readFileSync(policyPath, "utf8"));
}

function decision(body = {}) {
  const input = normalizeRoutingInput(body);
  const policy = loadPnpkPolicy();
  const mode = policy.mode || "controlled_pilot";
  const sentinel = policy.sentinel || "fail_closed";

  const reject = (reason) => ({
    ok: false,
    http_status: 403,
    mode,
    sentinel,
    reason
  });

  const prohibitedActions = [
    ["wallet_signing_requested", "wallet_signing_prohibited"],
    ["transaction_broadcast_requested", "transaction_broadcast_prohibited"],
    ["payment_execution_requested", "payment_execution_prohibited"],
    ["production_failover_requested", "production_failover_prohibited"],
    ["private_data_movement_requested", "private_data_movement_prohibited"],
    ["disk_partition_requested", "disk_partition_execution_prohibited"],
    ["volume_shrink_requested", "volume_shrink_prohibited"],
    ["partition_delete_requested", "partition_delete_prohibited"],
    ["system_or_boot_disk_requested", "system_or_boot_disk_prohibited"],
    ["gpu_enrollment_requested", "gpu_enrollment_without_activation_prohibited"],
    ["bridge_execution_requested", "bridge_execution_prohibited"],
    ["program_deployment_requested", "program_deployment_prohibited"],
    ["os_network_switching_requested", "os_network_switching_prohibited"],
    ["interface_reconfiguration_requested", "interface_reconfiguration_prohibited"]
  ];

  for (const [field, reason] of prohibitedActions) {
    if (input[field]) return reject(reason);
  }

  if (
    !input.route_type ||
    !input.requested_ramp ||
    !input.requested_node
  ) {
    return {
      ok: false,
      http_status: 400,
      mode,
      sentinel,
      reason: "missing_routing_fields"
    };
  }

  const partition = policy.partitions?.[input.route_type];

  if (!partition) {
    return reject("unknown_partition");
  }

  if (!partition.allowed_ramps?.includes(input.requested_ramp)) {
    return reject("unapproved_ramp");
  }

  if (!partition.allowed_nodes?.includes(input.requested_node)) {
    return reject("unapproved_node");
  }

  if (
    partition.allowed_transports &&
    !partition.allowed_transports.includes(input.requested_transport)
  ) {
    return reject("unapproved_transport");
  }

  const approvalGate = policy.dual_approval_gate;
  const approvalRequired =
    approvalGate?.enabled === true &&
    approvalGate.applies_to?.includes(input.route_type);

  if (approvalRequired && !input.owner_approval) {
    return reject("owner_approval_required");
  }

  if (approvalRequired && !input.emergency_operator_approval) {
    return reject("emergency_operator_approval_required");
  }

  return {
    ok: true,
    http_status: 202,
    selected_partition: input.route_type,
    selected_ramp: input.requested_ramp,
    selected_node_group: input.requested_node,
    selected_transport: input.requested_transport || null,
    mode: partition.mode || mode,
    sentinel: partition.sentinel || sentinel,
    reason: "partition_route_approved"
  };
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
  if (req.method === "GET" && path === "/lease") {
    return rawHtml(res, 200, capacityLeasePage({ apiBase: "/api/node-lease" }));
  }
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

  if (req.method === "POST" && ["/api/node-lease/intake", "/api/node-lease/preflight"].includes(path)) {
    const body = await readBody(req);
    const edge = await callEdgeLeaseApi("edge/lease/preflight", body);
    if (edge) return json(res, edge.status, edge.payload);

    const result = await createCapacityOffer(body);
    return json(res, 201, {
      ok: true,
      accepted: true,
      product: PRODUCT,
      route: path,
      mode: "controlled_pilot",
      persistence: "stateless_vercel_fallback",
      offer: result.offer,
      agreement_token: result.agreementToken,
      warning: "Set SKYGRID_EDGE_LEASE_URL to persist offers and agreements in Cloudflare D1.",
      timestamp: now()
    });
  }

  if (req.method === "POST" && path === "/api/node-lease/agreements") {
    const body = await readBody(req);
    const edge = await callEdgeLeaseApi("edge/lease/agreements", body);
    if (edge) return json(res, edge.status, edge.payload);

    const packet = await createCapacityAgreementPacket(body.offer, body);
    if (!packet.ok) return json(res, packet.status, packet);
    return json(res, 202, {
      ok: true,
      product: PRODUCT,
      persistence: "stateless_vercel_receipt",
      agreement: packet.agreement,
      receipt: {
        offer_id: packet.agreement.offer_id,
        status: "owner_accepted_pending_operator",
        agreement_version: packet.agreement.agreement_version,
        receipt_hash: packet.receiptHash,
        accepted_at: packet.acceptedAt,
        execution_allowed: false
      },
      warning: "This receipt is downloadable but not durably stored until SKYGRID_EDGE_LEASE_URL is configured."
    });
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
    const routeDecision = decision(body);
    const status = routeDecision.http_status || (routeDecision.ok ? 202 : 403);

    const event = {
      eventId: `skygrid_${Date.now()}`,
      receivedAt: now(),
      product: PRODUCT,
      skygrid: {
        product: PRODUCT,
        mode: routeDecision.mode,
        sentinel: routeDecision.sentinel,
        training: body.training === true
      },
      route: path,
      source: body.source || "postman-autodrill",
      type:
        body.type ||
        body.need ||
        body.route_type ||
        body.event?.route_type ||
        body.payload?.route_type ||
        "system-health",
      decision: routeDecision,
      payload: body
    };

    return json(res, status, {
      accepted: routeDecision.ok === true,
      advisoryOnly: true,
      event
    });
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
