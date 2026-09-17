import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const config = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url), "utf8"));
assert.equal(config.installCommand, "pnpm install --frozen-lockfile");
assert.equal(config.buildCommand, "pnpm run build");
assert.doesNotMatch(config.buildCommand, /xmcp\s+build/);
console.log("Vercel project config verification passed");
