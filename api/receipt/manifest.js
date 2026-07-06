const PRODUCT = "SKYGRID Emergency Data On-Ramp";

export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-SKYGRID-Product", PRODUCT);

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  return res.status(200).json({
    ok: true,
    product: PRODUCT,
    route: "/api/receipt/manifest",
    mode: "read_only_receipt_check",
    safety: {
      custody: false,
      signing: false,
      broadcasting: false,
      fundMovement: false,
      advisoryOnly: true
    },
    supportedNetworks: [
      { id: "ethereum-mainnet", env: "SKYGRID_ETHEREUM_RPC_URL", enabled: true },
      { id: "base-mainnet", env: "SKYGRID_BASE_RPC_URL", enabled: true },
      { id: "scroll-mainnet", env: "SKYGRID_SCROLL_RPC_URL", enabled: true }
    ],
    routes: {
      readiness: "/api/receipt/readiness",
      check: "/api/receipt/check"
    },
    timestamp: new Date().toISOString()
  });
}
