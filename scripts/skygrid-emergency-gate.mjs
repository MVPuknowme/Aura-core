import { readFile } from "node:fs/promises";
import { routePartitionDecision } from "./skygrid-partition-router.mjs";

const pnpkPath = process.env.PNPK_PATH || "bridge/skygrid-emergency-onramp.pnpk";
const pnpk = JSON.parse(await readFile(pnpkPath, "utf8"));

const routeMap = {
  emergency: "emergency",
  diagnostic: "diagnostic",
  web3_quote: "web3_quote",
  autodrill: "autodrill",
  system_health: "diagnostic",
  recovery_proof: "diagnostic",
  continuity_log: "diagnostic"
};

const emergencyStates = {
  emergency_on: ["emergency", "system_health", "recovery_proof", "continuity_log"],
  emergency_off: ["diagnostic", "system_health", "recovery_proof", "continuity_log"],
  drill_only: ["autodrill", "diagnostic", "system_health", "recovery_proof", "web3_quote"],
  diagnostic_only: ["diagnostic", "system_health", "recovery_proof", "continuity_log"]
};

function proofId(envelope) {
  return [
    "skygrid-proof",
    envelope.direction,
    envelope.emergency_state,
    envelope.route_type,
    envelope.requested_ramp,
    envelope.requested_node
  ].join("-");
}

function emergencyGateDecision(envelope) {
  const direction = envelope.direction;
  const emergency_state = envelope.emergency_state || "diagnostic_only";

  const base = {
    direction,
    route_type: envelope.route_type,
    mode: pnpk.mode,
    sentinel: pnpk.sentinel,
    emergency_state,
    guardrails: ["pnpk_required", "partition_required", "fail_closed"]
  };

  if (pnpk.service !== "SKYGRID Emergency Data On-Ramp") {
    return { ok: false, ...base, proof_id: null, reason: "wrong_service" };
  }

  if (!["onramp", "offramp"].includes(direction)) {
    return { ok: false, ...base, proof_id: null, reason: "unknown_direction" };
  }

  if (!emergencyStates[emergency_state]?.includes(envelope.route_type)) {
    return { ok: false, ...base, proof_id: null, reason: "emergency_state_blocks_route" };
  }

  if (
    envelope.wallet_signing_requested ||
    envelope.transaction_broadcast_requested ||
    envelope.payment_execution_requested ||
    envelope.production_failover_requested ||
    envelope.private_data_movement_requested
  ) {
    return { ok: false, ...base, proof_id: null, reason: "unsafe_data_movement_requested" };
  }

  const mappedRoute = routeMap[envelope.route_type];

  if (!mappedRoute) {
    return { ok: false, ...base, proof_id: null, reason: "unknown_route_type" };
  }

  const decision = routePartitionDecision(
    { ...envelope, route_type: mappedRoute },
    pnpk
  );

  return {
    ok: decision.ok,
    ...base,
    selected_partition: decision.selected_partition,
    selected_ramp: decision.selected_ramp,
    selected_node_group: decision.selected_node_group,
    guardrails: decision.ok
      ? [...new Set([...base.guardrails, ...decision.guardrails, "no_unrestricted_data_movement"])]
      : [...new Set([...base.guardrails, ...decision.guardrails])],
    proof_id: decision.ok ? proofId(envelope) : null,
    reason: decision.ok ? "aura_trust_gate_approved" : decision.reason
  };
}

const tests = [
  {
    name: "approved_emergency_onramp",
    expected_ok: true,
    envelope: {
      direction: "onramp",
      emergency_state: "emergency_on",
      route_type: "emergency",
      requested_ramp: "aws_lambda",
      requested_node: "validator"
    }
  },
  {
    name: "approved_emergency_offramp",
    expected_ok: true,
    envelope: {
      direction: "offramp",
      emergency_state: "emergency_on",
      route_type: "recovery_proof",
      requested_ramp: "postman",
      requested_node: "validator"
    }
  },
  {
    name: "emergency_off_blocks_emergency_route",
    expected_ok: false,
    envelope: {
      direction: "onramp",
      emergency_state: "emergency_off",
      route_type: "emergency",
      requested_ramp: "aws_lambda",
      requested_node: "validator"
    }
  },
  {
    name: "drill_only_allows_autodrill",
    expected_ok: true,
    envelope: {
      direction: "onramp",
      emergency_state: "drill_only",
      route_type: "autodrill",
      requested_ramp: "vercel",
      requested_node: "edge"
    }
  },
  {
    name: "web3_signing_blocked",
    expected_ok: false,
    envelope: {
      direction: "offramp",
      emergency_state: "drill_only",
      route_type: "web3_quote",
      requested_ramp: "arbitrum",
      requested_node: "validator",
      wallet_signing_requested: true
    }
  },
  {
    name: "diagnostic_only_blocks_emergency",
    expected_ok: false,
    envelope: {
      direction: "onramp",
      emergency_state: "diagnostic_only",
      route_type: "emergency",
      requested_ramp: "aws_lambda",
      requested_node: "validator"
    }
  },
  {
    name: "unapproved_offramp_node_blocked",
    expected_ok: false,
    envelope: {
      direction: "offramp",
      emergency_state: "emergency_on",
      route_type: "recovery_proof",
      requested_ramp: "postman",
      requested_node: "partner"
    }
  }
];

const results = tests.map((test) => {
  const decision = emergencyGateDecision(test.envelope);
  return {
    name: test.name,
    expected_ok: test.expected_ok,
    actual_ok: decision.ok,
    pass: decision.ok === test.expected_ok,
    envelope: test.envelope,
    decision
  };
});

const passed = results.filter((result) => result.pass).length;
const failed = results.length - passed;

const report = {
  ok: failed === 0,
  service: pnpk.service,
  trust_model: "PNPK-bridged Aura trust gate",
  mode: pnpk.mode,
  sentinel: pnpk.sentinel,
  simulation_count: results.length,
  passed,
  failed,
  results
};

console.log(JSON.stringify(report, null, 2));

if (!report.ok) process.exit(1);
