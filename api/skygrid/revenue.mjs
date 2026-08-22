import {
  SKYGRID_REVENUE_LEDGER_ENUMS,
  summarizeRevenueLedger
} from "../../lib/skygrid-revenue-ledger.mjs";

const PRODUCT = "SKYGRID Emergency Data On-Ramp";
const ROUTE = "/api/skygrid/revenue";

function applyHeaders(res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-SKYGRID-Product", PRODUCT);
  res.setHeader("X-SKYGRID-Accounting", "evidence-first-fail-closed");
}

function respond(res, status, body) {
  return res.status(status).json({
    ...body,
    product: PRODUCT,
    route: ROUTE,
    timestamp: new Date().toISOString()
  });
}

export default async function handler(req, res) {
  applyHeaders(res);

  if (req.method === "GET") {
    return respond(res, 200, {
      ok: true,
      mode: "contract",
      ledger: summarizeRevenueLedger([]),
      accepted_values: SKYGRID_REVENUE_LEDGER_ENUMS,
      note: "GET exposes the accounting contract only. Submit records with POST for stateless verification and aggregation. No wallet signing or transaction execution occurs."
    });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return respond(res, 405, {
      ok: false,
      error: "method_not_allowed",
      allowed: ["GET", "POST"]
    });
  }

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const records = body.records;

  if (!Array.isArray(records)) {
    return respond(res, 400, {
      ok: false,
      error: "records_array_required"
    });
  }

  if (records.length > 1000) {
    return respond(res, 413, {
      ok: false,
      error: "ledger_batch_too_large",
      max_records: 1000
    });
  }

  try {
    const ledger = summarizeRevenueLedger(records);
    return respond(res, 200, {
      ok: ledger.summary.rejected_records === 0,
      mode: "verified_summary",
      ledger
    });
  } catch (error) {
    return respond(res, 400, {
      ok: false,
      error: "invalid_ledger_payload",
      message: error instanceof Error ? error.message : String(error)
    });
  }
}
