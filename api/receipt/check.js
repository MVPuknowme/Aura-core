function isReceiptId(value) {
  return typeof value === "string" && /^0x[a-fA-F0-9]{64}$/.test(value);
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  let body = {};
  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString("utf8");
    body = raw ? JSON.parse(raw) : {};
  } catch {
    return res.status(400).json({ ok: false, error: "invalid_json" });
  }

  const receiptId = String(body.receiptId || body.hash || "");

  if (!isReceiptId(receiptId)) {
    return res.status(400).json({
      ok: false,
      route: "/api/receipt/check",
      error: "invalid_receipt_id",
      message: "Expected a 0x-prefixed 32-byte receipt id.",
      timestamp: new Date().toISOString()
    });
  }

  return res.status(200).json({
    ok: true,
    route: "/api/receipt/check",
    status: "format_valid",
    advisoryOnly: true,
    receiptId,
    timestamp: new Date().toISOString()
  });
}
