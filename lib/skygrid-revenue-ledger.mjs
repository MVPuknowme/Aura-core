const INCOME_CATEGORIES = new Set([
  "staking",
  "infrastructure",
  "subscription",
  "lease",
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
  "contracted",
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
  "subscription_agreement",
  "subscription_invoice",
  "subscription_payment",
  "lease_agreement",
  "lease_invoice",
  "lease_payment",
  "processor_event",
  "bank_posting",
  "cloud_billing",
  "vendor_invoice"
]);

const CONTRACT_EVIDENCE_TYPES = new Set([
  "signed_contract",
  "capacity_lease",
  "subscription_agreement",
  "lease_agreement"
]);

const INCOME_SETTLEMENT_EVIDENCE_TYPES = new Set([
  "onchain_payout",
  "staking_withdrawal",
  "service_payment",
  "subscription_payment",
  "lease_payment",
  "processor_event",
  "bank_posting"
]);

const COMMERCIAL_MODELS = new Set([
  "one_time",
  "subscription",
  "lease"
]);

const SUBSCRIPTION_BILLING_INTERVALS = new Set([
  "weekly",
  "monthly",
  "quarterly",
  "annual"
]);

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function nonNegativeMoney(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? roundMoney(parsed) : null;
}

function nonNegativeNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function cleanText(value) {
  return String(value ?? "").trim();
}

function normalizeEvidence(evidence) {
  if (!Array.isArray(evidence)) return [];

  return evidence
    .filter((item) => item && typeof item === "object")
    .map((item) => ({
      type: cleanText(item.type),
      reference: cleanText(item.reference),
      source: cleanText(item.source) || null,
      observed_at: cleanText(item.observed_at) || null
    }))
    .filter((item) => item.type && item.reference);
}

function hasEvidenceType(evidence, acceptedTypes) {
  return evidence.some((item) => acceptedTypes.has(item.type));
}

function inferCommercialModel(category, rawModel) {
  if (category === "subscription") return "subscription";
  if (category === "lease") return "lease";
  return cleanText(rawModel) || "one_time";
}

function normalizeCommercial(record, category) {
  const input = record?.commercial && typeof record.commercial === "object"
    ? record.commercial
    : {};
  const model = inferCommercialModel(category, input.model);
  const leaseHours = nonNegativeNumber(input.lease_hours);
  const rateUsdPerHour = nonNegativeMoney(input.rate_usd_per_hour);
  const explicitContractValue = nonNegativeMoney(input.contract_value_usd);
  const derivedLeaseValue =
    explicitContractValue === null &&
    leaseHours !== null &&
    rateUsdPerHour !== null
      ? roundMoney(leaseHours * rateUsdPerHour)
      : null;

  return {
    model,
    agreement_id: cleanText(input.agreement_id) || null,
    status: cleanText(input.status) || null,
    billing_interval: cleanText(input.billing_interval) || null,
    recurring_amount_usd: nonNegativeMoney(input.recurring_amount_usd),
    contract_value_usd:
      explicitContractValue === null ? derivedLeaseValue : explicitContractValue,
    lease_hours: leaseHours,
    rate_usd_per_hour: rateUsdPerHour,
    starts_at: cleanText(input.starts_at) || null,
    ends_at: cleanText(input.ends_at) || null
  };
}

function validateCommercial(commercial, category) {
  const errors = [];

  if (!COMMERCIAL_MODELS.has(commercial.model)) {
    errors.push("invalid_commercial_model");
  }

  if (category === "subscription") {
    if (commercial.model !== "subscription") {
      errors.push("subscription_commercial_model_required");
    }
    if (!commercial.agreement_id) {
      errors.push("subscription_agreement_id_required");
    }
    if (!SUBSCRIPTION_BILLING_INTERVALS.has(commercial.billing_interval)) {
      errors.push("subscription_billing_interval_required");
    }
    if (commercial.recurring_amount_usd === null) {
      errors.push("subscription_recurring_amount_required");
    }
  }

  if (category === "lease") {
    if (commercial.model !== "lease") {
      errors.push("lease_commercial_model_required");
    }
    if (!commercial.agreement_id) {
      errors.push("lease_agreement_id_required");
    }
    if (commercial.contract_value_usd === null) {
      errors.push("lease_contract_value_required");
    }
  }

  return errors;
}

