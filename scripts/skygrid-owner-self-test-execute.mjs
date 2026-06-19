import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const now = new Date().toISOString();
const safeStamp = now.replace(/[:.]/g, "-");
const root = process.cwd();

const outDir = path.join(root, ".skygrid", "owner-self-tests");
fs.mkdirSync(outDir, { recursive: true });

const safeEnv = {
  ...process.env,

  SKYGRID_OWNER_SELF_TEST: "true",
  SKYGRID_TARGET_SCOPE: "local_owned_device_only",
  SKYGRID_ACTIVATION_REQUESTED: "true",
  SKYGRID_ACTIVATION_STATE: "owner_self_test_execute_ready",

  // Allowed only for local owner proof/readiness generation.
  SKYGRID_ALLOWED_TO_EXECUTE: "true",
  SKYGRID_ALLOWED_EXECUTION_SCOPE:
    "local_proof_packet_generation,local_readiness_packet_generation,non_emergency_observe_and_draft",

  // These remain false in controlled pilot.
  SKYGRID_AUTONOMOUS_CONTROL: "false",
  SKYGRID_DEVICE_ACTIVATION: "false",
  SKYGRID_PRODUCTION_FAILOVER: "false",
  SKYGRID_PRIVATE_DATA_MOVEMENT: "false",
  SKYGRID_MOVES_FUNDS: "false",
  SKYGRID_SIGNS_TRANSACTIONS: "false",
  SKYGRID_BRIDGES_TOKENS: "false",
  SKYGRID_ROUTES_THIRD_PARTY_TRAFFIC: "false",
  SKYGRID_PRODUCTION_EMERGENCY_DISPATCH: "false",

  SKYGRID_OFF_SWITCH_REQUIRED: "true",
  SKYGRID_AUDIT_LOG_REQUIRED: "true"
};

const packet = {
  service: "SKYGRID Emergency Data On-Ramp",
  mode: "controlled_pilot",
  operator_mode: "operator-assist",
  sentinel: "fail_closed",

  ownerSelfTest: true,
  targetScope: "local_owned_device_only",
  activationRequested: true,
  activationState: "owner_self_test_execute_ready",

  allowedToExecute: true,
  allowedExecutionScope: [
    "local_proof_packet_generation",
    "local_readiness_packet_generation",
    "non_emergency_observe_and_draft"
  ],

  autonomousControl: false,
  device_activation: false,
  production_failover: false,
  private_data_movement: false,
  movesFunds: false,
  signsTransactions: false,
  bridgesTokens: false,
  routesThirdPartyTraffic: false,
  productionEmergencyDispatch: false,

  offSwitchRequired: true,
  auditLogRequired: true,
  generated_at: now
};

const packetPath = path.join(outDir, `owner-self-test-${safeStamp}.json`);
fs.writeFileSync(packetPath, JSON.stringify(packet, null, 2) + "\n");

console.log(`SKYGRID owner self-test packet written: ${packetPath}`);

function runNodeScript(scriptRelativePath, args = []) {
  const scriptPath = path.join(root, scriptRelativePath);

  if (!fs.existsSync(scriptPath)) {
    console.error(`Missing script: ${scriptPath}`);
    process.exit(1);
  }

  console.log(`Running: node ${scriptRelativePath} ${args.join(" ")}`.trim());

  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: root,
    stdio: "inherit",
    env: safeEnv
  });

  if (result.error) {
    console.error(`Failed to start ${scriptRelativePath}:`, result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    console.error(`${scriptRelativePath} failed with exit code ${result.status}`);
    process.exit(result.status ?? 1);
  }
}

console.log("Running bounded local proof generation...");
runNodeScript("scripts/skygrid-local-worker-start.mjs", ["--approve-owner-test"]);

console.log("Running bounded Ethereum/L2 observe-and-draft generation...");
runNodeScript("scripts/skygrid-ethereum-collection-draft.mjs");

console.log("Owner self-test completed safely.");
console.log("Scope: local owned device only.");
console.log("No funds moved. No signing. No bridging. No production failover. No private data movement.");
