import assert from "node:assert/strict";
import test from "node:test";

const RECIPIENT = "0x0000000000000000000000000000000000000001";

function policyEnv(overrides = {}) {
  return {
    SKYGRID_BASEPAY_RECIPIENT_ALLOWLIST: RECIPIENT,
    SKYGRID_BASEPAY_MAX_USD: "25",
    ...overrides,
  };
}

test("Base Account payment adapter exposes payment and status functions", async () => {
  const module = await import("../src/basepay/base-account-pay.mjs");
  assert.equal(typeof module.sendBaseAccountUsdcPayment, "function");
  assert.equal(typeof module.getBaseAccountPaymentStatus, "function");
});

test("Base Account payment adapter validates chain and recipient before payment", async () => {
  const { sendBaseAccountUsdcPayment } = await import("../src/basepay/base-account-pay.mjs");

  await assert.rejects(
    sendBaseAccountUsdcPayment({
      amount: "5.00",
      recipient: "not-an-address",
      chainId: 84532,
      humanApproval: true,
    }, policyEnv()),
    /recipient must be a valid EVM address/,
  );

  await assert.rejects(
    sendBaseAccountUsdcPayment({
      amount: "5.00",
      recipient: RECIPIENT,
      chainId: 1,
      humanApproval: true,
    }, policyEnv()),
    /Unsupported Base chain ID/,
  );
});

test("Base Account payment adapter fails closed on allowlist, cap, and approval", async () => {
  const { sendBaseAccountUsdcPayment } = await import("../src/basepay/base-account-pay.mjs");

  await assert.rejects(
    sendBaseAccountUsdcPayment({
      amount: "5.00",
      recipient: RECIPIENT,
      chainId: 84532,
      humanApproval: true,
    }, policyEnv({ SKYGRID_BASEPAY_RECIPIENT_ALLOWLIST: "" })),
    /RECIPIENT_ALLOWLIST is empty/,
  );

  await assert.rejects(
    sendBaseAccountUsdcPayment({
      amount: "5.00",
      recipient: "0x0000000000000000000000000000000000000002",
      chainId: 84532,
      humanApproval: true,
    }, policyEnv()),
    /Recipient is not allowlisted/,
  );

  await assert.rejects(
    sendBaseAccountUsdcPayment({
      amount: "25.01",
      recipient: RECIPIENT,
      chainId: 84532,
      humanApproval: true,
    }, policyEnv()),
    /amount exceeds SKYGRID_BASEPAY_MAX_USD policy cap/,
  );

  await assert.rejects(
    sendBaseAccountUsdcPayment({
      amount: "5.00",
      recipient: RECIPIENT,
      chainId: 84532,
      humanApproval: false,
    }, policyEnv()),
    /Explicit human approval is required/,
  );
});

test("Base Account payment adapter rejects zero amount and missing status id", async () => {
  const {
    sendBaseAccountUsdcPayment,
    getBaseAccountPaymentStatus,
  } = await import("../src/basepay/base-account-pay.mjs");

  await assert.rejects(
    sendBaseAccountUsdcPayment({
      amount: "0",
      recipient: RECIPIENT,
      chainId: 84532,
      humanApproval: true,
    }, policyEnv()),
    /amount must be greater than zero/,
  );

  assert.throws(
    () => getBaseAccountPaymentStatus("", 84532),
    /payment id is required/,
  );
});
