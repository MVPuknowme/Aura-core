import assert from "node:assert/strict";
import test from "node:test";

import { planRegionalLeaseFabric } from "../lib/autodrill-regional-lease-fabric.mjs";

function candidate(overrides = {}) {
  return {
    region: "us-west-2",
    provider: "aws",
    offer_id: "lease-001",
    resource_class: "compute",
    commercial_model: "shared_capacity_revenue_share",
    time_tier_hours: 24,
    upfront_capacity_cost_usd: 0,
    skygrid_fee_bps: 350,
    capacity_owner_share_bps: 9650,
    latency_ms: 40,
    health_score: 99,
    cpu_threads: 8,
    memory_mb: 16384,
    storage_gb: 100,
    gpu_count: 0,
    pnpk_preflight_decision: "ROUTE_APPROVED",
    pnpk_receipt_hash: "sha256:abc123",
    owner_agreement_status: "owner_accepted_pending_operator",
    activation_grant_present: false,
    ...overrides
  };
}

test("selects one best policy-compliant shared-capacity offer per region", () => {
  const plan = planRegionalLeaseFabric({
    candidates: [
      candidate(),
      candidate({ offer_id: "lease-002", health_score: 96 }),
      candidate({
        region: "ap-east-2",
        provider: "aws",
        offer_id: "lease-003",
        latency_ms: 90
      })
    ],
    policy: { max_regional_agents: 12, required_skygrid_fee_bps: 350 }
  });

  assert.equal(plan.selected_regions, 2);
  assert.equal(plan.aggregate_upfront_capacity_cost_usd, 0);
  assert.equal(plan.commercial_terms.skygrid_fee_bps, 350);
  assert.equal(plan.commercial_terms.default_capacity_owner_share_bps, 9650);
  assert.equal(plan.execution.upfront_capacity_payment_allowed, false);
});

test("fails candidates closed when PNPK or owner agreement is missing", () => {
  const plan = planRegionalLeaseFabric({
    candidates: [
      candidate({ pnpk_preflight_decision: "FAIL_CLOSED" }),
      candidate({
        region: "us-east-1",
        offer_id: "lease-004",
        owner_agreement_status: "offered"
      })
    ]
  });

  assert.equal(plan.selected_regions, 0);
  assert.equal(plan.rejected.length, 2);
});

test("rejects hourly-rent economics and incorrect revenue shares", () => {
  const plan = planRegionalLeaseFabric({
    candidates: [
      candidate({ upfront_capacity_cost_usd: 3 }),
      candidate({
        region: "us-east-1",
        offer_id: "lease-005",
        skygrid_fee_bps: 500,
        capacity_owner_share_bps: 9500
      })
    ]
  });

  assert.equal(plan.selected_regions, 0);
  assert.ok(
    plan.rejected.some((item) =>
      item.failures.includes("upfront_capacity_rent_not_allowed")
    )
  );
  assert.ok(
    plan.rejected.some((item) =>
      item.failures.includes("skygrid_fee_bps_mismatch")
    )
  );
});

test("keeps social-return governance separate from lease selection", () => {
  const plan = planRegionalLeaseFabric({ candidates: [candidate()] });

  assert.equal(plan.social_return.projected_income_eligible, false);
  assert.equal(plan.social_return.autonomous_beneficiary_selection_allowed, false);
  assert.equal(plan.social_return.protected_trait_inference_allowed, false);
  assert.equal(plan.social_return.lawful_needs_based_program_governance_required, true);
});
