import test from "node:test";
import assert from "node:assert/strict";
import handler from "../api/skygrid/global-route-matrix.js";

function makeRes() {
  const result = { statusCode: 200, body: null };
  return {
    status(code) { result.statusCode = code; return this; },
    json(body) { result.body = body; return result; },
    _result: result
  };
}

function observation() {
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
    quote_value: 1000,
    verified_settlement_value: 1000,
    fee_spread_bps: 10,
    inflation_fx_margin_24h: 0,
    verification_confidence: 0.98,
    evidence_timestamp: new Date().toISOString(),
    comparable_verified_losses: [0, 0, 0, 0, 0],
    verified_loss: 0,
    settlement_status: "verified"
  };
}

test("POST evaluates observations without side effects", () => {
  const req = { method: "POST", body: { observations: [observation()] } };
  const res = makeRes();
  const out = handler(req, res);
  assert.equal(out.statusCode, 200);
  assert.equal(out.body.rows.length, 1);
  assert.equal(out.body.summary.total, 1);
  assert.equal(out.body.executionPerformed, false);
  assert.equal(out.body.fundsMoved, false);
  assert.equal(out.body.walletSigning, false);
  assert.equal(out.body.transactionBroadcast, false);
});

test("GET returns method guidance and no execution", () => {
  const req = { method: "GET" };
  const res = makeRes();
  const out = handler(req, res);
  assert.equal(out.statusCode, 200);
  assert.equal(out.body.method, "POST");
  assert.equal(out.body.executionPerformed, false);
});

test("malformed POST fails closed", () => {
  const req = { method: "POST", body: {} };
  const res = makeRes();
  const out = handler(req, res);
  assert.equal(out.statusCode, 400);
  assert.equal(out.body.ok, false);
  assert.equal(out.body.executionPerformed, false);
});

test("more than 100 observations is rejected without partial evaluation", () => {
  const req = { method: "POST", body: { observations: Array.from({ length: 101 }, observation) } };
  const res = makeRes();
  const out = handler(req, res);
  assert.equal(out.statusCode, 413);
  assert.equal(out.body.rows, undefined);
  assert.equal(out.body.executionPerformed, false);
});

test("unsupported method is rejected", () => {
  const req = { method: "PUT", body: { observations: [observation()] } };
  const res = makeRes();
  const out = handler(req, res);
  assert.equal(out.statusCode, 405);
  assert.equal(out.body.executionPerformed, false);
});
