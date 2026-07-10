const PRODUCT = "SKYGRID Emergency Data On-Ramp";

const ENDPOINTS = [
  "/",
  "/health.json",
  "/api/health",
  "/api/intake",
  "/api/skygrid/status",
  "/api/skygrid/intake",
  "/api/aura-core/decide",
  "/api/agent/signals",
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
      route: "/api/highway/postman",
      error: "method_not_allowed",
      allowed: ["GET"],
      timestamp: new Date().toISOString()
    });
  }

  return res.status(200).json({
    ok: true,
    product: PRODUCT,
    service: PRODUCT,
    route: "/api/highway/postman",
    status: "postman_ready",
    collection: "postman/skygrid-autodrill.collection.json",
    mode: "controlled_pilot",
    sentinel: "fail_closed",
    checks: [
      "front-page",
      "health-json",
      "api-health",
      "status",
      "intake",
      "dashboard",
      "quote-only",
      "failover-status"
    ],
    endpoints: ENDPOINTS,
    timestamp: new Date().toISOString()
  });
}
