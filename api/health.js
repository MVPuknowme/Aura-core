const PRODUCT = "SKYGRID Emergency Data On-Ramp";

const ROUTES = [
  "/",
  "/health.json",
  "/api/health",
  "/api/skygrid/status",
  "/api/skygrid/intake",
  "/api/skygrid/opensea-preflight",
  "/api/skygrid/etherscan-read",
  "/api/highway/status",
  "/api/highway/postman",
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
      route: "/api/health",
      error: "method_not_allowed",
      allowed: ["GET"],
      timestamp: new Date().toISOString()
    });
  }

  return res.status(200).json({
    ok: true,
    product: PRODUCT,
    service: PRODUCT,
    status: "healthy",
    route: "/api/health",
    runtime: "skygrid-api",
    mode: "controlled_pilot",
    sentinel: "fail_closed",
    policy: {
      payment_execution: false,
      device_activation: false,
      production_failover: false,
      private_data_movement: false,
      wallet_signing: false,
      transaction_broadcast: false
    },
    routes: ROUTES,
    timestamp: new Date().toISOString()
  });
}
