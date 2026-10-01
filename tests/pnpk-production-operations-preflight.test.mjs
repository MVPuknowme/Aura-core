import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateProductionOperationsPreflight
} from "../lib/pnpk-production-operations-preflight.mjs";

function base() {
  return {
    target: {
      id: "klamath-falls-core",
      ownership: "skygrid_owned",
      environment: "production",
      route_or_runtime: "validator"
    },
    authorization: {
      audit_writable: true,
      pnpk_policy_current: true,
      private_data_movement_requested: false,
      third_party_scanning_requested: false
    },
    evidence: {}
  };
}

test("allows bounded live validation on authorized production targets", () => {
  const input = base();
  input.operation = "live_validation";
  input.authorization.validation_scope_approved = true;
  input.evidence.validation_plan_hash = "sha256:abcdef123456";

  const out = evaluateProductionOperationsPreflight(input);
  assert.equal(out.decision, "EXECUTION_ELIGIBLE");
  assert.equal(out.execution.performed, false);
  assert.equal(out.authorization_boundary.full_production_failover_allowed, false);
});

test("blocks live validation from promoting payout status", () => {
  const input = base();
  input.operation = "live_validation";
  input.authorization.validation_scope_approved = true;
  input.authorization.payout_promotion_requested = true;
  input.evidence.validation_plan_hash = "sha256:abcdef123456";

  const out = evaluateProductionOperationsPreflight(input);
  assert.equal(out.decision, "FAIL_CLOSED");
  assert.ok(out.failures.includes("validation_cannot_promote_payout"));
});

test("allows a bounded network relight only with quorum grant and rollback", () => {
  const input = base();
  input.operation = "network_relight";
  input.action = "restart_runtime";
  input.authorization.operator_approved = true;
  input.authorization.activation_grant_hash = "sha256:123456abcdef";
  input.authorization.production_failover_requested = false;
  input.authorization.os_network_switching_requested = false;
  input.authorization.route_mutation_outside_target = false;
  input.evidence.confidence_score = 0.97;
  input.evidence.health_quorum_count = 3;
  input.evidence.health_evidence_hash = "sha256:feedface1234";
  input.evidence.rollback_verified = true;
  input.evidence.rollback_receipt_hash = "sha256:deadbeef1234";

  const out = evaluateProductionOperationsPreflight(input);
  assert.equal(out.decision, "EXECUTION_ELIGIBLE");
  assert.equal(out.authorization_boundary.network_relight_execution_allowed, true);
  assert.equal(out.execution.separate_execution_adapter_required, true);
});

test("fails relight closed without health quorum or activation grant", () => {
  const input = base();
  input.operation = "network_relight";
  input.action = "reenable_route";
  input.authorization.operator_approved = true;
  input.authorization.activation_grant_hash = "";
  input.evidence.confidence_score = 0.99;
  input.evidence.health_quorum_count = 1;
  input.evidence.health_evidence_hash = "sha256:feedface1234";
  input.evidence.rollback_verified = true;
  input.evidence.rollback_receipt_hash = "sha256:deadbeef1234";

  const out = evaluateProductionOperationsPreflight(input);
  assert.equal(out.decision, "FAIL_CLOSED");
  assert.ok(out.failures.includes("activation_grant_missing_or_invalid"));
  assert.ok(out.failures.includes("health_quorum_below_2"));
});

test("never upgrades a relight into unrestricted production failover", () => {
  const input = base();
  input.operation = "network_relight";
  input.action = "promote_verified_healthy_route";
  input.authorization.operator_approved = true;
  input.authorization.activation_grant_hash = "sha256:123456abcdef";
  input.authorization.production_failover_requested = true;
  input.evidence.confidence_score = 0.99;
  input.evidence.health_quorum_count = 2;
  input.evidence.health_evidence_hash = "sha256:feedface1234";
  input.evidence.rollback_verified = true;
  input.evidence.rollback_receipt_hash = "sha256:deadbeef1234";

  const out = evaluateProductionOperationsPreflight(input);
  assert.equal(out.decision, "FAIL_CLOSED");
  assert.ok(out.failures.includes("full_production_failover_requires_separate_authority"));
});
