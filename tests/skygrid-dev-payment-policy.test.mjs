import test from "node:test";
import assert from "node:assert/strict";

async function loadPolicyModule() {
  try {
    return await import("../config/skygrid-dev-payment-execution.mjs");
  } catch {
    return null;
  }
}

test("dev payment policy enables only payment execution in local-container test mode", async () => {
  const module = await loadPolicyModule();
  assert.equal(typeof module?.resolveDevPaymentExecutionPolicy, "function");

  const policy = module.resolveDevPaymentExecutionPolicy({
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

test("dev payment policy fails closed outside dev test mode", async () => {
  const module = await loadPolicyModule();
  assert.equal(typeof module?.resolveDevPaymentExecutionPolicy, "function");

  assert.throws(
    () => module.resolveDevPaymentExecutionPolicy({
      SKYGRID_RUNTIME_MODE: "vercel",
      SKYGRID_DEV_PAYMENT_EXECUTION: "true",
      SKYGRID_PAYMENT_PROVIDER_MODE: "test"
    }),
    /dev_runtime_required/
  );

  assert.throws(
    () => module.resolveDevPaymentExecutionPolicy({
      SKYGRID_RUNTIME_MODE: "local-container",
      SKYGRID_DEV_PAYMENT_EXECUTION: "true",
      SKYGRID_PAYMENT_PROVIDER_MODE: "live"
    }),
    /test_provider_mode_required/
  );
});
