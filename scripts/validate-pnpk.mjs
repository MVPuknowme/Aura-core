import { readFile } from "node:fs/promises";
import { validatePostBuildPolicy } from "./run-pnpk-postbuild.mjs";

const file = process.env.PNPK_PATH || "bridge/skygrid-emergency-onramp.pnpk";
const raw = await readFile(file, "utf8");
const pnpk = JSON.parse(raw);

const required = [
  "pnpk_version",
  "pnpk_profile",
  "service",
  "mode",
  "sentinel",
  "runtime_policy",
  "routes",
  "platforms",
  "triggers",
  "partitions",
  "post_build_pipeline"
];

const missing = required.filter((key) => !(key in pnpk));

if (missing.length) {
  console.error("PNPK validation failed. Missing:", missing.join(", "));
  process.exit(1);
}

if (pnpk.mode !== "controlled_pilot") {
  console.error("PNPK validation failed: mode must be controlled_pilot");
  process.exit(1);
}

if (pnpk.sentinel !== "fail_closed") {
  console.error("PNPK validation failed: sentinel must be fail_closed");
  process.exit(1);
}

try {
  validatePostBuildPolicy(pnpk);
} catch (error) {
  console.error(`PNPK validation failed: ${error.message}`);
  process.exit(1);
}

const policy = pnpk.runtime_policy;

for (const key of [
  "payment_execution",
  "device_activation",
  "production_failover",
  "private_data_movement"
]) {
  if (policy[key] !== false) {
    console.error(`PNPK validation failed: ${key} must be false`);
    process.exit(1);
  }
}

const capacityDelivery = pnpk.provisioning_router?.capacity_lease_delivery;

if (!capacityDelivery?.enabled) {
  console.error("PNPK validation failed: capacity lease delivery must be enabled");
  process.exit(1);
}

if (
  capacityDelivery.execution_authority !== "none" ||
  capacityDelivery.activation_grant_required !== true
) {
  console.error("PNPK validation failed: capacity leases require a separate activation grant and no PNPK execution authority");
  process.exit(1);
}

for (const key of [
  "automatic_shrink_allowed",
  "delete_existing_partition_allowed",
  "system_or_boot_disk_allowed"
]) {
  if (capacityDelivery.partition_policy?.[key] !== false) {
    console.error(`PNPK validation failed: capacity partition policy ${key} must be false`);
    process.exit(1);
  }
}

if (
  capacityDelivery.partition_policy?.unallocated_space_only !== true ||
  capacityDelivery.partition_policy?.storage_layout_hash_match_required !== true ||
  capacityDelivery.partition_policy?.rollback_proof_required !== true
) {
  console.error("PNPK validation failed: capacity partition changes require unallocated space, layout hash, and rollback proof");
  process.exit(1);
}

const capacityPartition = pnpk.partitions?.capacity_lease;

if (
  capacityPartition?.sentinel !== "fail_closed" ||
  capacityPartition?.execution_authority !== "none" ||
  capacityPartition?.activation_grant_required !== true
) {
  console.error("PNPK validation failed: capacity lease partition must fail closed without execution authority");
  process.exit(1);
}

for (const key of [
  "system_or_boot_disk_allowed",
  "automatic_volume_shrink_allowed",
  "partition_delete_allowed"
]) {
  if (capacityPartition?.[key] !== false) {
    console.error(`PNPK validation failed: capacity lease partition ${key} must be false`);
    process.exit(1);
  }
}

for (const [name, partition] of Object.entries(pnpk.partitions)) {
  if (partition.sentinel !== "fail_closed") {
    console.error(`PNPK validation failed: partition ${name} must fail closed`);
    process.exit(1);
  }
}

const bridgePlatform = pnpk.platforms?.allbridge_core;
const ethernetPlatform = pnpk.platforms?.ethernet;
const solanaPlatform = pnpk.platforms?.solana_playground;

if (
  !ethernetPlatform?.enabled ||
  ethernetPlatform.os_network_switching_allowed !== false ||
  ethernetPlatform.interface_reconfiguration_allowed !== false
) {
  console.error("PNPK validation failed: Ethernet must remain verification-only");
  process.exit(1);
}

if (
  !bridgePlatform?.enabled ||
  bridgePlatform.bridge_execution_allowed !== false ||
  bridgePlatform.wallet_signing_allowed !== false ||
  bridgePlatform.transaction_broadcast_allowed !== false
) {
  console.error("PNPK validation failed: Allbridge Core must remain preflight-only");
  process.exit(1);
}

if (
  !solanaPlatform?.enabled ||
  solanaPlatform.wallet_signing_allowed !== false ||
  solanaPlatform.transaction_broadcast_allowed !== false ||
  solanaPlatform.program_deployment_allowed !== false
) {
  console.error("PNPK validation failed: Solana Playground must remain validation-only");
  process.exit(1);
}

console.log("PNPK validation passed:", {
  service: pnpk.service,
  mode: pnpk.mode,
  sentinel: pnpk.sentinel
});
