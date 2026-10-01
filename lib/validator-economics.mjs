const RECOGNITION_STATES = new Set([
  "realized",
  "reconciled",
  "projected",
  "unverified"
]);

function finiteNonnegative(value, field) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`${field}_invalid`);
  }
  return value;
}

function text(value, field) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${field}_required`);
  }
  return value.trim();
}

function normalizeScenario(input = {}) {
  const name = text(input.name, "scenario_name");
  const recognition = text(input.recognition, "scenario_recognition");
  if (!RECOGNITION_STATES.has(recognition)) {
    throw new Error("scenario_recognition_invalid");
  }

  const daily = finiteNonnegative(input.dailyUsd, "scenario_daily_usd");
  const weekly =
    input.weeklyUsd === undefined
      ? Number((daily * 7).toFixed(2))
      : finiteNonnegative(input.weeklyUsd, "scenario_weekly_usd");
  const monthly =
    input.monthlyUsd === undefined
      ? Number((daily * 30.44).toFixed(2))
      : finiteNonnegative(input.monthlyUsd, "scenario_monthly_usd");
  const annual =
    input.annualUsd === undefined
      ? Number((daily * 365).toFixed(2))
      : finiteNonnegative(input.annualUsd, "scenario_annual_usd");

  return {
    name,
    recognition,
    daily_usd: daily,
    weekly_usd: weekly,
    monthly_usd: monthly,
    annual_usd: annual,
    source: typeof input.source === "string" ? input.source : null
  };
}

export function summarizeValidatorEconomics(input = {}) {
  const validatorId = text(input.validatorId, "validator_id");
  const status = text(input.status, "validator_status");
  const verifiedPaidUsd = finiteNonnegative(
    input.verifiedPaidUsd ?? 0,
    "verified_paid_usd"
  );
  const realizedDailyUsd = finiteNonnegative(
    input.realizedDailyUsd ?? 0,
    "realized_daily_usd"
  );

  const scenarios = Array.isArray(input.scenarios)
    ? input.scenarios.map(normalizeScenario)
    : [];

  const projected = scenarios.filter(
    (scenario) =>
      scenario.recognition === "projected" ||
      scenario.recognition === "unverified"
  );

  const lower = projected.length
    ? Math.min(...projected.map((scenario) => scenario.daily_usd))
    : null;
  const upper = projected.length
    ? Math.max(...projected.map((scenario) => scenario.daily_usd))
    : null;

  return {
    schema: "skygrid.validator-economics.v1",
    validator_id: validatorId,
    status,
    accounting: {
      verified_paid_usd: verifiedPaidUsd,
      realized_daily_income_usd: realizedDailyUsd,
      realized_weekly_income_usd: Number((realizedDailyUsd * 7).toFixed(2)),
      realized_monthly_income_usd: Number((realizedDailyUsd * 30.44).toFixed(2)),
      realized_annual_income_usd: Number((realizedDailyUsd * 365).toFixed(2))
    },
    planning_range: {
      projected_daily_low_usd: lower,
      projected_daily_high_usd: upper,
      is_verified_income: false
    },
    scenarios,
    conclusion:
      verifiedPaidUsd > 0 || realizedDailyUsd > 0
        ? "Evidence-backed realized income exists; projected scenarios remain separate."
        : "No evidence-backed realized income is present; projected validator values must not be presented as paid income."
  };
}
