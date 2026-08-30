import { spawnSync } from "node:child_process";

const gates = [
  {
    name: "operator_policy_and_artifact",
    args: [
      "--test",
      "tests/skygrid-operator-mode.test.mjs",
      "tests/skygrid-operator-artifact.test.mjs"
    ]
  },
  { name: "runtime_security", args: ["scripts/test-runtime-security.mjs"] },
  { name: "aerodrome_rpc", args: ["scripts/test-aerodrome-wallet-rpc.mjs"] },
  { name: "dual_lane_rpc", args: ["scripts/test-dual-lane-wallet-rpc.mjs"] },
  { name: "local_routing", args: ["scripts/test-local-wallet-routing.mjs"] },
  { name: "pnpk_policy", args: ["scripts/validate-pnpk.mjs"] },
  { name: "manifest_sync", args: ["scripts/verify-skygrid-manifest-sync.mjs"] },
  { name: "mcp_sdk", args: ["scripts/check-mcp-sdk.mjs"] }
];

for (const gate of gates) {
  console.log(`SKYGRID operator preflight: ${gate.name}`);
  const result = spawnSync(process.execPath, gate.args, {
    cwd: process.cwd(),
    env: process.env,
    encoding: "utf8"
  });

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`operator_preflight_failed:${gate.name}`);
  }
}

console.log(JSON.stringify({
  ok: true,
  check: "skygrid_operator_preflight",
  executionAllowed: false,
  gates: gates.map((gate) => gate.name)
}, null, 2));
