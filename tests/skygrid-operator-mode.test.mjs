import test from "node:test";
import assert from "node:assert/strict";
import {
  applyOperatorMode,
  DEFAULT_SKYGRID_OPERATOR,
  resolveOperatorConfig,
  resolveRuntimeHost,
  sanitizeDirectListenerHeaders,
  validateOperatorRuntimePolicy
} from "../config/skygrid-operator.mjs";

test("defaults operator identity to MVPuknowme without making it an auth primitive", () => {
  const config = resolveOperatorConfig({});
  assert.equal(config.operator, DEFAULT_SKYGRID_OPERATOR);
  assert.equal(config.runtimeMode, "local");
  assert.equal(config.authorization, "independent_fail_closed_controls");
});

test("allows Vercel hosting fallback only in local-container mode", () => {
  const config = resolveOperatorConfig({
    SKYGRID_OPERATOR: "MVPuknowme",
    SKYGRID_RUNTIME_MODE: "local-container",
    SKYGRID_VERCEL_BYPASS: "local-container"
  });
  assert.equal(config.vercelBypass, true);
});

test("rejects Vercel bypass inside Vercel", () => {
  assert.throws(
    () => resolveOperatorConfig({
      VERCEL: "1",
      SKYGRID_RUNTIME_MODE: "local-container",
      SKYGRID_VERCEL_BYPASS: "local-container"
    }),
    /vercel_bypass_must_run_outside_vercel/
  );
});

test("rejects bypass mode when runtime is not a local container", () => {
  assert.throws(
    () => resolveOperatorConfig({
      SKYGRID_RUNTIME_MODE: "vercel",
      SKYGRID_VERCEL_BYPASS: "local-container"
    }),
    /vercel_bypass_requires_local_container_mode/
  );
});

test("rejects malformed operator values", () => {
  assert.throws(
    () => resolveOperatorConfig({ SKYGRID_OPERATOR: "MVPuknowme admin=true" }),
    /invalid_skygrid_operator/
  );
});

test("rejects wildcard binds outside local-container mode", () => {
  assert.throws(
    () => resolveRuntimeHost({ HOST: "0.0.0.0" }, "local"),
    /wildcard_host_requires_local_container_mode/
  );
  assert.equal(
    resolveRuntimeHost({ HOST: "0.0.0.0" }, "local-container"),
    "0.0.0.0"
  );
});

test("validates inherited bypass state before applying a runtime mode", () => {
  const previous = {
    operator: process.env.SKYGRID_OPERATOR,
    runtimeMode: process.env.SKYGRID_RUNTIME_MODE,
    bypass: process.env.SKYGRID_VERCEL_BYPASS
  };

  try {
    process.env.SKYGRID_OPERATOR = "MVPuknowme";
    process.env.SKYGRID_RUNTIME_MODE = "local-container";
    process.env.SKYGRID_VERCEL_BYPASS = "typo";
    assert.throws(
      () => applyOperatorMode({ runtimeMode: "local-container", vercelBypass: false }),
      /invalid_vercel_bypass_mode/
    );
    assert.equal(process.env.SKYGRID_VERCEL_BYPASS, "typo");
  } finally {
    for (const [key, value] of Object.entries({
      SKYGRID_OPERATOR: previous.operator,
      SKYGRID_RUNTIME_MODE: previous.runtimeMode,
      SKYGRID_VERCEL_BYPASS: previous.bypass
    })) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("direct listener strips spoofable forwarding identities by default", () => {
  const headers = {
    host: "localhost",
    "x-forwarded-for": "203.0.113.10",
    forwarded: "for=203.0.113.10",
    "x-real-ip": "203.0.113.10"
  };
  assert.equal(sanitizeDirectListenerHeaders(headers, {}), false);
  assert.deepEqual(headers, { host: "localhost" });

  const trusted = { "x-forwarded-for": "203.0.113.10" };
  assert.equal(
    sanitizeDirectListenerHeaders(trusted, { SKYGRID_TRUST_PROXY: "1" }),
    true
  );
  assert.equal(trusted["x-forwarded-for"], "203.0.113.10");
});

test("startup policy rejects the actual runtime execution fields", () => {
  const safePolicy = {
    mode: "controlled_pilot",
    sentinel: "fail_closed",
    runtime_policy: {
      payment_execution: false,
      device_activation: false,
      production_failover: false,
      private_data_movement: false
    }
  };
  assert.equal(validateOperatorRuntimePolicy(safePolicy), true);

  for (const field of Object.keys(safePolicy.runtime_policy)) {
    assert.throws(
      () => validateOperatorRuntimePolicy({
        ...safePolicy,
        runtime_policy: { ...safePolicy.runtime_policy, [field]: true }
      }),
      new RegExp(`operator_runtime_policy_enabled:${field}`)
    );
  }
});
