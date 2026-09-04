import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { buildProximityMetrics, isPrivateOrLoopbackCidr, run } from "../scripts/pnpk-local-vpn-proximity-runner.mjs";

async function makeFixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "pnpk-proximity-"));
  await mkdir(path.join(root, "config"), { recursive: true });
  await writeFile(path.join(root, "config/pnpk-local-vpn-proximity.v1.json"), JSON.stringify({
    schema_version: "1.0.0",
    profile: "pnpk-local-vpn-proximity",
    principles: ["local_only", "receipt_first", "fail_closed"],
    proximity: {
      radius_miles: 3,
      geometry: "radius_square",
      anchor_source: "test-anchor"
    },
    vpn: {
      mode: "local_vpn_only"
    },
    pnpk: {
      receipt_namespace: "artifacts/pnpk/proximity",
      network_actions: "none",
      cloud_actions: "none"
    },
    blocked_actions: [
      "public_ip_scan",
      "device_discovery",
      "person_tracking",
      "wifi_probe",
      "bluetooth_probe",
      "gps_collection"
    ],
    checks: [
      { id: "vpn-cidr-locality", type: "assert_private_or_loopback_cidr", env: "SKYGRID_LOCAL_VPN_CIDR" },
      { id: "proximity-radius-cap", type: "assert_radius_at_or_below_miles", max_miles: 3 },
      { id: "pnpk-local-receipt", type: "write_receipt", required: true }
    ]
  }, null, 2));
  return root;
}

test("proximity metrics map 3-mile R square", () => {
  const metrics = buildProximityMetrics(3, "radius_square");
  assert.deepEqual(metrics, {
    geometry: "radius_square",
    radius_miles: 3,
    radius_squared_miles: 9,
    bounding_box_side_miles: 6,
    bounding_box_area_square_miles: 36
  });
});

test("CIDR validation allows only local/private ranges", () => {
  assert.equal(isPrivateOrLoopbackCidr("127.0.0.1/32"), true);
  assert.equal(isPrivateOrLoopbackCidr("10.2.3.0/24"), true);
  assert.equal(isPrivateOrLoopbackCidr("172.20.0.0/16"), true);
  assert.equal(isPrivateOrLoopbackCidr("192.168.1.0/24"), true);
  assert.equal(isPrivateOrLoopbackCidr("8.8.8.0/24"), false);
});

test("dry-run writes local receipt without network or cloud action", async () => {
  const root = await makeFixture();
  const logger = { log() {}, warn() {}, error() {} };

  const result = await run(["--dry-run"], root, {
    SKYGRID_LOCAL_VPN_CIDR: "127.0.0.1/32",
    SKYGRID_PNPK_ANCHOR_LABEL: "test-anchor"
  }, logger);

  assert.equal(result.ok, true);
  assert.equal(result.mode, "dry-run");
  assert.equal(result.proximity.radius_miles, 3);
  assert.equal(result.proximity.radius_squared_miles, 9);
  assert.match(result.receipt_path, /^artifacts\/pnpk\/proximity\/pnpk-local-vpn-proximity-/);

  const receipt = JSON.parse(await readFile(path.join(root, result.receipt_path), "utf8"));
  assert.equal(receipt.ok, true);
  assert.equal(receipt.vpn.cidr_class, "private_or_loopback");
  assert.match(receipt.boundary, /does not scan networks/);
});

test("apply mode requires explicit approval", async () => {
  const root = await makeFixture();
  const logger = { log() {}, warn() {}, error() {} };

  await assert.rejects(
    () => run(["--apply"], root, { SKYGRID_LOCAL_VPN_CIDR: "127.0.0.1/32" }, logger),
    /--apply requires --approved/
  );
});

test("public CIDR fails closed", async () => {
  const root = await makeFixture();
  const logger = { log() {}, warn() {}, error() {} };

  await assert.rejects(
    () => run(["--dry-run", "--no-receipt"], root, { SKYGRID_LOCAL_VPN_CIDR: "8.8.8.0/24" }, logger),
    /PNPK local VPN proximity verification failed/
  );
});
