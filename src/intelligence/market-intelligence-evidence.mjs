import { URL } from "node:url";

export const MARKET_INTELLIGENCE_EVIDENCE_POLICY_VERSION =
  "skygrid-market-intelligence-evidence-v1";

export const MARKET_INTELLIGENCE_PROVIDER = Object.freeze({
  name: "Market Intelligence API",
  origin: "https://api.marketintelligenceapi.com"
});

const DIRECTIONAL_ROUTES = [
  /^\/api\/v1\/decision(?:\/|\?|$)/,
  /^\/api\/v1\/intelligence(?:\/|\?|$)/,
  /^\/api\/v1\/report(?:\/|\?|$)/,
  /^\/api\/v1\/markets\/technical(?:\/|\?|$)/
];

function normalizeRoute(route) {
  const value = typeof route === "string" ? route.trim() : "";
  if (!value.startsWith("/")) {
    throw new Error("market_intelligence_route_invalid");
  }
  return value;
}

function validateProviderUrl(sourceUrl) {
  const parsed = new URL(sourceUrl);
  if (parsed.protocol !== "https:" || parsed.origin !== MARKET_INTELLIGENCE_PROVIDER.origin) {
    throw new Error("market_intelligence_source_not_authorized");
  }
  return parsed;
}

function isDirectionalRoute(route) {
  return DIRECTIONAL_ROUTES.some((pattern) => pattern.test(route));
}

export function summarizeProviderCalibration(trackRecord, horizon = "1h") {
  const horizonStats = trackRecord?.live?.["7d"]?.byHorizon?.[horizon];

  if (!horizonStats) {
    return {
      status: "unverified",
      horizon,
      evaluated: 0,
      hitRatePercent: null
    };
  }

  const evaluated = Number(horizonStats.evaluated ?? 0);
  const hitRatePercent = Number(horizonStats.hitRatePercent);

  if (!Number.isFinite(hitRatePercent) || evaluated < 30) {
    return {
      status: "insufficient_sample",
      horizon,
      evaluated,
      hitRatePercent: Number.isFinite(hitRatePercent) ? hitRatePercent : null
    };
  }

  let status = "weak";
  if (hitRatePercent < 50) status = "adverse";
  else if (hitRatePercent >= 60) status = "strong";
  else if (hitRatePercent >= 55) status = "moderate";

  return {
    status,
    horizon,
    evaluated,
    hitRatePercent
  };
}

export function createMarketIntelligenceEvidencePlane({
  id,
  route,
  sourceUrl,
  payload,
  observedAt,
  trackRecord = null,
  requestPriceUsd = 0,
  paymentAuthorized = false,
  maxApprovedSpendUsd = 0,
  maxAgeMs = 5 * 60 * 1000,
  now = () => Date.now()
} = {}) {
  const normalizedRoute = normalizeRoute(route);
  const parsedUrl = validateProviderUrl(sourceUrl);

  if (parsedUrl.pathname !== normalizedRoute.split("?")[0]) {
    throw new Error("market_intelligence_route_source_mismatch");
  }

  const price = Number(requestPriceUsd ?? 0);
  const spendCap = Number(maxApprovedSpendUsd ?? 0);

  if (!Number.isFinite(price) || price < 0 || !Number.isFinite(spendCap) || spendCap < 0) {
    throw new Error("market_intelligence_payment_metadata_invalid");
  }

  if (price > 0 && paymentAuthorized !== true) {
    throw new Error("market_intelligence_payment_not_authorized");
  }

  if (price > spendCap) {
    throw new Error("market_intelligence_spend_cap_exceeded");
  }

  if (!payload || typeof payload !== "object") {
    throw new Error("market_intelligence_payload_required");
  }

  const observedMs = Date.parse(observedAt);
  if (!Number.isFinite(observedMs)) {
    throw new Error("market_intelligence_observed_at_invalid");
  }

  const ageMs = Math.max(0, Number(now()) - observedMs);
  const calibration = summarizeProviderCalibration(trackRecord);
  const directional = isDirectionalRoute(normalizedRoute);

  const qualityFlags = [];
  if (directional && calibration.status === "unverified") {
    qualityFlags.push("provider_calibration_unverified");
  }
  if (directional && calibration.status === "insufficient_sample") {
    qualityFlags.push("provider_calibration_insufficient_sample");
  }
  if (directional && calibration.status === "weak") {
    qualityFlags.push("provider_calibration_weak");
  }
  if (directional && calibration.status === "adverse") {
    qualityFlags.push("provider_calibration_adverse");
  }

  return {
    id: id || `market-intelligence:${normalizedRoute}`,
    source: MARKET_INTELLIGENCE_PROVIDER.name,
    sourceUrl,
    route: normalizedRoute,
    evidenceClass: directional ? "inferred" : "declared",
    authorized: true,
    provenanceValid: true,
    stale: ageMs > maxAgeMs,
    conflicting: directional && calibration.status === "adverse",
    observedAt,
    payload: {
      provider: MARKET_INTELLIGENCE_PROVIDER.name,
      route: normalizedRoute,
      response: payload,
      calibration,
      payment: {
        priceUsd: price,
        authorized: price === 0 ? true : paymentAuthorized === true,
        maxApprovedSpendUsd: spendCap
      },
      qualityFlags
    },
    policyVersion: MARKET_INTELLIGENCE_EVIDENCE_POLICY_VERSION
  };
}

export function createMarketIntelligenceCalibrationPlane({
  trackRecord,
  observedAt,
  sourceUrl = "https://api.marketintelligenceapi.com/track-record"
} = {}) {
  validateProviderUrl(sourceUrl);
  const calibration = summarizeProviderCalibration(trackRecord);

  return {
    id: "market-intelligence:provider-calibration",
    source: MARKET_INTELLIGENCE_PROVIDER.name,
    sourceUrl,
    evidenceClass: "observed",
    authorized: true,
    provenanceValid: calibration.status !== "unverified",
    stale: false,
    conflicting: calibration.status === "adverse",
    observedAt,
    payload: {
      calibration,
      trackRecord
    },
    policyVersion: MARKET_INTELLIGENCE_EVIDENCE_POLICY_VERSION
  };
}
