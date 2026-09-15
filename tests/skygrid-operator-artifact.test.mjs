import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("operator image uses an allowlisted copy surface", async () => {
  const dockerfile = await readFile(
    path.join(repositoryRoot, "Dockerfile.operator"),
    "utf8"
  );
  const runtimeServer = await readFile(
    path.join(repositoryRoot, "scripts", "skygrid-local-runtime-server.mjs"),
    "utf8"
  );
  assert.doesNotMatch(dockerfile, /^COPY\s+\.\s+\./m);
  assert.doesNotMatch(dockerfile, /skygrid-ci-auth-bootstrap/);
  assert.doesNotMatch(runtimeServer, /skygrid-ci-auth-bootstrap/);
  assert.match(dockerfile, /operator:startup-check/);
});
