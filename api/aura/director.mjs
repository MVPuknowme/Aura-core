import { buildDecisionEnvelope, healthEnvelope } from "../../lib/aura-switch-director.mjs";

async function readJsonBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string" && req.body.trim().length > 0) {
    return JSON.parse(req.body);
  }

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString("utf8").trim();
  return text ? JSON.parse(text) : {};
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-SKYGRID-Service", "SKYGRID Emergency Data On-Ramp");
  res.setHeader("X-Aura-Director", "fail-closed");

  if (req.method === "GET") {
    return res.status(200).json(healthEnvelope());
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "method_not_allowed",
      allowed: ["GET", "POST"],
    });
  }

  try {
    const input = await readJsonBody(req);
    const decision = buildDecisionEnvelope(input);
    return res.status(200).json(decision);
  } catch (error) {
    return res.status(400).json({
      ok: false,
      error: "invalid_request",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
