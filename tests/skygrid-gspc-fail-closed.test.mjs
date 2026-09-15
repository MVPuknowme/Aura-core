import assert from "node:assert/strict";
import test from "node:test";
import { evaluateGspcRead } from "../api/skygrid/gspc.mjs";

const NOW = "2026-09-14T23:00:00.000Z";

test("fails closed when the GSPC upstream times out", async () => {
  const abortError = new Error("aborted"); abortError.name = "AbortError"; let result;
  try { result = await evaluateGspcRead({ now: () => NOW, fetchImpl: async () => { throw abortError; } }); } catch { result = { status: "threw" }; }
  assert.equal(result.status, 504); assert.equal(result.body.reason, "gspc_request_timeout"); assert.equal(result.body.execution_allowed, false);
});

test("fails closed when the GSPC response is not valid JSON", async () => {
  let result;
  try {
    result = await evaluateGspcRead({ now: () => NOW, fetchImpl: async () => ({ ok: true, status: 200, async json() { throw new SyntaxError("bad json"); } }) });
  } catch { result = { status: "threw" }; }
  assert.equal(result.status, 502);
  assert.equal(result.body.reason, "gspc_response_invalid");
});
