export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-SKYGRID-Product", "SKYGRID Emergency Data On-Ramp");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({
      ok: false,
      system: "SKYGRID Emergency Data On-Ramp",
      route: "/api/pay/quote",
      error: "method_not_allowed",
      timestamp: new Date().toISOString()
    });
  }

  const rawAmount = Array.isArray(req.query?.amount) ? req.query.amount[0] : req.query?.amount;
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

  const currency = String(
    Array.isArray(req.query?.currency) ? req.query.currency[0] : req.query?.currency || "USD"
  ).toUpperCase();
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
