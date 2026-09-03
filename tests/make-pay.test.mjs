import test from "node:test";
import assert from "node:assert/strict";
import handler from "../api/make/pay.js";

function invoke({ method = "GET", query = {}, headers = {} } = {}) {
  let statusCode = 200;
  let payload;
  const responseHeaders = {};
  const req = { method, query, headers };
  const res = {
    setHeader(name, value) { responseHeaders[name.toLowerCase()] = value; },
    status(code) { statusCode = code; return this; },
    json(body) { payload = body; return body; }
  };
  handler(req, res);
  return { statusCode, payload, headers: responseHeaders };
}

function withEnv(values, run) {
  const prior = {};
  for (const [key, value] of Object.entries(values)) {
    prior[key] = process.env[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    return run();
  } finally {
    for (const [key, value] of Object.entries(prior)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

const DEV_ENV = {
  SKYGRID_RUNTIME_MODE: "local-container",
  SKYGRID_DEV_PAYMENT_EXECUTION: "true",
  SKYGRID_PAYMENT_PROVIDER_MODE: "test",
  SKYGRID_OWNER_TOKEN: "owner-test-secret",
  SKYGRID_DEV_PAYMENT_DESTINATION: "self:MVPuknowme"
};

test("GET /make.pay remains quote-only", () => {
  const result = invoke({ query: { amount: "25", currency: "USD" } });

  assert.equal(result.statusCode, 200);
  assert.equal(result.payload.invocation, "/make.pay");
  assert.equal(result.payload.self, true);
  assert.equal(result.payload.pay, true);
  assert.equal(result.payload.amount, 25);
  assert.equal(result.payload.quoteOnly, true);
  assert.equal(result.payload.paymentExecution, false);
  assert.equal(result.payload.noPaymentExecuted, true);
});

test("POST /make.pay enables dev test execution only behind every gate", () => {
  const result = withEnv(DEV_ENV, () => invoke({
    method: "POST",
    query: {
      amount: "25",
      currency: "USD",
      destination: "self:MVPuknowme"
    },
    headers: {
      authorization: "Bearer owner-test-secret",
      "idempotency-key": "make-pay-test-001"
    }
  }));

  assert.equal(result.statusCode, 200);
  assert.equal(result.payload.invocation, "/make.pay");
  assert.equal(result.payload.self, true);
  assert.equal(result.payload.pay, true);
  assert.equal(result.payload.paymentExecution, true);
  assert.equal(result.payload.executionScope, "dev_test_only");
  assert.equal(result.payload.providerMode, "test");
  assert.equal(result.payload.destinationVerified, true);
  assert.equal(result.payload.testExecution, true);
  assert.equal(result.payload.realPaymentExecuted, false);
  assert.equal(result.payload.noPaymentExecuted, true);
  assert.equal(result.payload.noFundsMoved, true);
  assert.equal(result.payload.walletSigning, false);
  assert.equal(result.payload.transactionBroadcast, false);
  assert.match(result.payload.receiptId, /^devpay_[a-f0-9]{24}$/);
});

test("POST /make.pay fails closed without OWNER authentication", () => {
  const result = withEnv(DEV_ENV, () => invoke({
    method: "POST",
    query: { amount: "25", destination: "self:MVPuknowme" },
    headers: { "idempotency-key": "make-pay-test-002" }
  }));

  assert.equal(result.statusCode, 401);
  assert.equal(result.payload.error, "owner_auth_required");
  assert.equal(result.payload.paymentExecution, false);
  assert.equal(result.payload.noFundsMoved, true);
});

test("POST /make.pay rejects non-dev runtime, live provider mode, and unverified destinations", () => {
  const productionRuntime = withEnv({ ...DEV_ENV, SKYGRID_RUNTIME_MODE: "vercel" }, () => invoke({
    method: "POST",
    query: { amount: "25", destination: "self:MVPuknowme" },
    headers: {
      authorization: "Bearer owner-test-secret",
      "idempotency-key": "make-pay-test-prod"
    }
  }));
  assert.equal(productionRuntime.statusCode, 503);
  assert.equal(productionRuntime.payload.error, "dev_runtime_required");
  assert.equal(productionRuntime.payload.paymentExecution, false);

  const liveMode = withEnv({ ...DEV_ENV, SKYGRID_PAYMENT_PROVIDER_MODE: "live" }, () => invoke({
    method: "POST",
    query: { amount: "25", destination: "self:MVPuknowme" },
    headers: {
      authorization: "Bearer owner-test-secret",
      "idempotency-key": "make-pay-test-003"
    }
  }));
  assert.equal(liveMode.statusCode, 503);
  assert.equal(liveMode.payload.error, "test_provider_mode_required");
  assert.equal(liveMode.payload.paymentExecution, false);

  const wrongDestination = withEnv(DEV_ENV, () => invoke({
    method: "POST",
    query: { amount: "25", destination: "someone-else" },
    headers: {
      authorization: "Bearer owner-test-secret",
      "idempotency-key": "make-pay-test-004"
    }
  }));
  assert.equal(wrongDestination.statusCode, 403);
  assert.equal(wrongDestination.payload.error, "payment_destination_not_verified");
  assert.equal(wrongDestination.payload.paymentExecution, false);
});

test("POST /make.pay requires idempotency and produces a stable test receipt", () => {
  const missing = withEnv(DEV_ENV, () => invoke({
    method: "POST",
    query: { amount: "25", destination: "self:MVPuknowme" },
    headers: { authorization: "Bearer owner-test-secret" }
  }));
  assert.equal(missing.statusCode, 400);
  assert.equal(missing.payload.error, "idempotency_key_required");

  const first = withEnv(DEV_ENV, () => invoke({
    method: "POST",
    query: { amount: "25", currency: "USD", destination: "self:MVPuknowme" },
    headers: {
      authorization: "Bearer owner-test-secret",
      "idempotency-key": "stable-key"
    }
  }));
  const second = withEnv(DEV_ENV, () => invoke({
    method: "POST",
    query: { amount: "25", currency: "USD", destination: "self:MVPuknowme" },
    headers: {
      authorization: "Bearer owner-test-secret",
      "idempotency-key": "stable-key"
    }
  }));

  assert.equal(first.payload.receiptId, second.payload.receiptId);
  assert.equal(first.payload.paymentExecution, true);
  assert.equal(second.payload.paymentExecution, true);
});
