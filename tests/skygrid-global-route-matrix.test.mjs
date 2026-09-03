import test from "node:test";
import assert from "node:assert/strict";
import {
  evaluateGlobalRouteObservation,
  summarizeGlobalRouteMatrix,
  GLOBAL_ROUTE_CONFIDENCE_THRESHOLD,
  GLOBAL_ROUTE_FEE_RATE,
  GLOBAL_ROUTE_WINDOW_MS
} from "../config/skygrid-global-route-matrix.mjs";

const NOW = Date.parse("2026-09-04T12:00:00Z");

function baseObservation(overrides = {}) {
  return {
    origin_jurisdiction: "Taiwan",
    destination_jurisdiction: "New York, US",
    provider: "test-provider",
    asset: "USD",
    network: "bank-test",
    settlement_destination: "verified-destination",
    destination_verified: true,
    auth_scope_ok: true,
    route_health: "passing",
    deposit_available: true,
    withdrawal_available: true,
    quote_value: 100000,
    verified_settlement_value: 100000,
    fee_spread_bps: 10,
    inflation_fx_margin_24h: 0.001,
    verification_confidence: 0.98,
    evidence_timestamp: "2026-09-04T11:30:00Z",
    comparable_verified_losses: [1, 1, 2, 2, 3],
    verified_loss: 4,
    settlement_status: "verified",
    ...overrides
  };
}

test("constants implement approved policy", () => {
  assert.equal(GLOBAL_ROUTE_CONFIDENCE_THRESHOLD, 0.98);
  assert.equal(GLOBAL_ROUTE_FEE_RATE, 0.03);
  assert.equal(GLOBAL_ROUTE_WINDOW_MS, 24 * 60 * 60 * 1000);
});

test("98 percent verified route is execution eligible without executing", () => {
  const row = evaluateGlobalRouteObservation(baseObservation(), { now: NOW });
  assert.equal(row.state, "verified");
  assert.equal(row.payment_execution_eligible, true);
  assert.equal(row.execution_performed, false);
  assert.equal(row.funds_moved, false);
  assert.equal(row.wallet_signing, false);
  assert.equal(row.transaction_broadcast, false);
  assert.equal(row.realized_income, false);
});

test("below 98 percent is deferred and ineligible", () => {
  const row = evaluateGlobalRouteObservation(baseObservation({ verification_confidence: 0.979999 }), { now: NOW });
  assert.equal(row.state, "deferred");
  assert.equal(row.payment_execution_eligible, false);
  assert.ok(row.failure_reasons.includes("verification_confidence_below_threshold"));
});

test("destination mismatch is blocked", () => {
  const row = evaluateGlobalRouteObservation(baseObservation({ destination_verified: false }), { now: NOW });
  assert.equal(row.state, "blocked");
  assert.equal(row.payment_execution_eligible, false);
  assert.ok(row.failure_reasons.includes("destination_not_verified"));
});

test("evidence older than 24 hours is deferred", () => {
  const old = new Date(NOW - (24 * 60 * 60 * 1000) - 1).toISOString();
  const row = evaluateGlobalRouteObservation(baseObservation({ evidence_timestamp: old }), { now: NOW });
  assert.equal(row.state, "deferred");
  assert.equal(row.payment_execution_eligible, false);
  assert.ok(row.failure_reasons.includes("evidence_outside_24h_window"));
});

test("exception loss uses median plus 1.5 IQR", () => {
  const row = evaluateGlobalRouteObservation(baseObservation({
    comparable_verified_losses: [1, 2, 3, 4, 100],
    verified_loss: 20
  }), { now: NOW });
  assert.equal(row.normal_loss_threshold, 78.75);
  assert.equal(row.exception_loss, 0);
});

test("fee is three percent of inflation adjusted value plus exception loss", () => {
  const row = evaluateGlobalRouteObservation(baseObservation({
    verified_settlement_value: 100000,
    inflation_fx_margin_24h: 0.01,
    comparable_verified_losses: [0, 0, 0, 0, 0],
    verified_loss: 100
  }), { now: NOW });
  assert.equal(row.normal_loss_threshold, 0);
  assert.equal(row.exception_loss, 100);
  assert.equal(row.adjusted_eligible_value, 101100);
  assert.equal(row.proposed_support_fee, 3033);
});

test("settled route is settled and remains analytical, not fabricated provider income", () => {
  const row = evaluateGlobalRouteObservation(baseObservation({ settlement_status: "settled" }), { now: NOW });
  assert.equal(row.state, "settled");
  assert.equal(row.payment_execution_eligible, true);
  assert.equal(row.receivable_evidence_complete, true);
  assert.equal(row.realized_income, false);
});

test("non-finite numeric values fail closed", () => {
  const row = evaluateGlobalRouteObservation(baseObservation({ verification_confidence: Number.NaN }), { now: NOW });
  assert.equal(row.state, "blocked");
  assert.equal(row.payment_execution_eligible, false);
  assert.ok(row.failure_reasons.includes("invalid_verification_confidence"));
});

test("summary counts states and eligibility", () => {
  const rows = [
    evaluateGlobalRouteObservation(baseObservation(), { now: NOW }),
    evaluateGlobalRouteObservation(baseObservation({ verification_confidence: 0.97 }), { now: NOW }),
    evaluateGlobalRouteObservation(baseObservation({ destination_verified: false }), { now: NOW })
  ];
  const summary = summarizeGlobalRouteMatrix(rows);
  assert.equal(summary.total, 3);
  assert.equal(summary.execution_eligible, 1);
  assert.equal(summary.states.verified, 1);
  assert.equal(summary.states.deferred, 1);
  assert.equal(summary.states.blocked, 1);
});
