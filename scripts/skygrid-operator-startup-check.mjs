import { readFile } from "node:fs/promises";
import {
  resolveOperatorConfig,
  resolveRuntimeHost,
  validateOperatorRuntimePolicy
} from "../config/skygrid-operator.mjs";
import { verifySignature } from "../api/runtime.mjs";

const config = resolveOperatorConfig();
if (config.runtimeMode !== "local-container") {
  throw new Error("operator_startup_check_requires_local_container");
}

const host = resolveRuntimeHost(process.env, config.runtimeMode);
const missingAuth = verifySignature({
  secret: "",
  timestamp: "",
  nonce: "",
  signature: "",
  rawBody: ""
});
if (missingAuth.status !== 503 || missingAuth.reason !== "ingest_auth_not_configured") {
  throw new Error("operator_auth_did_not_fail_closed");
}

const policy = JSON.parse(
  await readFile("bridge/skygrid-emergency-onramp.pnpk", "utf8")
);
validateOperatorRuntimePolicy(policy);

const PROHIBITED_EXECUTION_FLAGS = new Set([
  "arbitrary_commands_allowed",
  "automatic_shrink_allowed",
  "automatic_volume_shrink_allowed",
  "bridge_execution_allowed",
  "call_or_message_content_allowed",
  "delete_existing_partition_allowed",
  "harvest_execution_allowed",
  "interception_execution_allowed",
  "interface_reconfiguration_allowed",
  "live_mode_allowed",
  "os_network_switching_allowed",
  "os_switching_allowed",
  "partition_delete_allowed",
  "payment_execution_allowed",
  "production_failover_allowed",
  "program_deployment_allowed",
  "secrets_or_protected_details_allowed",
  "system_or_boot_disk_allowed",
  "transaction_broadcast_allowed",
  "wallet_signing_allowed"
]);

function findEnabledExecutionFlags(value, path = "policy", enabled = []) {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => findEnabledExecutionFlags(entry, `${path}[${index}]`, enabled));
  } else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      const childPath = `${path}.${key}`;
      if (PROHIBITED_EXECUTION_FLAGS.has(key) && child === true) enabled.push(childPath);
      findEnabledExecutionFlags(child, childPath, enabled);
    }
  }
  return enabled;
}

const enabledExecutionFlags = findEnabledExecutionFlags(policy);
if (enabledExecutionFlags.length > 0) {
  throw new Error(`operator_execution_flag_enabled:${enabledExecutionFlags.join(",")}`);
}

console.log(JSON.stringify({
  ok: true,
  check: "skygrid_operator_startup",
  runtimeMode: config.runtimeMode,
  host,
  authorization: config.authorization,
  executionAllowed: false,
  sentinel: policy.sentinel
}, null, 2));
