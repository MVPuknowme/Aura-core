import assert from "node:assert/strict";
import test from "node:test";

import {
  createMarketIntelligenceCalibrationPlane,
  createMarketIntelligenceEvidencePlane,
  summarizeProviderCalibration
} from "../src/intelligence/market-intelligence-evidence.mjs";

const NOW = "2026-10-01T06:55:00.000Z";
const NOW_MS = Date.parse(NOW);

function trackRecord(hitRatePercent = 53.7, evaluated = 36300) {
  return {
    live: {
      "7d": {
        byHorizon: {
          "1h": {
            evaluated,
            sufficientSample: evaluated >= 30,
            hitRatePercent
          }
        }
      }
    }
  };
}

test("directional provider output is treated as inferred evidence", () => {
  const plane = createMarketIntelligenceEvidencePlane({
    route: "/api/v1/intelligence/ETHUSD",
    sourceUrl: "https://api.marketintelligenceapi.com/api/v1/intelligence/ETHUSD",
    payload: { symbol: "ETHUSD", signal: "BUYING_ACTIVITY", confidenceScore: 82 },
    observedAt: NOW,
    trackRecord: trackRecord(),
    now: () => NOW_MS
  });

  assert.equal(plane.evidenceClass, "inferred");
  assert.equal(plane.authorized, true);
  assert.equal(plane.provenanceValid, true);
  assert.equal(plane.stale, false);
  assert.equal(plane.conflicting, false);
  assert.deepEqual(plane.payload.qualityFlags, ["provider_calibration_weak"]);
});

test("provider track record is represented as separate observed calibration evidence", () => {
  const plane = createMarketIntelligenceCalibrationPlane({
    trackRecord: trackRecord(),
    observedAt: NOW
  });

  assert.equal(plane.evidenceClass, "observed");
  assert.equal(plane.provenanceValid, true);
  assert.equal(plane.payload.calibration.status, "weak");
  assert.equal(plane.payload.calibration.evaluated, 36300);
});

test("adverse empirical calibration flags directional evidence as conflicting", () => {
  const plane = createMarketIntelligenceEvidencePlane({
    route: "/api/v1/decision/lite/ETHUSD",
    sourceUrl: "https://api.marketintelligenceapi.com/api/v1/decision/lite/ETHUSD",
    payload: { action: "BUY", conviction: 90 },
    observedAt: NOW,
    trackRecord: trackRecord(48.5, 29800),
    now: () => NOW_MS
  });

  assert.equal(plane.conflicting, true);
  assert.ok(plane.payload.qualityFlags.includes("provider_calibration_adverse"));
});

test("paid calls fail closed without explicit payment authorization", () => {
  assert.throws(
    () =>
      createMarketIntelligenceEvidencePlane({
        route: "/api/v1/report/NVDA",
        sourceUrl: "https://api.marketintelligenceapi.com/api/v1/report/NVDA",
        payload: { symbol: "NVDA" },
        observedAt: NOW,
        requestPriceUsd: 0.03,
        maxApprovedSpendUsd: 1,
        paymentAuthorized: false,
        now: () => NOW_MS
      }),
    /market_intelligence_payment_not_authorized/
  );
});

test("paid calls fail closed above the approved spend cap", () => {
  assert.throws(
    () =>
      createMarketIntelligenceEvidencePlane({
        route: "/api/v1/report/NVDA",
        sourceUrl: "https://api.marketintelligenceapi.com/api/v1/report/NVDA",
        payload: { symbol: "NVDA" },
        observedAt: NOW,
        requestPriceUsd: 0.03,
        maxApprovedSpendUsd: 0.01,
        paymentAuthorized: true,
        now: () => NOW_MS
      }),
    /market_intelligence_spend_cap_exceeded/
  );
});

test("unexpected provider origins are rejected", () => {
  assert.throws(
    () =>
      createMarketIntelligenceEvidencePlane({
        route: "/api/v1/intelligence/ETHUSD",
        sourceUrl: "https://example.com/api/v1/intelligence/ETHUSD",
        payload: { signal: "BUY" },
        observedAt: NOW,
        now: () => NOW_MS
      }),
    /market_intelligence_source_not_authorized/
  );
});

test("stale observations are marked stale", () => {
  const plane = createMarketIntelligenceEvidencePlane({
    route: "/api/v1/intelligence/ETHUSD",
    sourceUrl: "https://api.marketintelligenceapi.com/api/v1/intelligence/ETHUSD",
    payload: { signal: "BUYING_ACTIVITY" },
    observedAt: "2026-10-01T06:40:00.000Z",
    trackRecord: trackRecord(),
    maxAgeMs: 5 * 60 * 1000,
    now: () => NOW_MS
  });

  assert.equal(plane.stale, true);
});

test("calibration helper distinguishes insufficient and stronger samples", () => {
  assert.equal(summarizeProviderCalibration(trackRecord(80, 10)).status, "insufficient_sample");
  assert.equal(summarizeProviderCalibration(trackRecord(61, 1000)).status, "strong");
});
