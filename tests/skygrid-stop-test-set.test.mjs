import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { run, runChecks } from "../scripts/skygrid-stop-test-set.mjs";

async function makeFixture(overrides = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "skygrid-stop-test-set-"));
  await mkdir(path.join(root, "config"), { recursive: true });

  const baseConfig = {
    schema_version: "1.0.0",
    tool: "skygrid-stop-test-set",
    control_plane: {
      source: "github",
      repository: "MVPuknowme/Aura-core",
      branch: "MVPuknowme",
      retained: true
    },
    principles: ["stop_first", "local_only", "receipt_first", "fail_closed", "github_control_retained"],
    stop_set: {
      status: "armed",
      allowed_actions: ["read_config", "verify_local_receipts", "write_stop_receipt", "validate_blocked_actions", "validate_github_control_plane"],
      blocked_actions: [
        "send_to_network",
        "broadcast_removal_payload",
        "public_ip_scan",
        "device_discovery",
        "person_tracking",
        "wifi_probe",
        "bluetooth_probe",
        "gps_collection",
        "remote_delete",
        "cloud_teardown",
        "dns_mutation",
        "secret_deletion",
        "payment_rail_mutation",
        "vercel_teardown",
        "external_webhook"
      ]
    },
    checks: [
      { id: "stop-set-armed", type: "assert_value", path: "stop_set.status", equals: "armed" },
      { id: "github-control-retained", type: "assert_value", path: "control_plane.retained", equals: true },
      { id: "no-network-emission", type: "assert_blocked_actions", actions: ["send_to_network", "broadcast_removal_payload", "public_ip_scan", "device_discovery", "external_webhook"] },
      { id: "no-destructive-remote-removal", type: "assert_blocked_actions", actions: ["remote_delete", "cloud_teardown", "dns_mutation", "secret_deletion", "payment_rail_mutation", "vercel_teardown"] },
      { id: "receipt-required", type: "write_receipt", required: true }
    ],
    receipt_namespace: "artifacts/stop-test-set",
    boundary: "This stop test set records a local stop/control proof only. It does not transmit removal payloads, scan networks, delete remote resources, mutate cloud settings, or remove devices."
  };

  const config = {
    ...baseConfig,
    ...overrides,
    control_plane: {
      ...baseConfig.control_plane,
      ...(overrides.control_plane || {})
    },
    stop_set: {
      ...baseConfig.stop_set,
      ...(overrides.stop_set || {})
    }
  };

  await writeFile(path.join(root, "config/skygrid-stop-test-set.v1.json"), JSON.stringify(config, null, 2));
  return root;
}

test("dry-run arms stop set and writes local receipt", async () => {
  const root = await makeFixture();
  const logger = { log() {}, warn() {}, error() {} };

  const receipt = await run(["--dry-run"], root, {}, logger);

  assert.equal(receipt.ok, true);
  assert.equal(receipt.mode, "dry-run");
  assert.equal(receipt.control_plane.repository, "MVPuknowme/Aura-core");
  assert.equal(receipt.control_plane.retained, true);
  assert.ok(receipt.blocked_actions.includes("send_to_network"));
  assert.ok(receipt.blocked_actions.includes("remote_delete"));
  assert.match(receipt.receipt_path, /^artifacts\/stop-test-set\/skygrid-stop-test-set-/);

  const savedReceipt = JSON.parse(await readFile(path.join(root, receipt.receipt_path), "utf8"));
  assert.equal(savedReceipt.ok, true);
  assert.match(savedReceipt.boundary, /does not transmit removal payloads/);
});

test("apply mode requires explicit approval", async () => {
  const root = await makeFixture();
  const logger = { log() {}, warn() {}, error() {} };

  await assert.rejects(
    () => run(["--apply", "--no-receipt"], root, {}, logger),
    /--apply requires --approved/
  );
});

test("network emission fails closed when not blocked", async () => {
  const root = await makeFixture({
    stop_set: {
      blocked_actions: ["remote_delete", "cloud_teardown"]
    }
  });
  const logger = { log() {}, warn() {}, error() {} };

  await assert.rejects(
    () => run(["--dry-run", "--no-receipt"], root, {}, logger),
    /SKYGRID stop test set failed closed/
  );
});

test("github control plane must remain retained", () => {
  const results = runChecks({
    control_plane: { retained: false },
    stop_set: { status: "armed", allowed_actions: [], blocked_actions: ["send_to_network"] },
    checks: [
      { id: "github-control-retained", type: "assert_value", path: "control_plane.retained", equals: true }
    ]
  });

  assert.equal(results[0].status, "failed");
  assert.equal(results[0].actual, false);
});

test("blocked actions cannot also be allowed", () => {
  const results = runChecks({
    control_plane: { retained: true },
    stop_set: {
      status: "armed",
      allowed_actions: ["send_to_network"],
      blocked_actions: ["send_to_network"]
    },
    checks: [
      { id: "no-network-emission", type: "assert_blocked_actions", actions: ["send_to_network"] }
    ]
  });

  assert.equal(results[0].status, "failed");
  assert.deepEqual(results[0].accidentally_allowed, ["send_to_network"]);
});
