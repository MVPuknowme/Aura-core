const DEV_RUNTIME_MODES = new Set(["local-container", "ci"]);

function normalized(value) {
  return String(value || "").trim().toLowerCase();
}

export function resolveDevPaymentExecutionPolicy(env = process.env) {
  if (normalized(env.SKYGRID_DEV_PAYMENT_EXECUTION) !== "true") {
    throw new Error("dev_payment_execution_disabled");
  }

  const runtimeMode = normalized(env.SKYGRID_RUNTIME_MODE);
  if (!DEV_RUNTIME_MODES.has(runtimeMode)) {
    throw new Error("dev_runtime_required");
  }

  const providerMode = normalized(env.SKYGRID_PAYMENT_PROVIDER_MODE);
  if (providerMode !== "test") {
    throw new Error("test_provider_mode_required");
  }

  return Object.freeze({
    mode: "controlled_pilot",
    sentinel: "fail_closed",
    execution_scope: "dev_test_only",
    provider_mode: "test",
    runtime_policy: Object.freeze({
      payment_execution: true,
      device_activation: false,
      production_failover: false,
      private_data_movement: false
    })
  });
}
