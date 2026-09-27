import { buildPaidAccountAssetResponse } from "../../lib/assets/paid-solana.mjs";

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.end(JSON.stringify(payload, null, 2));
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendJson(res, 405, {
      ok: false,
      error: "method_not_allowed",
      message: "Use GET. This endpoint is read-only."
    });
  }

  const host = req.headers?.host || "localhost";
  const url = new URL(req.url || "/api/wallet/paid-solana", `https://${host}`);

  const balance = url.searchParams.get("balance");
  const priceUsd = url.searchParams.get("priceUsd");
  const priceObservedAt = url.searchParams.get("priceObservedAt");
  const priceSource = url.searchParams.get("priceSource");

  return sendJson(
    res,
    200,
    buildPaidAccountAssetResponse({
      balance,
      priceUsd,
      priceObservedAt,
      priceSource
    })
  );
}