function validateRecord(record, index) {
  const errors = [];
  const id = cleanText(record?.id || `record-${index + 1}`);
  const direction = cleanText(record?.direction);
  const category = cleanText(record?.category);
  const recognition = cleanText(record?.recognition);
  const amountUsd = nonNegativeMoney(record?.amount_usd);
  const evidence = normalizeEvidence(record?.evidence);
  const commercial = normalizeCommercial(record, category);

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

  errors.push(...validateCommercial(commercial, category));

  const qualifyingEvidence = hasEvidenceType(evidence, QUALIFYING_EVIDENCE_TYPES);
  const contractEvidence = hasEvidenceType(evidence, CONTRACT_EVIDENCE_TYPES);
  const settlementEvidence = hasEvidenceType(
    evidence,
    INCOME_SETTLEMENT_EVIDENCE_TYPES
  );

  if (recognition === "realized" && !qualifyingEvidence) {
    errors.push("realized_requires_qualifying_evidence");
  }

  if (
    recognition === "realized" &&
    direction === "income" &&
    !settlementEvidence
  ) {
    errors.push("realized_income_requires_settlement_evidence");
  }

  if (recognition === "accrued" && evidence.length === 0) {
    errors.push("accrued_requires_evidence");
  }

  if (recognition === "contracted" && !contractEvidence) {
    errors.push("contracted_requires_contract_evidence");
  }

  const accepted = errors.length === 0;

  return {
    id,
    direction,
    category,
    recognition,
    amount_usd: amountUsd,
    currency: cleanText(record?.currency || "USD").toUpperCase(),
    network: cleanText(record?.network) || null,
    asset: cleanText(record?.asset) || null,
    node_id: cleanText(record?.node_id) || null,
    counterparty: cleanText(record?.counterparty) || null,
    occurred_at: cleanText(record?.occurred_at) || null,
    commercial,
    evidence,
    evidence_verified: qualifyingEvidence,
    contract_evidence_verified: contractEvidence,
    settlement_evidence_verified: settlementEvidence,
    accepted,
    errors
  };
}

function addMoney(summary, key, amount) {
  summary[key] = roundMoney(summary[key] + Number(amount || 0));
}

function sumCategoryRecognition(records, category, recognition) {
  return roundMoney(
    records
      .filter(
        (record) =>
          record.category === category && record.recognition === recognition
      )
      .reduce((sum, record) => sum + Number(record.amount_usd || 0), 0)
  );
}

function toMonthlyRunRate(amount, interval) {
  const value = Number(amount || 0);
  if (!Number.isFinite(value) || value < 0) return 0;

  if (interval === "weekly") return roundMoney((value * 52) / 12);
  if (interval === "monthly") return roundMoney(value);
  if (interval === "quarterly") return roundMoney(value / 3);
  if (interval === "annual") return roundMoney(value / 12);
  return 0;
}

function latestCommercialSnapshots(records, category) {
  const snapshots = new Map();

  for (const record of records) {
    if (record.category !== category || !record.commercial?.agreement_id) {
      continue;
    }
    snapshots.set(record.commercial.agreement_id, record);
  }

  return [...snapshots.values()];
}

function evaluateSubscriptions(records) {
  const snapshots = latestCommercialSnapshots(records, "subscription");
  const mrr = roundMoney(
    snapshots.reduce(
      (sum, record) =>
        sum +
        toMonthlyRunRate(
          record.commercial.recurring_amount_usd,
          record.commercial.billing_interval
        ),
      0
    )
  );
  const contractValue = roundMoney(
    snapshots.reduce(
      (sum, record) =>
        sum + Number(record.commercial.contract_value_usd || 0),
      0
    )
  );

  return {
    agreements: snapshots.length,
    mrr_run_rate_usd: mrr,
    arr_run_rate_usd: roundMoney(mrr * 12),
    contract_value_snapshot_usd: contractValue,
    projected_income_usd: sumCategoryRecognition(
      records,
      "subscription",
      "projected"
    ),
    contracted_income_usd: sumCategoryRecognition(
      records,
      "subscription",
      "contracted"
    ),
    accrued_income_usd: sumCategoryRecognition(
      records,
      "subscription",
      "accrued"
    ),
    realized_income_usd: sumCategoryRecognition(
      records,
      "subscription",
      "realized"
    )
  };
}

