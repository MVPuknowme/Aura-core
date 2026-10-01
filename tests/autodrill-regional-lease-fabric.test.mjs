import assert from "node:assert/strict";
import test from "node:test";

import { planRegionalLeaseFabric } from "../lib/autodrill-regional-lease-fabric.mjs";

function candidate(overrides = {}) {
  return {
    region: "us-west-2",
    provider: "aws",
    offer_id: "lease-001",
    resource_class: "compute",
    hourly_rate_usd: 1,
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

test("selects one best policy-compliant offer per region", () => {
  const plan = planRegionalLeaseFabric({
    candidates: [
      candidate(),
      candidate({
        offer_id: "lease-002",
        hourly_rate_usd: 2,
        health_score: 96
      }),
      candidate({
        region: "ap-east-2",
        provider: "aws",
        offer_id: "lease-003",
        latency_ms: 90
      })
    ],
    policy: {
      max_regional_agents: 12,
      max_aggregate_spend_usd_per_hour: 10,
      max_region_spend_usd_per_hour: 5
    }
  });

  assert.equal(plan.selected_regions, 2);
  assert.equal(plan.selected.some((item) => item.region === "us-west-2"), true);
  assert.equal(plan.selected.some((item) => item.region === "ap-east-2"), true);
  assert.equal(plan.execution.autonomous_provisioning_allowed, false);
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
    ],
    policy: {
      max_aggregate_spend_usd_per_hour: 10,
      max_region_spend_usd_per_hour: 5
    }
  });

  assert.equal(plan.selected_regions, 0);
  assert.equal(plan.rejected.length, 2);
});

test("enforces aggregate spend cap", () => {
  const plan = planRegionalLeaseFabric({
    candidates: [
      candidate({ hourly_rate_usd: 3 }),
      candidate({
        region: "us-east-1",
        offer_id: "lease-005",
        hourly_rate_usd: 3
      })
    ],
    policy: {
      max_aggregate_spend_usd_per_hour: 5,
      max_region_spend_usd_per_hour: 5
    }
  });

  assert.equal(plan.selected_regions, 1);
  assert.equal(plan.aggregate_planned_spend_usd_per_hour, 3);
  assert.ok(plan.rejected.some((item) => item.failures.includes("aggregate_spend_cap")));
});

test("keeps social-return governance separate from lease selection", () => {
  const plan = planRegionalLeaseFabric({
    candidates: [candidate()],
    policy: {
      max_aggregate_spend_usd_per_hour: 5,
      max_region_spend_usd_per_hour: 5
    }
  });

  assert.equal(plan.social_return.projected_income_eligible, false);
  assert.equal(plan.social_return.autonomous_beneficiary_selection_allowed, false);
  assert.equal(plan.social_return.protected_trait_inference_allowed, false);
  assert.equal(plan.social_return.lawful_needs_based_program_governance_required, true);
});
