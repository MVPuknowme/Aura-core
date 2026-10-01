import { createHash } from "node:crypto";

function text(value, field) {
  const out = String(value ?? "").trim();
  if (!out) throw new Error(`${field}_required`);
  return out;
}

function bool(value, field) {
  if (value !== true && value !== false) throw new Error(`${field}_invalid`);
  return value;
}

function hash(value) {
  return `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
}

export function evaluateProductionRelightPreflight(input = {}, now = new Date()) {
  const routeId = text(input.routeId, "route_id");
  const grantId = text(input.activationGrantId, "activation_grant_id");
  const checks = {
    owned_route: bool(input.ownedRoute, "owned_route"),
    previously_authorized: bool(input.previouslyAuthorized, "previously_authorized"),
    degraded_or_down: bool(input.degradedOrDown, "degraded_or_down"),
    pnpk_passed: bool(input.pnpkPassed, "pnpk_passed"),
    signed_activation_grant: bool(input.signedActivationGrant, "signed_activation_grant"),
    owner_approved: bool(input.ownerApproved, "owner_approved"),
    emergency_operator_approved: bool(input.emergencyOperatorApproved, "emergency_operator_approved"),
    health_quorum: bool(input.healthQuorum, "health_quorum"),
    rollback_proof: bool(input.rollbackProof, "rollback_proof"),
    pre_receipt_written: bool(input.preReceiptWritten, "pre_receipt_written")
  };

  const failures = Object.entries(checks)
    .filter(([,passed]) => !passed)
    .map(([name]) => name);

  const decision = failures.length === 0 ? "RELIGHT_APPROVED" : "FAIL_CLOSED";
  const receipt = {
    schema: "pnpk.production-network-relight-preflight.v1",
    route_id: routeId,
    activation_grant_id: grantId,
    observed_at: now.toISOString(),
    decision,
    failures,
    checks,
    scope: {
      previously_authorized_routes_only: true,
      third_party_network_mutation_allowed: false,
      os_interface_reconfiguration_allowed: false,
      max_activation_window_minutes: 15
    },
    execution: {
      autonomous_route_creation_allowed: false,
      payment_execution_allowed: false,
      wallet_signing_allowed: false,
      transaction_broadcast_allowed: false
    }
  };
  return { ...receipt, receipt_hash: hash(receipt) };
}
