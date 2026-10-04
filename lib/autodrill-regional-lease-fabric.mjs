import { createHash } from "node:crypto";

const MAX_REGIONAL_AGENTS = 64;
const DEFAULT_SKYGRID_FEE_BPS = 350;
const DEFAULT_CAPACITY_OWNER_SHARE_BPS = 9650;
const COMMERCIAL_MODEL = "shared_capacity_revenue_share";

function text(value, field) {
  const out = String(value ?? "").trim();
  if (!out) throw new Error(`${field}_required`);
  return out;
}

function finite(value, field, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new Error(`${field}_invalid`);
  }
  return parsed;
}

function integer(value, field, opts = {}) {
  const parsed = finite(value, field, opts);
  if (!Number.isInteger(parsed)) throw new Error(`${field}_invalid`);
  return parsed;
}

function stable(value) {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(stable);
  const out = {};
  for (const key of Object.keys(value).sort()) out[key] = stable(value[key]);
  return out;
}

function hash(value) {
  return `sha256:${createHash("sha256")
    .update(JSON.stringify(stable(value)))
    .digest("hex")}`;
}

function normalizeCandidate(candidate, index) {
  const normalized = {
    region: text(candidate.region, `candidate_${index}_region`),
    provider: text(candidate.provider, `candidate_${index}_provider`),
    offer_id: text(candidate.offer_id, `candidate_${index}_offer_id`),
    resource_class: text(
      candidate.resource_class,
      `candidate_${index}_resource_class`
    ),
    commercial_model:
      String(candidate.commercial_model ?? COMMERCIAL_MODEL).trim() ||
      COMMERCIAL_MODEL,
    time_tier_hours: integer(
      candidate.time_tier_hours ?? 24,
      `candidate_${index}_time_tier_hours`,
      { min: 1, max: 8760 }
    ),
    upfront_capacity_cost_usd: finite(
      candidate.upfront_capacity_cost_usd ?? 0,
      `candidate_${index}_upfront_capacity_cost_usd`,
      { max: 10000000 }
    ),
    skygrid_fee_bps: integer(
      candidate.skygrid_fee_bps ?? DEFAULT_SKYGRID_FEE_BPS,
      `candidate_${index}_skygrid_fee_bps`,
      { max: 10000 }
    ),
    capacity_owner_share_bps: integer(
      candidate.capacity_owner_share_bps ?? DEFAULT_CAPACITY_OWNER_SHARE_BPS,
      `candidate_${index}_capacity_owner_share_bps`,
      { max: 10000 }
    ),
    latency_ms: finite(candidate.latency_ms, `candidate_${index}_latency_ms`, {
      max: 60000
    }),
    health_score: finite(
      candidate.health_score,
      `candidate_${index}_health_score`,
      { max: 100 }
    ),
    cpu_threads: integer(
      candidate.cpu_threads ?? 0,
      `candidate_${index}_cpu_threads`,
      { max: 4096 }
    ),
    memory_mb: integer(
      candidate.memory_mb ?? 0,
      `candidate_${index}_memory_mb`,
      { max: 16777216 }
    ),
    storage_gb: integer(
      candidate.storage_gb ?? 0,
      `candidate_${index}_storage_gb`,
      { max: 10000000 }
    ),
    gpu_count: integer(
      candidate.gpu_count ?? 0,
      `candidate_${index}_gpu_count`,
      { max: 256 }
    ),
    pnpk_preflight_decision: text(
      candidate.pnpk_preflight_decision,
      `candidate_${index}_pnpk_preflight_decision`
    ),
    pnpk_receipt_hash: text(
      candidate.pnpk_receipt_hash,
      `candidate_${index}_pnpk_receipt_hash`
    ),
    owner_agreement_status: text(
      candidate.owner_agreement_status,
      `candidate_${index}_owner_agreement_status`
    ),
    activation_grant_present: candidate.activation_grant_present === true
  };

  normalized.capacity_units =
    normalized.cpu_threads +
    normalized.memory_mb / 1024 +
    normalized.storage_gb / 25 +
    normalized.gpu_count * 32;

  normalized.score = Number(
    (
      normalized.health_score * 0.55 +
      Math.max(0, 100 - normalized.latency_ms / 10) * 0.25 +
      Math.min(100, normalized.capacity_units) * 0.20
    ).toFixed(4)
  );

  return normalized;
}

function isAgreementReady(status) {
  return new Set([
    "owner_accepted_pending_operator",
    "approved_pending_activation",
    "active"
  ]).has(status);
}

