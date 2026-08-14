const INCOME_CATEGORIES = new Set([
  "staking",
  "infrastructure",
  "protocol",
  "treasury"
]);

const COST_CATEGORIES = new Set([
  "protocol_fee",
  "hosting",
  "hardware_amortization",
  "network_fee",
  "other_operating"
]);

const RECOGNITION_STATES = new Set([
  "realized",
  "accrued",
  "unrealized",
  "projected",
  "unverified"
]);

const QUALIFYING_EVIDENCE_TYPES = new Set([
  "onchain_payout",
  "staking_withdrawal",
  "service_payment",
  "signed_contract",
  "capacity_lease",
  "processor_event",
  "bank_posting",
  "cloud_billing",
  "vendor_invoice"
]);

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function nonNegativeMoney(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? roundMoney(parsed) : null;
}

function normalizeEvidence(evidence) {
  if (!Array.isArray(evidence)) return [];

  return evidence
    .filter((item) => item && typeof item === "object")
    .map((item) => ({
      type: String(item.type || "").trim(),
      reference: String(item.reference || "").trim(),
      source: String(item.source || "").trim() || null,
      observed_at: String(item.observed_at || "").trim() || null
    }))
    .filter((item) => item.type && item.reference);
}

function hasQualifyingEvidence(evidence) {
  return evidence.some((item) => QUALIFYING_EVIDENCE_TYPES.has(item.type));
}

function validateRecord(record, index) {
  const errors = [];
  const id = String(record?.id || `record-${index + 1}`).trim();
  const direction = String(record?.direction || "").trim();
  const category = String(record?.category || "").trim();
  const recognition = String(record?.recognition || "").trim();
  const amountUsd = nonNegativeMoney(record?.amount_usd);
  const evidence = normalizeEvidence(record?.evidence);

  if (!id) errors.push("missing_id");
  if (!new Set(["income", "cost"]).has(direction)) errors.push("invalid_direction");
  if (!RECOGNITION_STATES.has(recognition)) errors.push("invalid_recognition");
  if (amountUsd === null) errors.push("invalid_amount_usd");

  if (direction === "income" && !INCOME_CATEGORIES.has(category)) {
    errors.push("invalid_income_category");
  }

  if (direction === "cost" && !COST_CATEGORIES.has(category)) {
    errors.push("invalid_cost_category");
  }

  const qualifyingEvidence = hasQualifyingEvidence(evidence);

  if (recognition === "realized" && !qualifyingEvidence) {
    errors.push("realized_requires_qualifying_evidence");
  }

  if (recognition === "accrued" && evidence.length === 0) {
    errors.push("accrued_requires_evidence");
  }

  const accepted = errors.length === 0;

  return {
    id,
    direction,
    category,
    recognition,
    amount_usd: amountUsd,
    currency: String(record?.currency || "USD").trim().toUpperCase(),
    network: String(record?.network || "").trim() || null,
    asset: String(record?.asset || "").trim() || null,
    node_id: String(record?.node_id || "").trim() || null,
    counterparty: String(record?.counterparty || "").trim() || null,
    occurred_at: String(record?.occurred_at || "").trim() || null,
    evidence,
    evidence_verified: qualifyingEvidence,
    accepted,
    errors
  };
}

function addMoney(summary, key, amount) {
  summary[key] = roundMoney(summary[key] + Number(amount || 0));
}

export function summarizeRevenueLedger(records = []) {
  if (!Array.isArray(records)) {
    throw new TypeError("SKYGRID revenue ledger records must be an array.");
  }

  const normalized = records.map(validateRecord);
  const accepted = normalized.filter((record) => record.accepted);
  const rejected = normalized.filter((record) => !record.accepted);

  const totals = {
    realized_income_usd: 0,
    realized_cost_usd: 0,
    net_realized_income_usd: 0,
    accrued_income_usd: 0,
    accrued_cost_usd: 0,
    unrealized_change_usd: 0,
    projected_income_usd: 0,
    projected_cost_usd: 0,
    unverified_income_usd: 0,
    unverified_cost_usd: 0
  };

  for (const record of accepted) {
    const amount = record.amount_usd;

    if (record.recognition === "realized") {
      addMoney(totals, record.direction === "income" ? "realized_income_usd" : "realized_cost_usd", amount);
      continue;
    }

    if (record.recognition === "accrued") {
      addMoney(totals, record.direction === "income" ? "accrued_income_usd" : "accrued_cost_usd", amount);
      continue;
    }

    if (record.recognition === "projected") {
      addMoney(totals, record.direction === "income" ? "projected_income_usd" : "projected_cost_usd", amount);
      continue;
    }

    if (record.recognition === "unverified") {
      addMoney(totals, record.direction === "income" ? "unverified_income_usd" : "unverified_cost_usd", amount);
      continue;
    }

    if (record.recognition === "unrealized") {
      const signedAmount = record.direction === "income" ? amount : -amount;
      addMoney(totals, "unrealized_change_usd", signedAmount);
    }
  }

  totals.net_realized_income_usd = roundMoney(
    totals.realized_income_usd - totals.realized_cost_usd
  );

  const byCategory = {};
  for (const record of accepted.filter((item) => item.recognition === "realized")) {
    const key = `${record.direction}:${record.category}`;
    byCategory[key] = roundMoney((byCategory[key] || 0) + record.amount_usd);
  }

  const evidenceBackedRecords = accepted.filter((record) => record.evidence_verified).length;
  const evidenceCoveragePct = accepted.length
    ? roundMoney((evidenceBackedRecords / accepted.length) * 100)
    : 0;

  return {
    ledger_version: "skygrid-verified-infrastructure-revenue-v1",
    accounting_basis: "evidence_first_fail_closed",
    generated_at: new Date().toISOString(),
    summary: {
      ...totals,
      accepted_records: accepted.length,
      rejected_records: rejected.length,
      evidence_backed_records: evidenceBackedRecords,
      evidence_coverage_pct: evidenceCoveragePct
    },
    realized_by_category_usd: byCategory,
    records: normalized,
    controls: {
      recognized_income_rule: "Only accepted realized income with qualifying evidence is included in realized_income_usd.",
      recognized_cost_rule: "Only accepted realized costs with qualifying evidence are included in realized_cost_usd.",
      excluded_from_realized_net: ["accrued", "unrealized", "projected", "unverified"],
      qualifying_evidence_types: [...QUALIFYING_EVIDENCE_TYPES]
    }
  };
}

export const SKYGRID_REVENUE_LEDGER_ENUMS = Object.freeze({
  income_categories: [...INCOME_CATEGORIES],
  cost_categories: [...COST_CATEGORIES],
  recognition_states: [...RECOGNITION_STATES],
  qualifying_evidence_types: [...QUALIFYING_EVIDENCE_TYPES]
});
