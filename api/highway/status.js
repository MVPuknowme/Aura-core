const PRODUCT = "SKYGRID Emergency Data On-Ramp";

const PROOF_ROUTES = [
  "/",
  "/health.json",
  "/api/health",
  "/api/highway/status",
  "/api/highway/postman",
  "/api/skygrid/status",
  "/api/skygrid/intake",
  "/api/pay/quote?amount=25",
  "/api/autodrill/latest",
  "/api/failover/status"
];

function applyHeaders(res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-SKYGRID-Product", PRODUCT);
}

export default function handler(req, res) {
  applyHeaders(res);

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({
      ok: false,
      product: PRODUCT,
      service: PRODUCT,
      route: "/api/highway/status",
      error: "method_not_allowed",
      allowed: ["GET"],
      timestamp: new Date().toISOString()
    });
  }

  return res.status(200).json({
    ok: true,
    product: PRODUCT,
    service: PRODUCT,
    route: "/api/highway/status",
    status: "online",
    ready_state: "ramp_proof_ready",
    runtime: "vercel-api",
    mode: "controlled_pilot",
    sentinel: "fail_closed",
    policy: {
      production_failover: false,
      private_data_movement: false,
      device_activation: false,
      payment_execution: false
    },
    proof_routes: PROOF_ROUTES,
    next_gate: "operator_review_before_manual_failover",
    timestamp: new Date().toISOString()
  });
}
