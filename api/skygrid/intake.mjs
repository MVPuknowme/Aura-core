// Dedicated SKYGRID intake route
// Ensures /api/skygrid/intake resolves without depending on vercel.json rewrites.

const PRODUCT = "SKYGRID Emergency Data On-Ramp";
const VERSION = "2026-06-10-dedicated-intake";

function now() {
  return new Date().toISOString();
}

function json(res, status, payload) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-SKYGRID-Runtime", VERSION);
  res.setHeader("X-SKYGRID-Product", PRODUCT);
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload, null, 2));
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

async function forwardToAws(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Emergency-Call-ID": process.env.SKYGRID_EMERGENCY_CALL_ID || "",
      "X-Partnership-Code": process.env.SKYGRID_PARTNERSHIP_CODE || "",
      "X-SKYGRID-Bridge": "vercel-aura-core-dedicated-intake"
    },
    body: JSON.stringify(payload)
  });

  const text = await response.text();
  let body;
  try { body = JSON.parse(text); } catch { body = { raw: text }; }
  return { status: response.status, ok: response.ok, body };
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    return json(res, 200, {
      ok: true,
      skygrid: PRODUCT,
      aura_core: "AI control layer for Allbridge routing",
      allbridge: "cross-network bridge and failover fabric",
      runtime: "vercel-aura-core",
      version: VERSION,
      route: "/api/skygrid/intake",
      accepts: ["POST"],
      timestamp: now()
    });
  }

  if (req.method !== "POST") {
    return json(res, 405, {
      ok: false,
      error: "method_not_allowed",
      allowed: ["GET", "POST"],
      timestamp: now()
    });
  }

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
    source: body?.source || "postman-autodrill",
    type: body?.type || body?.event_type || body?.need || "system-health",
    decision,
    payload: body
  };

  if (decision.selected === "lambda_router" && process.env.SKYGRID_LAMBDA_ROUTER_URL) {
    try {
      const lambda = await forwardToAws(process.env.SKYGRID_LAMBDA_ROUTER_URL, event);
      return json(res, lambda.ok ? 202 : 502, { accepted: lambda.ok, event, lambda });
    } catch (error) {
      return json(res, 502, { accepted: false, event, lambda: { ok: false, error: String(error?.message || error) } });
    }
  }

  if (process.env.SKYGRID_AWS_INTAKE_URL && process.env.SKYGRID_EMERGENCY_CALL_ID && process.env.SKYGRID_PARTNERSHIP_CODE) {
    try {
      const aws = await forwardToAws(process.env.SKYGRID_AWS_INTAKE_URL, event);
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
