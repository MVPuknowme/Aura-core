import { buildDecisionEnvelope, healthEnvelope } from "../../lib/aura-switch-director.mjs";

async function readJsonBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string" && req.body.trim().length > 0) return JSON.parse(req.body);

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString("utf8").trim();
  return text ? JSON.parse(text) : {};
}

function applyHeaders(res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-SKYGRID-Service", "SKYGRID Emergency Data On-Ramp");
  res.setHeader("X-Aura-Director", "fail-closed");
  res.setHeader("X-Aura-Call-Circle", "chatbot-aura-skygrid");
}

export default async function handler(req, res) {
  applyHeaders(res);

  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      route: "/api/chatbot/call-circle",
      mode: "chatbot_bridge_decision_only",
      call_circle: ["chatbot", "aura_director", "skygrid_advisory"],
      aura_director: healthEnvelope(),
      guardrails: {
        fail_closed: true,
        execute_forced_false: true,
        no_wallet_signing: true,
        no_transaction_broadcast: true,
        no_private_data_movement: true,
        no_payment_execution: true
      },
      timestamp: new Date().toISOString()
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "method_not_allowed",
      allowed: ["GET", "POST"]
    });
  }

  try {
    const input = await readJsonBody(req);
    const decision = buildDecisionEnvelope({
      ...input,
      source: input.source || "chatbot",
      task: input.task || input.message || input.prompt || "chatbot_call_circle",
      privacy: input.privacy || "normal",
      provider: input.provider || "auto",
      execute: false
    });

    return res.status(200).json({
      ok: true,
      route: "/api/chatbot/call-circle",
      mode: "chatbot_bridge_decision_only",
      call_circle: ["chatbot", "aura_director", "skygrid_advisory"],
      input_summary: {
        source: input.source || "chatbot",
        task: input.task || input.message || input.prompt || "chatbot_call_circle",
        requested_execute_ignored: input.execute === true
      },
      decision,
      guardrails: {
        fail_closed: true,
        execute_forced_false: true,
        no_wallet_signing: true,
        no_transaction_broadcast: true,
        no_private_data_movement: true,
        no_payment_execution: true
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return res.status(400).json({
      ok: false,
      error: "invalid_request",
      message: error instanceof Error ? error.message : String(error)
    });
  }
}
