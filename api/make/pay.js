import { createHash, timingSafeEqual } from "node:crypto";
import quoteHandler from "../pay/quote.js";
import { resolveDevPaymentExecutionPolicy } from "../../config/skygrid-dev-payment-execution.mjs";

const PRODUCT = "SKYGRID Emergency Data On-Ramp";
const INVOCATION = "/make.pay";
const DEFAULT_OPERATOR = "MVPuknowme";

function getHeader(req, name) {
  const headers = req?.headers || {};
  const direct = headers[name];
  if (direct !== undefined) return Array.isArray(direct) ? direct[0] : direct;
  const target = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === target) return Array.isArray(value) ? value[0] : value;
  }
  return undefined;
}

function secureEqual(actual, expected) {
  const left = Buffer.from(String(actual || ""));
  const right = Buffer.from(String(expected || ""));
  if (left.length !== right.length || left.length === 0) return false;
  return timingSafeEqual(left, right);
}

function basePayload(operator) {
  return {
    product: PRODUCT,
    service: PRODUCT,
    system: PRODUCT,
    invocation: INVOCATION,
    self: true,
    pay: true,
    operator,
    aliasFor: "/api/pay/quote"
  };
}

function blocked(res, status, operator, error) {
  return res.status(status).json({
    ok: false,
    ...basePayload(operator),
    error,
    paymentExecution: false,
    testExecution: false,
    realPaymentExecuted: false,
    noPaymentExecuted: true,
    noFundsMoved: true,
    walletSigning: false,
    transactionBroadcast: false,
    timestamp: new Date().toISOString()
  });
}

function handleDevTestExecution(req, res, operator) {
  let policy;
  try {
    policy = resolveDevPaymentExecutionPolicy(process.env);
  } catch (error) {
    const code = String(error?.message || "dev_payment_policy_invalid");
    return blocked(res, 503, operator, code);
  }

  const configuredOwnerToken = String(process.env.SKYGRID_OWNER_TOKEN || "");
  if (!configuredOwnerToken) {
    return blocked(res, 503, operator, "owner_auth_not_configured");
  }

  const authorization = String(getHeader(req, "authorization") || "");
  const suppliedOwnerToken = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : "";
  if (!secureEqual(suppliedOwnerToken, configuredOwnerToken)) {
    return blocked(res, 401, operator, "owner_auth_required");
  }

  const idempotencyKey = String(getHeader(req, "idempotency-key") || "").trim();
  if (!idempotencyKey) {
    return blocked(res, 400, operator, "idempotency_key_required");
  }

  const rawAmount = Array.isArray(req.query?.amount) ? req.query.amount[0] : req.query?.amount;
  const amount = Number(rawAmount ?? 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    return blocked(res, 400, operator, "invalid_amount");
  }

  const currency = String(
    Array.isArray(req.query?.currency) ? req.query.currency[0] : req.query?.currency || "USD"
  ).toUpperCase();
  const requestedDestination = String(
    Array.isArray(req.query?.destination) ? req.query.destination[0] : req.query?.destination || ""
  ).trim();
  const configuredDestination = String(process.env.SKYGRID_DEV_PAYMENT_DESTINATION || "").trim();
  if (!configuredDestination) {
    return blocked(res, 503, operator, "payment_destination_not_configured");
  }
  if (!requestedDestination || !secureEqual(requestedDestination, configuredDestination)) {
    return blocked(res, 403, operator, "payment_destination_not_verified");
  }

  const receiptHash = createHash("sha256")
    .update([idempotencyKey, amount, currency, configuredDestination, operator].join("|"))
    .digest("hex")
    .slice(0, 24);

  return res.status(200).json({
    ok: true,
    ...basePayload(operator),
    route: "/make.pay",
    status: "dev_test_execution_accepted",
    amount,
    currency,
    destination: configuredDestination,
    destinationVerified: true,
    idempotencyKey,
    receiptId: `devpay_${receiptHash}`,
    executionScope: policy.execution_scope,
    providerMode: policy.provider_mode,
    paymentExecution: policy.runtime_policy.payment_execution,
    testExecution: true,
    realPaymentExecuted: false,
    noPaymentExecuted: true,
    noFundsMoved: true,
    walletSigning: false,
    transactionBroadcast: false,
    quoteOnly: false,
    timestamp: new Date().toISOString()
  });
}

export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-SKYGRID-Product", PRODUCT);

  const operator = String(process.env.SKYGRID_OPERATOR || DEFAULT_OPERATOR).trim();

  if (req.method === "POST") {
    return handleDevTestExecution(req, res, operator);
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, POST");
    return blocked(res, 405, operator, "method_not_allowed");
  }

  const originalJson = res.json.bind(res);
  res.json = (payload) => originalJson({
    ...payload,
    ...basePayload(operator),
    paymentExecution: false,
    noPaymentExecuted: true
  });

  return quoteHandler(req, res);
}
