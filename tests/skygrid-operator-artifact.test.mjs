import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, copyFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("Vercel operator build emits a fail-closed controlled-pilot artifact", async () => {
  const workspace = await mkdtemp(path.join(tmpdir(), "skygrid-operator-build-"));

  try {
    await mkdir(path.join(workspace, "public"), { recursive: true });
    await copyFile(
      path.join(repositoryRoot, "public", "index.html"),
      path.join(workspace, "public", "index.html")
    );

    const result = spawnSync(
      process.execPath,
      [path.join(repositoryRoot, "scripts", "skygrid-operator-runner.mjs"), "vercel-build"],
      {
        cwd: workspace,
        env: {
          ...process.env,
          VERCEL: "1",
          SKYGRID_RUNTIME_MODE: "vercel-build",
          SKYGRID_VERCEL_BYPASS: ""
        },
        encoding: "utf8"
      }
    );

    assert.equal(result.status, 0, result.stderr || result.stdout);
    const health = JSON.parse(
      await readFile(path.join(workspace, "dist", "health.json"), "utf8")
    );
    assert.equal(health.mode, "controlled_pilot");
    assert.equal(health.sentinel, "fail_closed");
    assert.equal(health.payment_execution, false);
    assert.equal(health.device_activation, false);
    assert.equal(health.production_failover, false);
    assert.equal(health.private_data_movement, false);
    assert.equal(health.vercel_bypass, false);
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
});

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
