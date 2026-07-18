const PRODUCT = "SKYGRID Emergency Data On-Ramp";

export const REVENUE_CLASSES = Object.freeze([
  "staking",
  "infrastructure",
  "protocol",
  "treasury"
]);

export const COST_CLASSES = Object.freeze([
  "cloud",
  "bandwidth",
  "hardware",
  "gas",
  "validator_vote",
  "protocol_fee",
  "other"
]);

export const EVIDENCE_STATES = Object.freeze([
  "verified",
  "reconciled",
  "estimated",
  "unverified"
]);

const ACCEPTED_KINDS = new Set(["revenue", "cost"]);
const ACCEPTED_EVIDENCE = new Set(EVIDENCE_STATES);
const VERIFIED_STATES = new Set(["verified", "reconciled"]);

function finiteNumber(value, field) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new TypeError(`${field} must be a finite number`);
  }
  return number;
}

function text(value, field) {
  const normalized = String(value ?? "").trim();
  if (!normalized) throw new TypeError(`${field} is required`);
  return normalized;
}

function normalizeEvidence(record) {
  const state = String(record.evidence_state || "unverified").toLowerCase();
  if (!ACCEPTED_EVIDENCE.has(state)) {
    throw new TypeError(`evidence_state must be one of: ${EVIDENCE_STATES.join(", ")}`);
  }

  const evidence = record.evidence && typeof record.evidence === "object"
    ? record.evidence
    : {};

  return {
    state,
    tx_hash: evidence.tx_hash ? String(evidence.tx_hash) : null,
    explorer_url: evidence.explorer_url ? String(evidence.explorer_url) : null,
    invoice_id: evidence.invoice_id ? String(evidence.invoice_id) : null,
    contract_id: evidence.contract_id ? String(evidence.contract_id) : null,
    receipt_hash: evidence.receipt_hash ? String(evidence.receipt_hash) : null,
    source: evidence.source ? String(evidence.source) : null
  };
}

export function normalizeLedgerRecord(record, index = 0) {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    throw new TypeError(`records[${index}] must be an object`);
  }

  const kind = String(record.kind || "").toLowerCase();
  if (!ACCEPTED_KINDS.has(kind)) {
    throw new TypeError(`records[${index}].kind must be revenue or cost`);
  }

  const classification = text(record.classification, `records[${index}].classification`).toLowerCase();
  const allowed = kind === "revenue" ? REVENUE_CLASSES : COST_CLASSES;
  if (!allowed.includes(classification)) {
    throw new TypeError(`records[${index}].classification must be one of: ${allowed.join(", ")}`);
  }

  const amountUsd = finiteNumber(record.amount_usd, `records[${index}].amount_usd`);
  if (amountUsd < 0) throw new RangeError(`records[${index}].amount_usd cannot be negative`);

  const occurredAt = new Date(record.occurred_at || Date.now());
  if (Number.isNaN(occurredAt.getTime())) {
    throw new TypeError(`records[${index}].occurred_at must be a valid date`);
  }

  const evidence = normalizeEvidence(record);

  return {
    id: String(record.id || `ledger_${occurredAt.getTime()}_${index}`),
    kind,
    classification,
    amount_usd: Number(amountUsd.toFixed(2)),
    network: String(record.network || "unspecified").toLowerCase(),
    role: String(record.role || "unspecified").toLowerCase(),
    asset: record.asset ? String(record.asset).toUpperCase() : null,
    quantity: record.quantity == null ? null : finiteNumber(record.quantity, `records[${index}].quantity`),
    wallet_or_account: record.wallet_or_account ? String(record.wallet_or_account) : null,
    occurred_at: occurredAt.toISOString(),
    evidence_state: evidence.state,
    evidence,
    notes: record.notes ? String(record.notes) : null
  };
}

function add(bucket, key, amount) {
  bucket[key] = Number(((bucket[key] || 0) + amount).toFixed(2));
}

export function summarizeLedger(records = []) {
  if (!Array.isArray(records)) throw new TypeError("records must be an array");

  const normalized = records.map(normalizeLedgerRecord);
  const totals = {
    verified_revenue_usd: 0,
    verified_cost_usd: 0,
    verified_net_income_usd: 0,
    estimated_revenue_usd: 0,
    estimated_cost_usd: 0,
    unverified_revenue_usd: 0,
    unverified_cost_usd: 0
  };
  const by_classification = {};
  const by_network = {};
  const exclusions = [];

  for (const record of normalized) {
    const verified = VERIFIED_STATES.has(record.evidence_state);
    const sign = record.kind === "revenue" ? 1 : -1;

    if (verified) {
      const key = record.kind === "revenue" ? "verified_revenue_usd" : "verified_cost_usd";
      totals[key] = Number((totals[key] + record.amount_usd).toFixed(2));
      add(by_classification, record.classification, sign * record.amount_usd);
      add(by_network, record.network, sign * record.amount_usd);
    } else if (record.evidence_state === "estimated") {
      const key = record.kind === "revenue" ? "estimated_revenue_usd" : "estimated_cost_usd";
      totals[key] = Number((totals[key] + record.amount_usd).toFixed(2));
      exclusions.push({ id: record.id, reason: "estimated_not_counted_as_verified_income" });
    } else {
      const key = record.kind === "revenue" ? "unverified_revenue_usd" : "unverified_cost_usd";
      totals[key] = Number((totals[key] + record.amount_usd).toFixed(2));
      exclusions.push({ id: record.id, reason: "unverified_not_counted_as_verified_income" });
    }
  }

  totals.verified_net_income_usd = Number(
    (totals.verified_revenue_usd - totals.verified_cost_usd).toFixed(2)
  );

  const verifiedCount = normalized.filter((record) => VERIFIED_STATES.has(record.evidence_state)).length;

  return {
    ok: true,
    product: PRODUCT,
    ledger: "Aura-Core Verified Infrastructure Revenue Ledger",
    accounting_basis: "evidence-gated cash and accrued records",
    totals,
    by_classification,
    by_network,
    record_counts: {
      total: normalized.length,
      verified_or_reconciled: verifiedCount,
      excluded_from_verified_totals: normalized.length - verifiedCount
    },
    exclusions,
    records: normalized,
    safeguards: {
      wallet_signing: false,
      transaction_broadcast: false,
      payment_execution: false,
      estimates_in_verified_income: false
    },
    generated_at: new Date().toISOString()
  };
}

export function ledgerSchema() {
  return {
    product: PRODUCT,
    ledger: "Aura-Core Verified Infrastructure Revenue Ledger",
    revenue_classes: REVENUE_CLASSES,
    cost_classes: COST_CLASSES,
    evidence_states: EVIDENCE_STATES,
    required_fields: ["kind", "classification", "amount_usd", "evidence_state"],
    verified_income_rule: "Only verified or reconciled records are included in verified net income.",
    example: {
      id: "eth_reward_2026_07_18_001",
      kind: "revenue",
      classification: "staking",
      amount_usd: 42.15,
      network: "ethereum",
      role: "validator",
      asset: "ETH",
      quantity: 0.012,
      occurred_at: "2026-07-18T12:00:00.000Z",
      evidence_state: "verified",
      evidence: {
        tx_hash: "0x...",
        explorer_url: "https://..."
      }
    }
  };
}
