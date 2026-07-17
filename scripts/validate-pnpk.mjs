import { readFile } from "node:fs/promises";

const file = "bridge/skygrid-emergency-onramp.pnpk";
const raw = await readFile(file, "utf8");
const pnpk = JSON.parse(raw);

const required = [
  "pnpk_version",
  "service",
  "mode",
  "sentinel",
  "runtime_policy",
  "routes",
  "platforms",
  "triggers"
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

const capacityPartition = pnpk.partitions?.capacity_lease;

if (
  capacityPartition?.sentinel !== "fail_closed" ||
  capacityPartition?.execution_authority !== "none" ||
  capacityPartition?.activation_grant_required !== true
) {
  console.error("PNPK validation failed: capacity lease partition must fail closed without execution authority");
  process.exit(1);
}

console.log("PNPK validation passed:", {
  service: pnpk.service,
  mode: pnpk.mode,
  sentinel: pnpk.sentinel
});
