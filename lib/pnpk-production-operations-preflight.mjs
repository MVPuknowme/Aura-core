import { createHash } from "node:crypto";

const RELIGHT_ACTIONS = new Set([
  "restart_runtime",
  "reenable_route",
  "promote_verified_healthy_route"
]);

function clean(value, field) {
  const out = String(value ?? "").trim();
  if (!out) throw new Error(`${field}_required`);
  return out;
}

function finite(value, field, min = 0, max = 1) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new Error(`${field}_invalid`);
  }
  return parsed;
}

function stable(value) {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(stable);
  const out = {};
  for (const key of Object.keys(value).sort()) out[key] = stable(value[key]);
  return out;
}

function digest(value) {
  return `sha256:${createHash("sha256")
    .update(JSON.stringify(stable(value)))
    .digest("hex")}`;
}

function validHash(value) {
  return typeof value === "string" && /^sha256:[a-f0-9]{6,}$/i.test(value);
}

export function evaluateProductionOperationsPreflight(input = {}, now = new Date()) {
  const operation = clean(input.operation, "operation");
  if (!new Set(["live_validation", "network_relight"]).has(operation)) {
    throw new Error("operation_invalid");
  }

  const target = {
    id: clean(input.target?.id, "target_id"),
    ownership: clean(input.target?.ownership, "target_ownership"),
    environment: clean(input.target?.environment, "target_environment"),
    route_or_runtime: clean(input.target?.route_or_runtime, "target_route_or_runtime")
  };

  const authorization = input.authorization ?? {};
  const evidence = input.evidence ?? {};
  const failures = [];

  if (!new Set(["skygrid_owned", "owner_authorized_lease"]).has(target.ownership)) {
    failures.push("target_not_owned_or_authorized");
  }
  if (target.environment !== "production") failures.push("target_not_production");
  if (authorization.audit_writable !== true) failures.push("audit_not_writable");
  if (authorization.pnpk_policy_current !== true) failures.push("pnpk_policy_not_current");
  if (authorization.private_data_movement_requested === true) {
    failures.push("private_data_movement_requested");
  }
  if (authorization.third_party_scanning_requested === true) {
    failures.push("third_party_scanning_requested");
  }

  let executionEligible = false;

  if (operation === "live_validation") {
    if (authorization.validation_scope_approved !== true) {
      failures.push("validation_scope_not_approved");
    }
    if (!validHash(evidence.validation_plan_hash)) {
      failures.push("validation_plan_hash_invalid");
    }
    if (authorization.payout_promotion_requested === true) {
      failures.push("validation_cannot_promote_payout");
    }

    executionEligible = failures.length === 0;
  }

  if (operation === "network_relight") {
    const action = clean(input.action, "action");
    if (!RELIGHT_ACTIONS.has(action)) failures.push("relight_action_not_allowlisted");
    if (authorization.operator_approved !== true) failures.push("operator_approval_missing");
    if (!validHash(authorization.activation_grant_hash)) {
      failures.push("activation_grant_missing_or_invalid");
    }
    if (authorization.production_failover_requested === true) {
      failures.push("full_production_failover_requires_separate_authority");
    }
    if (authorization.os_network_switching_requested === true) {
      failures.push("os_network_switching_not_authorized");
    }
    if (authorization.route_mutation_outside_target === true) {
      failures.push("mutation_outside_bound_target");
    }
    if (evidence.rollback_verified !== true) failures.push("rollback_not_verified");

    const confidence = finite(evidence.confidence_score, "confidence_score");
    if (confidence < 0.9) failures.push("confidence_below_0_90");

    const quorum = Number(evidence.health_quorum_count ?? 0);
    if (!Number.isInteger(quorum) || quorum < 2) failures.push("health_quorum_below_2");

    if (!validHash(evidence.health_evidence_hash)) {
      failures.push("health_evidence_hash_invalid");
    }
    if (!validHash(evidence.rollback_receipt_hash)) {
      failures.push("rollback_receipt_hash_invalid");
    }

    executionEligible = failures.length === 0;
  }

  const decision =
    failures.length === 0 ? "EXECUTION_ELIGIBLE" : "FAIL_CLOSED";

  const receipt = {
    schema: "pnpk.production-operations-preflight.v1",
    observed_at: now.toISOString(),
    operation,
    action: operation === "network_relight" ? String(input.action) : null,
    target,
    decision,
    failures,
    authorization_boundary: {
      live_validation_execution_allowed: operation === "live_validation",
      network_relight_execution_allowed: operation === "network_relight",
      full_production_failover_allowed: false,
      payment_execution_allowed: false,
      wallet_signing_allowed: false,
      transaction_broadcast_allowed: false,
      private_data_movement_allowed: false,
      os_network_switching_allowed: false,
      third_party_scanning_allowed: false
    },
    execution: {
      eligible: executionEligible,
      performed: false,
      separate_execution_adapter_required: true
    }
  };

  return Object.freeze({
    ...receipt,
    receipt_hash: digest(receipt)
  });
}

export const PNPk_PRODUCTION_RELIGHT_ACTIONS = Object.freeze([
  ...RELIGHT_ACTIONS
]);
