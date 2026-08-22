const PRODUCT = "SKYGRID Emergency Data On-Ramp";

const ROUTES = [
  "/",
  "/health.json",
  "/dispatch",
  "/incidents",
  "/settings",
  "/highway",
  "/dashboard/command-center",
  "/dashboard/validation-panel",
  "/dashboard/deployment-review",
  "/dashboard/receipts",
  "/api/health",
  "/api/skygrid/status",
  "/api/skygrid/intake",
  "/api/skygrid/revenue",
  "/api/highway/status",
  "/api/highway/postman",
  "/api/pay/quote?amount=25",
  "/api/autodrill/latest",
  "/api/build-pad/quote",
  "/api/node-lease/intake",
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
      route: "/api/skygrid/status",
      error: "method_not_allowed",
      allowed: ["GET"],
      timestamp: new Date().toISOString()
    });
  }

  return res.status(200).json({
    ok: true,
    product: PRODUCT,
    service: PRODUCT,
    system: PRODUCT,
    route: "/api/skygrid/status",
    status: "healthy",
    runtime: "vercel-api",
    mode: "controlled_pilot",
    sentinel: "fail_closed",
    policy: {
      payment_execution: false,
      device_activation: false,
      production_failover: false,
      private_data_movement: false,
      wallet_signing: false,
      transaction_broadcast: false,
      revenue_recognition: "evidence_first_fail_closed"
    },
    routes: ROUTES,
    timestamp: new Date().toISOString()
  });
}
