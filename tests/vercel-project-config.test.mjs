import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const config = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url), "utf8"));

test("primary Vercel project uses the Aura-Core pnpm build path", () => {
  assert.equal(config.installCommand, "pnpm install --frozen-lockfile");
  assert.equal(config.buildCommand, "pnpm run build");
  assert.notMatch(config.buildCommand, /xmcp\s+build/);
});
