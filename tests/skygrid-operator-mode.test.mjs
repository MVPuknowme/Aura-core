import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_SKYGRID_OPERATOR,
  resolveOperatorConfig
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
