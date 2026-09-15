import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";

const SCRIPT = new URL("../scripts/verify-dsh-asc-release.ps1", import.meta.url);

test("ships the pinned dsh-asc PowerShell verifier", () => {
  assert.equal(existsSync(SCRIPT), true);
});
