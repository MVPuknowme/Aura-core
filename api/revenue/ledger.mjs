import { ledgerSchema, summarizeLedger } from "../../lib/verified-revenue-ledger.mjs";

const PRODUCT = "SKYGRID Emergency Data On-Ramp";

function applyHeaders(res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("X-SKYGRID-Product", PRODUCT);
  res.setHeader("X-SKYGRID-Ledger", "verified-infrastructure-revenue");
}

function send(res, status, payload) {
  applyHeaders(res);
  res.statusCode = status;
  res.end(JSON.stringify(payload, null, 2));
}

async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  return JSON.parse(raw);
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    return send(res, 200, {
      ok: true,
      route: "/api/revenue/ledger",
      mode: "controlled_pilot",
      persistence: "request_scoped",
      schema: ledgerSchema(),
      safeguards: {
        no_wallet_signing: true,
        no_transaction_broadcast: true,
        no_payment_execution: true
      },
      timestamp: new Date().toISOString()
    });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return send(res, 405, {
      ok: false,
      error: "method_not_allowed",
      allowed: ["GET", "POST"]
    });
  }

  try {
    const body = await readBody(req);
    const result = summarizeLedger(body.records || []);
    return send(res, 200, {
      ...result,
      route: "/api/revenue/ledger",
      mode: "controlled_pilot",
      persistence: "request_scoped",
      warning: "This endpoint calculates and validates submitted records but does not persist them. Connect an approved ledger store before production use."
    });
  } catch (error) {
    return send(res, 400, {
      ok: false,
      error: "invalid_ledger_payload",
      message: error instanceof Error ? error.message : String(error),
      schema: ledgerSchema(),
      timestamp: new Date().toISOString()
    });
  }
}
