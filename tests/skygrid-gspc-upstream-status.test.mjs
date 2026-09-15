import assert from "node:assert/strict";
import test from "node:test";
import { evaluateGspcRead } from "../api/skygrid/gspc.mjs";

test("fails closed on a non-404 upstream error status", async () => {
  const result = await evaluateGspcRead({
    fetchImpl: async () => ({
      ok: false,
      status: 503,
      async json() { return { schema: "csoai.gspc-axes/0.5" }; }
    })
  });
  assert.equal(result.status, 502);
  assert.equal(result.body.reason, "gspc_upstream_unavailable");
  assert.equal(result.body.upstream_status, 503);
});
