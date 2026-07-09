const PRODUCT = "SKYGRID Emergency Data On-Ramp";

function applyHeaders(res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-SKYGRID-Product", PRODUCT);
}

function normalizeBody(body) {
  if (!body) return {};
  if (typeof body === "string") {
    try {
      return JSON.parse(body);
    } catch {
      return { raw: body };
    }
  }
  return body;
}

export default function handler(req, res) {
  applyHeaders(res);

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      ok: false,
      product: PRODUCT,
      service: PRODUCT,
      route: "/api/intake",
      error: "method_not_allowed",
      allowed: ["POST"],
      timestamp: new Date().toISOString()
    });
  }

  const body = normalizeBody(req.body);
  const requestId = `skygrid_${Date.now()}`;
  const type = body.type || body.need || "system-health";
  const severity = body.severity || "test";

  return res.status(202).json({
    ok: true,
    accepted: true,
    product: PRODUCT,
    service: PRODUCT,
    route: "/api/intake",
    mode: "controlled_pilot",
    sentinel: "fail_closed",
    advisoryOnly: true,
    noDispatch: true,
    requestId,
    event: {
      eventId: requestId,
      receivedAt: new Date().toISOString(),
      source: body.source || "skygrid-public-intake",
      type,
      severity,
      region: body.region || "unspecified",
      payload: body
    },
    status: "accepted",
    timestamp: new Date().toISOString()
  });
}