function evaluateLeases(records) {
  const snapshots = latestCommercialSnapshots(records, "lease");
  const contractValue = roundMoney(
    snapshots.reduce(
      (sum, record) =>
        sum + Number(record.commercial.contract_value_usd || 0),
      0
    )
  );
  const leaseHours = snapshots.reduce(
    (sum, record) => sum + Number(record.commercial.lease_hours || 0),
    0
  );

  return {
    agreements: snapshots.length,
    lease_hours_snapshot: leaseHours,
    contract_value_snapshot_usd: contractValue,
    projected_income_usd: sumCategoryRecognition(records, "lease", "projected"),
    contracted_income_usd: sumCategoryRecognition(
      records,
      "lease",
      "contracted"
    ),
    accrued_income_usd: sumCategoryRecognition(records, "lease", "accrued"),
    realized_income_usd: sumCategoryRecognition(records, "lease", "realized")
  };
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
    contracted_income_usd: 0,
    contracted_cost_usd: 0,
    unrealized_change_usd: 0,
    projected_income_usd: 0,
    projected_cost_usd: 0,
    unverified_income_usd: 0,
    unverified_cost_usd: 0
  };

  for (const record of accepted) {
    const amount = record.amount_usd;

    if (record.recognition === "realized") {
      addMoney(
        totals,
        record.direction === "income"
          ? "realized_income_usd"
          : "realized_cost_usd",
        amount
      );
      continue;
    }

    if (record.recognition === "accrued") {
      addMoney(
        totals,
        record.direction === "income"
          ? "accrued_income_usd"
          : "accrued_cost_usd",
        amount
      );
      continue;
    }

    if (record.recognition === "contracted") {
      addMoney(
        totals,
        record.direction === "income"
          ? "contracted_income_usd"
          : "contracted_cost_usd",
        amount
      );
      continue;
    }

    if (record.recognition === "projected") {
      addMoney(
        totals,
        record.direction === "income"
          ? "projected_income_usd"
          : "projected_cost_usd",
        amount
      );
      continue;
    }

    if (record.recognition === "unverified") {
      addMoney(
        totals,
        record.direction === "income"
          ? "unverified_income_usd"
          : "unverified_cost_usd",
        amount
      );
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
  for (const record of accepted.filter(
    (item) => item.recognition === "realized"
  )) {
    const key = `${record.direction}:${record.category}`;
    byCategory[key] = roundMoney(
      (byCategory[key] || 0) + record.amount_usd
    );
  }

  const evidenceBackedRecords = accepted.filter(
    (record) => record.evidence_verified
  ).length;
  const evidenceCoveragePct = accepted.length
    ? roundMoney((evidenceBackedRecords / accepted.length) * 100)
    : 0;

  return {
    ledger_version: "skygrid-verified-infrastructure-revenue-v2",
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
    commercial_evaluation: {
      subscriptions: evaluateSubscriptions(accepted),
      leases: evaluateLeases(accepted)
    },
    records: normalized,
    controls: {
      recognized_income_rule:
        "Only accepted realized income with settlement evidence is included in realized_income_usd.",
      recognized_cost_rule:
        "Only accepted realized costs with qualifying evidence are included in realized_cost_usd.",
      contracted_rule:
        "Contracted values require contract evidence and remain outside realized net income.",
      commercial_snapshot_rule:
        "Subscription and lease run-rate/contract snapshots use the last accepted record per agreement_id in the submitted batch.",
      excluded_from_realized_net: [
        "accrued",
        "contracted",
        "unrealized",
        "projected",
        "unverified"
      ],
      qualifying_evidence_types: [...QUALIFYING_EVIDENCE_TYPES],
      contract_evidence_types: [...CONTRACT_EVIDENCE_TYPES],
      income_settlement_evidence_types: [
        ...INCOME_SETTLEMENT_EVIDENCE_TYPES
      ]
    }
  };
}

export const SKYGRID_REVENUE_LEDGER_ENUMS = Object.freeze({
  income_categories: [...INCOME_CATEGORIES],
  cost_categories: [...COST_CATEGORIES],
  recognition_states: [...RECOGNITION_STATES],
  qualifying_evidence_types: [...QUALIFYING_EVIDENCE_TYPES],
  contract_evidence_types: [...CONTRACT_EVIDENCE_TYPES],
  income_settlement_evidence_types: [...INCOME_SETTLEMENT_EVIDENCE_TYPES],
  commercial_models: [...COMMERCIAL_MODELS],
  subscription_billing_intervals: [...SUBSCRIPTION_BILLING_INTERVALS]
});
