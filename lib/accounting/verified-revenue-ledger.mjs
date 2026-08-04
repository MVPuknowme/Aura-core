const EVIDENCE_STATES = new Set(["verified", "reconciled", "estimated", "unverified"]);
const REVENUE_CATEGORIES = new Set([
  "staking",
  "infrastructure",
  "protocol",
  "treasury",
  "operating_cost"
]);

function finiteNumber(value, field) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new TypeError(`${field} must be a finite number`);
  }
  return parsed;
}

export function validateLedgerEntry(entry) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    throw new TypeError("ledger entry must be an object");
  }

  const requiredStrings = ["entry_id", "occurred_at", "network", "role", "category", "evidence_state"];
  for (const field of requiredStrings) {
    if (typeof entry[field] !== "string" || entry[field].trim() === "") {
      throw new TypeError(`${field} must be a non-empty string`);
    }
  }

  if (!REVENUE_CATEGORIES.has(entry.category)) {
    throw new TypeError(`unsupported category: ${entry.category}`);
  }
  if (!EVIDENCE_STATES.has(entry.evidence_state)) {
    throw new TypeError(`unsupported evidence_state: ${entry.evidence_state}`);
  }

  const amountUsd = finiteNumber(entry.amount_usd, "amount_usd");
  if (amountUsd < 0) {
    throw new RangeError("amount_usd must be non-negative; use operating_cost for expenses");
  }

  if (entry.evidence_state === "verified" || entry.evidence_state === "reconciled") {
    if (!Array.isArray(entry.evidence_refs) || entry.evidence_refs.length === 0) {
      throw new TypeError("verified or reconciled entries require evidence_refs");
    }
  }

  return {
    ...entry,
    amount_usd: amountUsd,
    evidence_refs: Array.isArray(entry.evidence_refs) ? entry.evidence_refs : []
  };
}

export function summarizeRevenueLedger(entries) {
  if (!Array.isArray(entries)) {
    throw new TypeError("entries must be an array");
  }

  const normalized = entries.map(validateLedgerEntry);
  const totals = {
    verified_revenue_usd: 0,
    reconciled_revenue_usd: 0,
    estimated_revenue_usd: 0,
    unverified_revenue_usd: 0,
    verified_operating_cost_usd: 0,
    net_verified_income_usd: 0
  };

  const byCategory = {};
  const byNetwork = {};

  for (const entry of normalized) {
    const isCost = entry.category === "operating_cost";
    const key = `${entry.evidence_state}_revenue_usd`;

    if (isCost) {
      if (entry.evidence_state === "verified" || entry.evidence_state === "reconciled") {
        totals.verified_operating_cost_usd += entry.amount_usd;
      }
    } else if (key in totals) {
      totals[key] += entry.amount_usd;
    }

    byCategory[entry.category] ??= { verified_usd: 0, projected_usd: 0 };
    byNetwork[entry.network] ??= { verified_usd: 0, projected_usd: 0 };

    const target = entry.evidence_state === "verified" || entry.evidence_state === "reconciled"
      ? "verified_usd"
      : "projected_usd";
    const signedAmount = isCost ? -entry.amount_usd : entry.amount_usd;
    byCategory[entry.category][target] += signedAmount;
    byNetwork[entry.network][target] += signedAmount;
  }

  totals.net_verified_income_usd =
    totals.verified_revenue_usd +
    totals.reconciled_revenue_usd -
    totals.verified_operating_cost_usd;

  return {
    generated_at: new Date().toISOString(),
    accounting_basis: "evidence-first",
    entry_count: normalized.length,
    totals,
    by_category: byCategory,
    by_network: byNetwork,
    entries: normalized
  };
}

export const ledgerEnums = {
  evidence_states: [...EVIDENCE_STATES],
  revenue_categories: [...REVENUE_CATEGORIES]
};
