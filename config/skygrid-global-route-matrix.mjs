export const GLOBAL_ROUTE_CONFIDENCE_THRESHOLD = 0.98;
export const GLOBAL_ROUTE_FEE_RATE = 0.03;
export const GLOBAL_ROUTE_WINDOW_MS = 24 * 60 * 60 * 1000;

function finiteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function roundMoney(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function quartiles(values) {
  if (!values.length) return { q1: 0, q3: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const lower = sorted.slice(0, mid);
  const upper = sorted.slice(sorted.length % 2 ? mid + 1 : mid);
  if (!lower.length || !upper.length) {
    const m = median(sorted);
    return { q1: m, q3: m };
  }
  return { q1: median(lower), q3: median(upper) };
}

function normalLossThreshold(losses) {
  if (!Array.isArray(losses) || losses.length === 0 || losses.some((value) => !finiteNumber(value) || value < 0)) {
    return 0;
  }
  const m = median(losses);
  const { q1, q3 } = quartiles(losses);
  return m + 1.5 * (q3 - q1);
}

function routeId(observation) {
  return [
    observation.origin_jurisdiction,
    observation.destination_jurisdiction,
    observation.provider,
    observation.asset,
    observation.network,
    observation.settlement_destination
  ].map((value) => String(value ?? "").trim()).join("::");
}

export function evaluateGlobalRouteObservation(observation = {}, options = {}) {
  const now = finiteNumber(options.now) ? options.now : Date.now();
  const failure_reasons = [];
  const hardFailures = [];
  const temporaryFailures = [];

  const requiredStrings = [
    "origin_jurisdiction",
    "destination_jurisdiction",
    "provider",
    "asset",
    "network",
    "settlement_destination",
    "evidence_timestamp"
  ];
  for (const field of requiredStrings) {
    if (!String(observation[field] ?? "").trim()) hardFailures.push(`missing_${field}`);
  }

  if (!finiteNumber(observation.verification_confidence)) {
    hardFailures.push("invalid_verification_confidence");
  } else if (observation.verification_confidence < GLOBAL_ROUTE_CONFIDENCE_THRESHOLD) {
    temporaryFailures.push("verification_confidence_below_threshold");
  }

  for (const field of ["quote_value", "verified_settlement_value", "fee_spread_bps", "inflation_fx_margin_24h", "verified_loss"]) {
    if (!finiteNumber(observation[field])) hardFailures.push(`invalid_${field}`);
  }

  if (observation.destination_verified !== true) hardFailures.push("destination_not_verified");
  if (observation.auth_scope_ok !== true) hardFailures.push("auth_scope_not_verified");
  if (observation.route_health !== "passing") temporaryFailures.push("route_health_not_passing");
  if (observation.deposit_available !== true) temporaryFailures.push("deposit_unavailable");
  if (observation.withdrawal_available !== true) temporaryFailures.push("withdrawal_unavailable");

  const evidenceAt = Date.parse(observation.evidence_timestamp);
  if (!Number.isFinite(evidenceAt)) {
    hardFailures.push("invalid_evidence_timestamp");
  } else if (evidenceAt > now || now - evidenceAt > GLOBAL_ROUTE_WINDOW_MS) {
    temporaryFailures.push("evidence_outside_24h_window");
  }

  const comparable = Array.isArray(observation.comparable_verified_losses)
    ? observation.comparable_verified_losses
    : [];
  if (comparable.some((value) => !finiteNumber(value) || value < 0)) {
    hardFailures.push("invalid_comparable_verified_losses");
  }

  const threshold = hardFailures.includes("invalid_comparable_verified_losses") ? 0 : normalLossThreshold(comparable);
  const verifiedLoss = finiteNumber(observation.verified_loss) && observation.verified_loss >= 0 ? observation.verified_loss : 0;
  const exception_loss = Math.max(0, verifiedLoss - threshold);

  const settlementValue = finiteNumber(observation.verified_settlement_value) && observation.verified_settlement_value >= 0
    ? observation.verified_settlement_value
    : 0;
  const margin = finiteNumber(observation.inflation_fx_margin_24h) ? observation.inflation_fx_margin_24h : 0;
  const inflationAdjusted = settlementValue * (1 + margin);
  const adjusted_eligible_value = roundMoney(Math.max(0, inflationAdjusted + exception_loss));
  const proposed_support_fee = roundMoney(adjusted_eligible_value * GLOBAL_ROUTE_FEE_RATE);

  let state = "verified";
  if (hardFailures.length) {
    state = "blocked";
  } else if (temporaryFailures.length) {
    state = "deferred";
  } else if (observation.settlement_status === "settled" && exception_loss > 0) {
    state = "exception";
  } else if (observation.settlement_status === "settled") {
    state = "settled";
  }

  failure_reasons.push(...hardFailures, ...temporaryFailures);
  const payment_execution_eligible =
    (state === "verified" || state === "settled") &&
    observation.verification_confidence >= GLOBAL_ROUTE_CONFIDENCE_THRESHOLD &&
    failure_reasons.length === 0;

  return Object.freeze({
    route_id: routeId(observation),
    origin_jurisdiction: observation.origin_jurisdiction ?? null,
    destination_jurisdiction: observation.destination_jurisdiction ?? null,
    provider: observation.provider ?? null,
    asset: observation.asset ?? null,
    network: observation.network ?? null,
    settlement_destination: observation.settlement_destination ?? null,
    evidence_timestamp: observation.evidence_timestamp ?? null,
    verification_confidence: finiteNumber(observation.verification_confidence) ? observation.verification_confidence : null,
    normal_loss_threshold: roundMoney(threshold),
    verified_loss: roundMoney(verifiedLoss),
    exception_loss: roundMoney(exception_loss),
    adjusted_eligible_value,
    support_fee_rate: GLOBAL_ROUTE_FEE_RATE,
    proposed_support_fee,
    settlement_status: observation.settlement_status ?? "unsettled",
    state,
    payment_execution_eligible,
    receivable_evidence_complete: observation.settlement_status === "settled",
    realized_income: false,
    execution_performed: false,
    funds_moved: false,
    wallet_signing: false,
    transaction_broadcast: false,
    failure_reasons: Object.freeze(failure_reasons)
  });
}

export function summarizeGlobalRouteMatrix(rows = []) {
  const states = { verified: 0, deferred: 0, blocked: 0, settled: 0, exception: 0 };
  let execution_eligible = 0;
  for (const row of rows) {
    if (Object.hasOwn(states, row?.state)) states[row.state] += 1;
    if (row?.payment_execution_eligible === true) execution_eligible += 1;
  }
  return Object.freeze({ total: rows.length, execution_eligible, states: Object.freeze(states) });
}
