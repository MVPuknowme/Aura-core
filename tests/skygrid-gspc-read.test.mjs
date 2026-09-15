import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";

const ROUTE_PATH = new URL("../api/skygrid/gspc.mjs", import.meta.url);
const NOW = "2026-09-14T23:00:00.000Z";

function response({ ok = true, status = 200, payload = {} } = {}) {
  return { ok, status, async json() { return payload; } };
}

function validPayload(overrides = {}) {
  return {
    schema: "csoai.gspc-axes/0.5",
    issuer: "CSOAI Ltd",
    doi: "10.5281/zenodo.21991104",
    measured_on: { date: "2026-08-25" },
    totals: { public_count: 22, measured_axes: 22 },
    axis: [{ axis: "safety", status: "MEASURED", n: 36 }],
    note: "Measurement, not certification.",
    site_attestation: { verification_state: "SIGNED" },
    ...overrides
  };
}

test("ships the SKYGRID GSPC read route", () => {
  assert.equal(existsSync(ROUTE_PATH), true);
});

test("exports a testable GSPC evaluator", async () => {
  const route = await import(ROUTE_PATH);
  assert.equal(typeof route.evaluateGspcRead, "function");
});

test("reads the canonical GSPC board and returns only allowlisted fields", async () => {
  const { evaluateGspcRead } = await import(ROUTE_PATH);
  let observedUrl;
  const result = await evaluateGspcRead({
    now: () => NOW,
    fetchImpl: async (url, options) => {
      observedUrl = url;
      assert.equal(options.method, "GET");
      return response({ payload: validPayload({ unexpected_secret: "drop-me" }) });
    }
  });
  assert.equal(observedUrl.href, "https://councilof.ai/api/gspc");
  assert.equal(result.status, 200);
  assert.equal(result.body.state, "read_verified");
  assert.equal(result.body.execution_allowed, false);
  assert.equal(result.body.data.schema, "csoai.gspc-axes/0.5");
  assert.deepEqual(result.body.data.axis, [{ axis: "safety", status: "MEASURED", n: 36 }]);
  assert.equal("unexpected_secret" in result.body.data, false);
});

test("forwards one validated axis to the canonical endpoint", async () => {
  const { evaluateGspcRead } = await import(ROUTE_PATH);
  let observedUrl;
  const result = await evaluateGspcRead({
    axis: "safety",
    now: () => NOW,
    fetchImpl: async (url) => {
      observedUrl = url;
      return response({ payload: validPayload() });
    }
  });
  assert.equal(observedUrl.href, "https://councilof.ai/api/gspc?axis=safety");
  assert.equal(result.status, 200);
  assert.equal(result.body.query.axis, "safety");
});

test("rejects malformed axis input before any upstream request", async () => {
  const { evaluateGspcRead } = await import(ROUTE_PATH);
  let called = false;
  const result = await evaluateGspcRead({
    axis: "safety&admin=true",
    now: () => NOW,
    fetchImpl: async () => { called = true; return response({ payload: validPayload() }); }
  });
  assert.equal(called, false);
  assert.equal(result.status, 400);
  assert.equal(result.body.reason, "gspc_axis_invalid");
  assert.equal(result.body.execution_allowed, false);
});
