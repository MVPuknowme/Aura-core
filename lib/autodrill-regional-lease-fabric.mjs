import { createHash } from "node:crypto";

const MAX_REGIONAL_AGENTS = 64;

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
  const region = text(candidate.region, `candidate_${index}_region`);
  const provider = text(candidate.provider, `candidate_${index}_provider`);
  const offerId = text(candidate.offer_id, `candidate_${index}_offer_id`);
  const resourceClass = text(
    candidate.resource_class,
    `candidate_${index}_resource_class`
  );

  const normalized = {
    region,
    provider,
    offer_id: offerId,
    resource_class: resourceClass,
    hourly_rate_usd: finite(
      candidate.hourly_rate_usd,
      `candidate_${index}_hourly_rate_usd`,
      { max: 100000 }
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
  const maxAggregateSpendUsdPerHour = finite(
    policy.max_aggregate_spend_usd_per_hour ?? 0,
    "max_aggregate_spend_usd_per_hour",
    { max: 10000000 }
  );
  const maxRegionSpendUsdPerHour = finite(
    policy.max_region_spend_usd_per_hour ?? maxAggregateSpendUsdPerHour,
    "max_region_spend_usd_per_hour",
    { max: 1000000 }
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
    if (candidate.hourly_rate_usd > maxRegionSpendUsdPerHour) {
      failures.push("regional_spend_above_limit");
    }

    if (failures.length) {
      rejected.push({ ...candidate, failures });
    } else {
      eligible.push(candidate);
    }
  }

  eligible.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.hourly_rate_usd !== b.hourly_rate_usd) {
      return a.hourly_rate_usd - b.hourly_rate_usd;
    }
    return a.region.localeCompare(b.region);
  });

  const selected = [];
  const selectedRegions = new Set();
  let aggregateSpend = 0;

  for (const candidate of eligible) {
    if (selected.length >= maxRegionalAgents) break;
    if (selectedRegions.has(candidate.region)) continue;
    if (
      aggregateSpend + candidate.hourly_rate_usd >
      maxAggregateSpendUsdPerHour
    ) {
      rejected.push({
        ...candidate,
        failures: ["aggregate_spend_cap"]
      });
      continue;
    }

    aggregateSpend += candidate.hourly_rate_usd;
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
    schema: "skygrid.autodrill-regional-lease-fabric.v1",
    generated_at: generatedAt,
    mode: "quote_and_reserve_only",
    sentinel: "fail_closed",
    controller: "auto_drill",
    regional_agent_model: "policy_identical_region_scoped_clones",
    selected_regions: selected.length,
    aggregate_planned_spend_usd_per_hour: Number(aggregateSpend.toFixed(4)),
    policy: {
      max_regional_agents: maxRegionalAgents,
      max_aggregate_spend_usd_per_hour: maxAggregateSpendUsdPerHour,
      max_region_spend_usd_per_hour: maxRegionSpendUsdPerHour,
      min_health_score: minHealthScore,
      max_latency_ms: maxLatencyMs
    },
    selected,
    rejected,
    execution: {
      autonomous_provisioning_allowed: false,
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
      lawful_needs_based_program_governance_required: true,
      note:
        "Regional lease economics may feed the existing philanthropic accounting layer only after realization and reconciliation."
    }
  };

  return Object.freeze({
    ...plan,
    plan_hash: hash(plan)
  });
}
