// SKYGRID Emergency Data On-Ramp public runtime
// Vercel Node function. Advisory / controlled-pilot only.
// Required env when proxying to AWS:
//   SKYGRID_AWS_STATUS_URL
//   SKYGRID_AWS_INTAKE_URL
//   SKYGRID_EMERGENCY_CALL_ID
//   SKYGRID_PARTNERSHIP_CODE

const PRODUCT = "SKYGRID Emergency Data On-Ramp";
const VERSION = "2026-06-15-business-launch-ladder";

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
main { max-width: 1040px; margin: 0 auto; padding: 48px 24px; }
.card { border:1px solid rgba(125,211,252,.28); border-radius:22px; padding:28px; background:linear-gradient(135deg,rgba(14,30,58,.92),rgba(43,26,72,.72)); box-shadow:0 24px 80px rgba(0,0,0,.35); }
a { color:#67e8f9; }
code { background:rgba(255,255,255,.08); padding:.15rem .35rem; border-radius:.4rem; }
.badge { display:inline-block; padding:.3rem .6rem; border:1px solid rgba(255,255,255,.22); border-radius:999px; color:#f0abfc; margin-bottom:1rem; }
.grid { display:grid; gap:12px; grid-template-columns: repeat(auto-fit, minmax(220px,1fr)); margin-top:20px; }
.tile { border:1px solid rgba(255,255,255,.13); border-radius:16px; padding:16px; background:rgba(255,255,255,.05); }
.notice { border-left:4px solid #f59e0b; padding:12px 14px; background:rgba(245,158,11,.11); border-radius:12px; margin-top:18px; }
nav { display:flex; flex-wrap:wrap; gap:10px; margin:18px 0 4px; }
nav a { border:1px solid rgba(255,255,255,.14); border-radius:999px; padding:8px 12px; text-decoration:none; background:rgba(255,255,255,.05); }
ul { line-height:1.65; }
</style>
</head>
<body><main><section class="card">${body}</section></main></body>
</html>`);
}

function routeMap() {
  return [
    "/", "/health.json", "/dispatch", "/incidents", "/settings", "/highway", "/scenarios", "/rates", "/base", "/pay",
    "/dashboard/command-center", "/dashboard/validation-panel", "/dashboard/deployment-review", "/dashboard/receipts",
    "/api/skygrid/status", "/api/skygrid/intake", "/api/aura-core/decide", "/api/agent/signals", "/api/highway/status",
    "/api/highway/flasks", "/api/highway/postman", "/api/pay/quote?amount=25", "/api/autodrill/latest",
    "/api/build-pad/quote", "/api/node-lease/intake", "/api/failover/status", "/api/stripe/device-link"
  ];
}

function nav() {
  return `<nav>
    <a href="/">Home</a>
    <a href="/dashboard/command-center">Command Center</a>
    <a href="/dashboard/validation-panel">Validation</a>
    <a href="/dashboard/deployment-review">Deployment Review</a>
    <a href="/dashboard/receipts">Receipts</a>
    <a href="/dispatch">Dispatch</a>
    <a href="/health.json">Health</a>
  </nav>`;
}

function safetyCopy() {
  return `<div class="notice"><strong>Advisory / Simulation Mode.</strong> SKYGRID helps evaluate network health and recommend fallback paths. It is not certified emergency infrastructure and does not replace 911, FirstNet, GMDSS, VHF, AIS, EPIRB, or official emergency procedures. Web3 wallet actions are explicit approval-only steps.</div>`;
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
    { step: 7, id: "manual_failover", label: "Manual failover", status: "blocked_until_operator_gate" },
    { step: 8, id: "limited_production_failover", label: "Limited production failover", status: "blocked_until_health_quorum" },
    { step: 9, id: "full_automated_failover", label: "Full automated failover", status: "blocked_until_certified_policy" }
  ];
}

function failoverStatus() {
  const cfg = configured();
  const awsReady = cfg.awsStatusUrl && cfg.awsIntakeUrl && cfg.emergencyCallId && cfg.partnershipCode;
  return {
    ok: true,
    product: PRODUCT,
    mode: "controlled_pilot",
    failover_state: "blocked",
    manual_failover: "operator_gate_required",
    limited_production_failover: "blocked_until_health_quorum_and_aws_persistence",
    full_automated_failover: "blocked_until_certified_policy_rollback_and_operator_approval",
    readiness: {
      github_manifest: true,
      postman_proof_lane: true,
      dashboard_routes: true,
      aws_persistence_ready: awsReady,
      health_quorum_ready: false,
      rollback_ready: false,
      production_policy_ready: false
    },
    prohibited_actions: ["automatic_wallet_signing", "automatic_transaction_broadcast", "private_data_movement", "device_activation", "production_failover_without_approval"],
    timestamp: now()
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
    <p>AI build system for emergency data ramps, crypto validation nodes, and neighborhood compute infrastructure.</p>
    <p>Aura-Core provides advisory option selection for proof logs, Lambda routing, Web3 build-pad quotes, and fail-closed operator review.</p>
    ${nav()}
    <div class="grid">
      <div class="tile"><strong>Command Center</strong><br><a href="/dashboard/command-center">/dashboard/command-center</a></div>
      <div class="tile"><strong>Auto-Drill</strong><br><a href="/api/autodrill/latest">/api/autodrill/latest</a></div>
      <div class="tile"><strong>Build Pad</strong><br><code>POST /api/build-pad/quote</code></div>
      <div class="tile"><strong>Node Lease</strong><br><code>POST /api/node-lease/intake</code></div>
      <div class="tile"><strong>Failover</strong><br><a href="/api/failover/status">/api/failover/status</a></div>
      <div class="tile"><strong>Health</strong><br><a href="/health.json">/health.json</a></div>
    </div>
    ${safetyCopy()}
  `);
}

function dashboardPage(res, path) {
  const pages = {
    "/dashboard/command-center": {
      title: "SKYGRID Command Center",
      badge: "Business Launch Command Center",
      intro: "Dashboard-first control surface for SKYGRID build, validation, operator review, and route proof.",
      tiles: [
        ["System Status", "Controlled pilot online with fail-closed policy."],
        ["Launch Ladder", "Auto-drill, build-pad quote, node lease intake, dashboard, AWS persistence, partner pilot, failover gates."],
        ["Business Packages", "Node Readiness Assessment, Auto-Drill Proof Pack, Partner Pilot."],
        ["Proof Lane", "Postman/Newman validates current routes and reports drift."],
        ["Web3 Lane", "Wallet actions are explicit approval-only steps."],
        ["Next API", "POST /api/build-pad/quote"]
      ]
    },
    "/dashboard/validation-panel": {
      title: "SKYGRID Validation Panel",
      badge: "Dry-Run Validation",
      intro: "Validation checklist for linting, route proof, manifest sync, Helm review, Kubernetes dry-run, and Web3 safety gates.",
      tiles: [
        ["Manifest Sync", "pnpm run manifest:sync"],
        ["Postman Proof", "GET /api/highway/postman"],
        ["Runtime Syntax", "node --check api/runtime.mjs"],
        ["AWS Bridge", "Env-gated status/intake URLs."],
        ["No Hidden Execution", "No wallet signing or transaction broadcast."],
        ["Failover", "Blocked until health quorum and operator approval."]
      ]
    },
    "/dashboard/deployment-review": {
      title: "SKYGRID Deployment Review",
      badge: "Artifact Review",
      intro: "Reviewable deployment artifacts, Helm/YAML placeholders, L2 JavaScript preparation, and operator approval checklist.",
      tiles: [
        ["Generated Artifacts", "Review area for Helm/YAML/JS build-pad output."],
        ["Operator Checklist", "Confirm scope, region, cost assumptions, and route need."],
        ["Execution State", "No deployment, wallet signing, or transaction submission has occurred."],
        ["Build Pad", "Use POST /api/build-pad/quote for review-only estimates."],
        ["Node Lease", "Use POST /api/node-lease/intake for capability intake."],
        ["Rollback", "Required before production failover can unlock."]
      ]
    },
    "/dashboard/receipts": {
      title: "SKYGRID Receipts",
      badge: "Proof Receipts",
      intro: "Receipt placeholders for Postman run IDs, Vercel deployment IDs, AWS relay confirmations, and future user-approved Web3 references.",
      tiles: [
        ["Postman Run", "Pending external Newman/Postman report artifact."],
        ["Vercel Deployment", "Captured by Vercel project deployment metadata."],
        ["AWS Relay", "Pending configured persistence backend."],
        ["Web3 Proof", "Only after explicit wallet approval."],
        ["Auto-Drill", "GET /api/autodrill/latest"],
        ["Failover Status", "GET /api/failover/status"]
      ]
    }
  };

  const page = pages[path];
  return html(res, 200, page.title, `
    <span class="badge">${page.badge}</span>
    <h1>${page.title}</h1>
    <p>${page.intro}</p>
    ${nav()}
    <div class="grid">
      ${page.tiles.map(([title, text]) => `<div class="tile"><strong>${title}</strong><br>${text}</div>`).join("")}
    </div>
    ${safetyCopy()}
  `);
}

function quoteBuildPad(body = {}) {
  const nodeType = String(body.node_type || body.nodeType || "emergency-data-ramp");
  const region = String(body.region || "oregon-central");
  const monthlySupportUsd = Number(body.monthly_support_usd || body.monthlySupportUsd || 250);
  const hardwareUsd = Number(body.hardware_usd || body.hardwareUsd || 1200);
  const connectivityUsd = Number(body.connectivity_usd || body.connectivityUsd || 75);
  const energyUsd = Number(body.energy_usd || body.energyUsd || 60);
  const setupReserveUsd = Number(body.setup_reserve_usd || body.setupReserveUsd || 300);
  const estimatedFirstMonthCostUsd = hardwareUsd + connectivityUsd + energyUsd + setupReserveUsd;
  const estimatedMonthlyOperatingUsd = connectivityUsd + energyUsd;
  const estimatedMonthlyNetPotentialUsd = monthlySupportUsd - estimatedMonthlyOperatingUsd;

  return {
    ok: true,
    product: PRODUCT,
    route: "/api/build-pad/quote",
    mode: "quote_only_review_required",
    quote_id: `buildpad_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    node_type: nodeType,
    region,
    assumptions: {
      monthly_support_usd: monthlySupportUsd,
      hardware_usd: hardwareUsd,
      connectivity_usd: connectivityUsd,
      energy_usd: energyUsd,
      setup_reserve_usd: setupReserveUsd
    },
    estimates: {
      estimated_first_month_cost_usd: Number(estimatedFirstMonthCostUsd.toFixed(2)),
      estimated_monthly_operating_usd: Number(estimatedMonthlyOperatingUsd.toFixed(2)),
      estimated_monthly_net_potential_usd: Number(estimatedMonthlyNetPotentialUsd.toFixed(2))
    },
    safety: {
      revenue_potential_not_guaranteed: true,
      no_wallet_signing: true,
      no_transaction_broadcast: true,
      no_private_keys_stored: true,
      operator_review_required: true
    },
    next_steps: ["review site capability", "confirm power/connectivity", "run auto-drill proof", "prepare operator-approved Web3 wallet action only if needed"],
    timestamp: now()
  };
}

function nodeLeaseIntake(body = {}) {
  const capabilities = {
    space: Boolean(body.space || body.has_space),
    power: Boolean(body.power || body.has_power),
    internet: Boolean(body.internet || body.has_internet),
    backup_power: Boolean(body.backup_power || body.solar || body.battery),
    compute: Boolean(body.compute || body.server || body.hardware)
  };
  const score = Object.values(capabilities).filter(Boolean).length * 20;
  const recommendedRole = score >= 80 ? "candidate_edge_node" : score >= 60 ? "candidate_relay_node" : score >= 40 ? "readiness_assessment_needed" : "not_ready_continue_intake";

  return {
    accepted: true,
    product: PRODUCT,
    route: "/api/node-lease/intake",
    mode: "intake_only_no_activation",
    intake_id: `lease_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    site: {
      region: body.region || "unspecified",
      site_type: body.site_type || body.siteType || "unspecified",
      contact_preference: body.contact_preference || body.contactPreference || "unspecified"
    },
    capabilities,
    readiness_score: score,
    recommended_role: recommendedRole,
    safety: {
      no_device_activation: true,
      no_private_data_movement: true,
      no_production_failover: true,
      lease_quote_required_before_commitment: true
    },
    timestamp: now()
  };
}

export default async function handler(req, res) {
  const { url, path } = getPath(req);

  if (req.method === "GET" && path === "/") return landing(res);

  if (req.method === "GET" && ["/dashboard/command-center", "/dashboard/validation-panel", "/dashboard/deployment-review", "/dashboard/receipts"].includes(path)) {
    return dashboardPage(res, path);
  }

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
      launch_ladder: launchLadder(),
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

  if (req.method === "GET" && path === "/api/autodrill/latest") {
    return json(res, 200, {
      ok: true,
      product: PRODUCT,
      route: path,
      drill_id: `drill_${Date.now()}`,
      mode: "latest_synthetic_until_newman_artifact_attached",
      proof_owner: "postman",
      checks: ["health", "status", "intake", "dashboard", "quote_guard", "failover_blocked"],
      result: "pass_with_warnings",
      warnings: ["External Newman artifact not attached in runtime yet", "AWS persistence env gated"],
      fail_closed: true,
      timestamp: now()
    });
  }

  if (req.method === "GET" && path === "/api/failover/status") {
    return json(res, 200, failoverStatus());
  }

  if (req.method === "POST" && path === "/api/build-pad/quote") {
    const body = await readBody(req);
    return json(res, 200, quoteBuildPad(body));
  }

  if (req.method === "POST" && path === "/api/node-lease/intake") {
    const body = await readBody(req);
    return json(res, 202, nodeLeaseIntake(body));
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
      control_plane: "postman",
      checks: ["status", "health", "intake", "dispatch", "highway", "dashboard", "build-pad-quote", "node-lease-intake", "failover-status"],
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
    return html(res, 200, "SKYGRID Support Demo", `
      <span class="badge">Quote Only</span>
      <h1>SKYGRID Support Demo</h1>
      <p>No hidden financial execution. Quote-only route available at <code>/api/pay/quote?amount=25</code>.</p>
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
      reason: "Legacy prototype route only. No payment/device activation enabled.",
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
