import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

import { routePartitionDecision } from "../scripts/skygrid-partition-router.mjs";

test("network_relight is a routable fail-closed PNPK partition", async () => {
  const policy = JSON.parse(
    await readFile(
      new URL("../bridge/skygrid-emergency-onramp.pnpk", import.meta.url),
      "utf8"
    )
  );

  const out = routePartitionDecision(
    {
      route_type: "network_relight",
      requested_ramp: "aws_lambda",
      requested_node: "validator",
      requested_transport: null
    },
    policy
  );

  assert.equal(out.ok, true);
  assert.equal(out.selected_partition, "network_relight");
  assert.equal(out.sentinel, "fail_closed");
});

test("canonical PNPK validation rejects weakened production relight policy", async () => {
  const source = JSON.parse(
    await readFile(
      new URL("../bridge/skygrid-emergency-onramp.pnpk", import.meta.url),
      "utf8"
    )
  );
  source.provisioning_router.production_operations.lanes.network_relight.health_quorum_required = false;

  const dir = await mkdtemp(path.join(os.tmpdir(), "pnpk-relight-"));
  const file = path.join(dir, "policy.pnpk");
  await writeFile(file, JSON.stringify(source));

  const run = spawnSync(
    process.execPath,
    ["scripts/validate-pnpk.mjs"],
    {
      cwd: new URL("..", import.meta.url),
      env: { ...process.env, PNPK_PATH: file },
      encoding: "utf8"
    }
  );

  assert.notEqual(run.status, 0);
  assert.match(
    `${run.stdout}\n${run.stderr}`,
    /production relight.*health quorum/i
  );
});

test("Auto-Drill example is a JSON-compatible recognized PNPK profile", async () => {
  const raw = await readFile(
    new URL("../examples/autodrill-healthcheck.pnpk", import.meta.url),
    "utf8"
  );
  const profile = JSON.parse(raw);

  assert.equal(profile.pnpk_profile, "autodrill-healthcheck");
  assert.equal(profile.mode, "controlled_pilot");
  assert.equal(profile.validation.fail_closed, true);
  assert.equal(profile.autodrill.no_production_failover, true);
});
