import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";

const ROUTE_PATH = new URL("../api/skygrid/gspc.mjs", import.meta.url);

test("ships the SKYGRID GSPC read route", () => {
  assert.equal(existsSync(ROUTE_PATH), true);
});