export function planRegionalLeaseFabric({
  candidates = [],
  policy = {},
  generatedAt = new Date().toISOString()
} = {}) {
  if (!Array.isArray(candidates)) throw new Error("candidates_must_be_array");

  const maxRegionalAgents = integer(
    policy.max_regional_agents ?? 12,
    "max_regional_agents",
    { min: 1, max: MAX_REGIONAL_AGENTS }
  );
  const requiredSkygridFeeBps = integer(
    policy.required_skygrid_fee_bps ?? DEFAULT_SKYGRID_FEE_BPS,
    "required_skygrid_fee_bps",
    { max: 10000 }
  );
  const minHealthScore = finite(
    policy.min_health_score ?? 95,
    "min_health_score",
    { max: 100 }
  );
  const maxLatencyMs = finite(
    policy.max_latency_ms ?? 250,
    "max_latency_ms",
    { max: 60000 }
  );

  const normalized = candidates.map(normalizeCandidate);
  const rejected = [];
  const eligible = [];

  for (const candidate of normalized) {
    const failures = [];
    if (candidate.pnpk_preflight_decision !== "ROUTE_APPROVED") {
      failures.push("pnpk_not_approved");
    }
    if (!candidate.pnpk_receipt_hash.startsWith("sha256:")) {
      failures.push("pnpk_receipt_hash_invalid");
    }
    if (!isAgreementReady(candidate.owner_agreement_status)) {
      failures.push("owner_agreement_not_ready");
    }
    if (candidate.health_score < minHealthScore) {
      failures.push("health_below_minimum");
    }
    if (candidate.latency_ms > maxLatencyMs) {
      failures.push("latency_above_limit");
    }
    if (candidate.commercial_model !== COMMERCIAL_MODEL) {
      failures.push("commercial_model_not_shared_revenue");
    }
    if (candidate.upfront_capacity_cost_usd !== 0) {
      failures.push("upfront_capacity_rent_not_allowed");
    }
    if (candidate.skygrid_fee_bps !== requiredSkygridFeeBps) {
      failures.push("skygrid_fee_bps_mismatch");
    }
    if (
      candidate.skygrid_fee_bps + candidate.capacity_owner_share_bps !==
      10000
    ) {
      failures.push("revenue_share_does_not_sum_to_100_percent");
    }

    if (failures.length) rejected.push({ ...candidate, failures });
    else eligible.push(candidate);
  }

  eligible.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.time_tier_hours !== a.time_tier_hours) {
      return b.time_tier_hours - a.time_tier_hours;
    }
    return a.region.localeCompare(b.region);
  });

  const selected = [];
  const selectedRegions = new Set();

  for (const candidate of eligible) {
    if (selected.length >= maxRegionalAgents) break;
    if (selectedRegions.has(candidate.region)) continue;

    selectedRegions.add(candidate.region);

    const agentIdentity = {
      role: "aura_regional_switch_planner",
      region: candidate.region,
      provider: candidate.provider,
      offer_id: candidate.offer_id
    };

    selected.push({
      ...candidate,
      aura_agent_id: hash(agentIdentity),
      planning_authority: [
        "evaluate_route_health",
        "rank_capacity_offer",
        "prepare_reservation_envelope",
        "emit_pnpk_receipt"
      ],
      blocked_authority: [
        "payment_execution",
        "wallet_signing",
        "transaction_broadcast",
        "production_failover",
        "os_network_switching",
        "disk_partition",
        "beneficiary_selection"
      ],
      activation_eligible:
        candidate.activation_grant_present &&
        candidate.owner_agreement_status === "approved_pending_activation"
    });
  }

  const plan = {
    schema: "skygrid.autodrill-regional-lease-fabric.v2",
    generated_at: generatedAt,
    mode: "shared_capacity_revenue_share",
    sentinel: "fail_closed",
    controller: "auto_drill",
    regional_agent_model: "policy_identical_region_scoped_clones",
    selected_regions: selected.length,
    aggregate_upfront_capacity_cost_usd: 0,
    commercial_terms: {
      model: COMMERCIAL_MODEL,
      skygrid_fee_bps: requiredSkygridFeeBps,
      default_capacity_owner_share_bps: 10000 - requiredSkygridFeeBps,
      settlement_basis: "verified_operating_revenue",
      invoice_required: true,
      revenue_event_receipt_required: true,
      billable_service_classes: [
        "failover_protection",
        "validation",
        "approved_idle_compute",
        "routing",
        "storage",
        "proof_archive"
      ]
    },
    policy: {
      max_regional_agents: maxRegionalAgents,
      required_skygrid_fee_bps: requiredSkygridFeeBps,
      min_health_score: minHealthScore,
      max_latency_ms: maxLatencyMs
    },
    selected,
    rejected,
    execution: {
      autonomous_provisioning_allowed: false,
      upfront_capacity_payment_allowed: false,
      payment_execution_allowed: false,
      production_network_switching_allowed: false,
      activation_grant_required: true,
      exact_offer_and_receipt_binding_required: true
    },
    social_return: {
      source: "future_positive_evidence_backed_net_realized_income_only",
      accounting_route: "verified_revenue_ledger_to_philanthropy_governance",
      projected_income_eligible: false,
      autonomous_beneficiary_selection_allowed: false,
      protected_trait_inference_allowed: false,
      lawful_needs_based_program_governance_required: true
    }
  };

  return Object.freeze({ ...plan, plan_hash: hash(plan) });
}
