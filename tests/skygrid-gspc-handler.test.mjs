import assert from "node:assert/strict";
import test from "node:test";

const ROUTE_PATH = new URL("../api/skygrid/gspc.mjs", import.meta.url);

test("exports a deployable Vercel handler", async () => {
  const route = await import(ROUTE_PATH);
  assert.equal(typeof route.default, "function");
});
