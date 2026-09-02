import test from "node:test";
import assert from "node:assert/strict";
import handler from "../api/pay/to-me-xyz.js";

function invoke({ method = "GET", query = {} } = {}) {
  let statusCode = 200;
  let payload;
  const headers = {};
  const req = { method, query };
  const res = {
    setHeader(name, value) { headers[name.toLowerCase()] = value; },
    status(code) { statusCode = code; return this; },
    json(body) { payload = body; return body; }
  };
  handler(req, res);
  return { statusCode, payload, headers };
}

test("pay.to.me.xyz exposes the existing quote path without executing payment", () => {
  const result = invoke({ query: { amount: "25", currency: "USD" } });

  assert.equal(result.statusCode, 200);
  assert.equal(result.payload.invocation, "pay.to.me.xyz");
  assert.equal(result.payload.operator, "MVPuknowme");
  assert.equal(result.payload.aliasFor, "/api/pay/quote");
  assert.equal(result.payload.route, "/api/pay/quote");
  assert.equal(result.payload.amount, 25);
  assert.equal(result.payload.currency, "USD");
  assert.equal(result.payload.quoteOnly, true);
  assert.equal(result.payload.noPaymentExecuted, true);
  assert.equal(result.payload.paymentExecution, false);
});

test("pay.to.me.xyz preserves quote validation and never turns invalid input into execution", () => {
  const result = invoke({ query: { amount: "0" } });

  assert.equal(result.statusCode, 400);
  assert.equal(result.payload.invocation, "pay.to.me.xyz");
  assert.equal(result.payload.error, "invalid_amount");
  assert.equal(result.payload.quoteOnly, true);
  assert.equal(result.payload.noPaymentExecuted, true);
});
