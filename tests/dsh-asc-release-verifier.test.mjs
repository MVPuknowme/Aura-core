import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const SCRIPT = new URL("../scripts/verify-dsh-asc-release.ps1", import.meta.url);
const URL = "https://github.com/lmst2/dsh-asc/releases/download/v0.2.0/dsh-asc-0.2.0.tgz";
const SHA256 = "fbc1325a0167612fef34a0cfb9c79cfcdb60de446f6404f5bd9e7189c8e21b60";

test("ships the pinned dsh-asc PowerShell verifier", () => {
  assert.equal(existsSync(SCRIPT), true);
});

test("downloads, hashes, rejects mismatches, then lists the archive", () => {
  const source = readFileSync(SCRIPT, "utf8");
  assert.equal(source.includes(URL), true);
  assert.equal(source.includes(SHA256), true);
  assert.equal(source.includes("Invoke-WebRequest"), true);
  assert.equal(source.includes("Get-FileHash"), true);
  assert.equal(source.includes("Remove-Item"), true);
  assert.equal(source.includes("tar -tzf"), true);
  assert.ok(source.indexOf("Get-FileHash") < source.indexOf("tar -tzf"));
  assert.ok(source.indexOf("throw") < source.indexOf("tar -tzf"));
});
