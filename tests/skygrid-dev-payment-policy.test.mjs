import test from "node:test";
import assert from "node:assert/strict";
import { resolveDevPaymentExecutionPolicy } from "../config/skygrid-dev-payment-execution.mjs";

test("dev payment policy enables only payment execution in local-container test mode", () => {
  const policy = resolveDevPaymentExecutionPolicy({
    SKYGRID_RUNTIME_MODE: "local-container",
    SKYGRID_DEV_PAYMENT_EXECUTION: "true",
    SKYGRID_PAYMENT_PROVIDER_MODE: "test"
  });

  assert.deepEqual(policy.runtime_policy, {
    payment_execution: true,
    device_activation: false,
    production_failover: false,
    private_data_movement: false
  });
  assert.equal(policy.execution_scope, "dev_test_only");
  assert.equal(policy.provider_mode, "test");
});

test("dev payment policy fails closed outside dev test mode", () => {
  assert.throws(
    () => resolveDevPaymentExecutionPolicy({
      SKYGRID_RUNTIME_MODE: "vercel",
      SKYGRID_DEV_PAYMENT_EXECUTION: "true",
      SKYGRID_PAYMENT_PROVIDER_MODE: "test"
    }),
    /dev_runtime_required/
  );

  assert.throws(
    () => resolveDevPaymentExecutionPolicy({
      SKYGRID_RUNTIME_MODE: "local-container",
      SKYGRID_DEV_PAYMENT_EXECUTION: "true",
      SKYGRID_PAYMENT_PROVIDER_MODE: "live"
    }),
    /test_provider_mode_required/
  );
});
