import assert from "node:assert/strict";
import test from "node:test";
import { evaluateGspcRead } from "../api/skygrid/gspc.mjs";

const NOW = "2026-09-14T23:00:00.000Z";

test("returns a bounded 404 for an unknown upstream GSPC axis", async () => {
  const result = await evaluateGspcRead({
    axis: "nope",
    now: () => NOW,
    fetchImpl: async () => ({
      ok: false,
      status: 404,
      async json() { return { error: "unknown axis", known: ["governance", "safety", "provenance"] }; }
    })
  });
  assert.equal(result.status, 404);
  assert.equal(result.body.reason, "gspc_axis_unknown");
  assert.deepEqual(result.body.known, ["governance", "safety", "provenance"]);
  assert.equal(result.body.execution_allowed, false);
});
