import { readFile } from "node:fs/promises";
import { routePartitionDecision } from "./skygrid-partition-router.mjs";

const pnpkPath = process.env.PNPK_PATH || "bridge/skygrid-emergency-onramp.pnpk";
const pnpk = JSON.parse(await readFile(pnpkPath, "utf8"));

const simulations = [
  {
    name: "emergency_valid",
    expected_ok: true,
    envelope: { route_type: "emergency", requested_ramp: "aws_lambda", requested_node: "validator" }
  },
  {
    name: "diagnostic_valid",
    expected_ok: true,
    envelope: { route_type: "diagnostic", requested_ramp: "postman", requested_node: "home" }
  },
  {
    name: "web3_quote_valid",
    expected_ok: true,
    envelope: {
      route_type: "web3_quote",
      requested_ramp: "arbitrum",
      requested_node: "validator",
      wallet_signing_requested: false,
      transaction_broadcast_requested: false,
      payment_execution_requested: false
    }
  },
  {
    name: "autodrill_valid",
    expected_ok: true,
    envelope: {
      route_type: "autodrill",
      requested_ramp: "vercel",
      requested_node: "edge",
      production_failover_requested: false,
      wallet_signing_requested: false,
      transaction_broadcast_requested: false,
      payment_execution_requested: false
    }
  },
  {
    name: "capacity_lease_preflight_valid",
    expected_ok: true,
    envelope: {
      route_type: "capacity_lease",
      requested_ramp: "vercel",
      requested_node: "home"
    }
  },
  {
    name: "ethernet_allbridge_prerun_valid",
    expected_ok: true,
    envelope: {
      route_type: "bridge_preflight",
      requested_ramp: "allbridge_core",
      requested_transport: "ethernet",
      requested_node: "validator"
    }
  },
  {
    name: "solana_playground_preflight_valid",
    expected_ok: true,
    envelope: {
      route_type: "solana_playground",
      requested_ramp: "solana_playground",
      requested_node: "validator"
    }
  },
  {
    name: "unsafe_capacity_disk_partition",
    expected_ok: false,
    envelope: {
      route_type: "capacity_lease",
      requested_ramp: "vercel",
      requested_node: "home",
      disk_partition_requested: true
    }
  },
  {
    name: "unsafe_allbridge_execution",
    expected_ok: false,
    envelope: {
      route_type: "bridge_preflight",
      requested_ramp: "allbridge_core",
      requested_transport: "ethernet",
      requested_node: "validator",
      bridge_execution_requested: true
    }
  },
  {
    name: "unsafe_solana_program_deployment",
    expected_ok: false,
    envelope: {
      route_type: "solana_playground",
      requested_ramp: "solana_playground",
      requested_node: "validator",
      program_deployment_requested: true
    }
  },
  {
    name: "unapproved_allbridge_transport",
    expected_ok: false,
    envelope: {
      route_type: "bridge_preflight",
      requested_ramp: "allbridge_core",
      requested_transport: "wifi",
      requested_node: "validator"
    }
  },
  {
    name: "unknown_route_type",
    expected_ok: false,
    envelope: { route_type: "unknown", requested_ramp: "vercel", requested_node: "edge" }
  },
  {
    name: "unsafe_web3_signing",
    expected_ok: false,
    envelope: {
      route_type: "web3_quote",
      requested_ramp: "arbitrum",
      requested_node: "validator",
      wallet_signing_requested: true
    }
  },
  {
    name: "unsafe_web3_broadcast",
    expected_ok: false,
    envelope: {
      route_type: "web3_quote",
      requested_ramp: "arbitrum",
      requested_node: "validator",
      transaction_broadcast_requested: true
    }
  },
  {
    name: "unsafe_payment_execution",
    expected_ok: false,
    envelope: {
      route_type: "web3_quote",
      requested_ramp: "base",
      requested_node: "validator",
      payment_execution_requested: true
    }
  },
  {
    name: "unsafe_autodrill_failover",
    expected_ok: false,
    envelope: {
      route_type: "autodrill",
      requested_ramp: "aws_lambda",
      requested_node: "field",
      production_failover_requested: true
    }
  },
  {
    name: "unapproved_ramp",
    expected_ok: false,
    envelope: { route_type: "emergency", requested_ramp: "arbitrum", requested_node: "validator" }
  },
  {
    name: "unapproved_node",
    expected_ok: false,
    envelope: { route_type: "diagnostic", requested_ramp: "postman", requested_node: "partner" }
  }
];

const results = simulations.map((simulation) => {
  const decision = routePartitionDecision(simulation.envelope, pnpk);
  const pass = decision.ok === simulation.expected_ok;

  return {
    name: simulation.name,
    expected_ok: simulation.expected_ok,
    actual_ok: decision.ok,
    pass,
    envelope: simulation.envelope,
    decision
  };
});

const passed = results.filter((result) => result.pass).length;
const failed = results.length - passed;

const report = {
  ok: failed === 0,
  service: pnpk.service,
  mode: pnpk.mode,
  sentinel: pnpk.sentinel,
  simulation_count: results.length,
  passed,
  failed,
  results
};

console.log(JSON.stringify(report, null, 2));

if (!report.ok) process.exit(1);
