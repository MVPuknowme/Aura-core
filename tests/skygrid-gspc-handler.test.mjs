import assert from "node:assert/strict";
import test from "node:test";

const ROUTE_PATH = new URL("../api/skygrid/gspc.mjs", import.meta.url);

function mockResponse() {
  const state = { headers: {}, status: null, body: null };
  return {
    state,
    setHeader(name, value) { state.headers[name] = value; },
    status(code) { state.status = code; return this; },
    json(body) { state.body = body; return this; }
  };
}

test("exports a deployable Vercel handler", async () => {
  const route = await import(ROUTE_PATH);
  assert.equal(typeof route.default, "function");
});

test("serves a live read-only GSPC GET with fail-closed headers", async () => {
  const { default: handler } = await import(ROUTE_PATH);
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    async json() { return { schema: "csoai.gspc-axes/0.5", issuer: "CSOAI Ltd", axis: [{ axis: "safety" }] }; }
  });
  const res = mockResponse();
  try {
    await handler({ method: "GET", query: { axis: "safety" } }, res);
  } finally {
    globalThis.fetch = originalFetch;
  }
  assert.equal(res.state.status, 200);
  assert.equal(res.state.body.reason, "gspc_read_verified");
  assert.deepEqual(res.state.body.query, { axis: "safety" });
  assert.equal(res.state.headers["X-SKYGRID-Sentinel"], "fail_closed");
  assert.equal(res.state.headers["X-SKYGRID-Execution"], "disabled");
});
