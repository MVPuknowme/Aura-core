function getRequestUrl(req) {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers.host || "localhost";
  return new URL(req.url || "/api/pay/quote", `${proto}://${host}`);
}

function getSingleParam(searchParams, name, fallback = undefined) {
  const value = searchParams.get(name);
  return value ?? fallback;
}

export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-SKYGRID-Product", "SKYGRID Emergency Data On-Ramp");

  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return res.status(405).json({
      ok: false,
      system: "SKYGRID Emergency Data On-Ramp",
      route: "/api/pay/quote",
      error: "method_not_allowed",
      timestamp: new Date().toISOString()
    });
  }

  const requestUrl = getRequestUrl(req);
  const rawAmount = getSingleParam(requestUrl.searchParams, "amount");
  const amount = Number(rawAmount ?? 0);

  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({
      ok: false,
      system: "SKYGRID Emergency Data On-Ramp",
      route: "/api/pay/quote",
      error: "invalid_amount",
      message: "Provide a positive numeric amount, for example /api/pay/quote?amount=25.",
      timestamp: new Date().toISOString()
    });
  }

  const currency = String(getSingleParam(requestUrl.searchParams, "currency", "USD")).toUpperCase();
  const feePercent = 3;
  const fee = Number((amount * (feePercent / 100)).toFixed(2));

  return res.status(200).json({
    ok: true,
    system: "SKYGRID Emergency Data On-Ramp",
    route: "/api/pay/quote",
    status: "quote_ready",
    amount,
    currency,
    feePercent,
    fee,
    estimatedNet: Number((amount - fee).toFixed(2)),
    quoteOnly: true,
    timestamp: new Date().toISOString()
  });
}
