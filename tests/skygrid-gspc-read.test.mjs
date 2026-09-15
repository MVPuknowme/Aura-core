import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";

const ROUTE_PATH = new URL("../api/skygrid/gspc.mjs", import.meta.url);
const NOW = "2026-09-14T23:00:00.000Z";

function response({ ok = true, status = 200, payload = {} } = {}) {
  return { ok, status, async json() { return payload; } };
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
      return response({ payload: {
        schema: "csoai.gspc-axes/0.5",
        issuer: "CSOAI Ltd",
        doi: "10.5281/zenodo.21991104",
        measured_on: { date: "2026-08-25" },
        totals: { public_count: 22, measured_axes: 22 },
        axis: [{ axis: "safety", status: "MEASURED", n: 36 }],
        note: "Measurement, not certification.",
        site_attestation: { verification_state: "SIGNED" },
        unexpected_secret: "drop-me"
      } });
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
