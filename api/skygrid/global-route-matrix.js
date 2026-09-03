import {
  evaluateGlobalRouteObservation,
  summarizeGlobalRouteMatrix,
  GLOBAL_ROUTE_CONFIDENCE_THRESHOLD,
  GLOBAL_ROUTE_FEE_RATE,
  GLOBAL_ROUTE_WINDOW_MS
} from "../../config/skygrid-global-route-matrix.mjs";

const NO_SIDE_EFFECTS = Object.freeze({
  executionPerformed: false,
  fundsMoved: false,
  walletSigning: false,
  transactionBroadcast: false
});

function send(res, statusCode, body) {
  return res.status(statusCode).json({ ...body, ...NO_SIDE_EFFECTS });
}

export default function handler(req, res) {
  if (req.method === "GET") {
    return send(res, 200, {
      ok: true,
      service: "SKYGRID Emergency Data On-Ramp",
      route: "/api/skygrid/global-route-matrix",
      method: "POST",
      maxObservations: 100,
      verificationThreshold: GLOBAL_ROUTE_CONFIDENCE_THRESHOLD,
      supportFeeRate: GLOBAL_ROUTE_FEE_RATE,
      validationWindowMs: GLOBAL_ROUTE_WINDOW_MS,
      paymentExecutionMode: "eligibility_only_no_provider_execution"
    });
  }

  if (req.method !== "POST") {
    return send(res, 405, { ok: false, error: "method_not_allowed" });
  }

  const observations = req.body?.observations;
  if (!Array.isArray(observations) || observations.length === 0) {
    return send(res, 400, { ok: false, error: "observations_required" });
  }
  if (observations.length > 100) {
    return send(res, 413, { ok: false, error: "observation_batch_too_large", maxObservations: 100 });
  }

  const rows = observations.map((observation) => evaluateGlobalRouteObservation(observation));
  return send(res, 200, {
    ok: true,
    service: "SKYGRID Emergency Data On-Ramp",
    paymentExecutionMode: "eligibility_only_no_provider_execution",
    rows,
    summary: summarizeGlobalRouteMatrix(rows)
  });
}
