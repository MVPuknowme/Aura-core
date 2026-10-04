import assert from "node:assert/strict";
import test from "node:test";

import { summarizeValidatorEconomics } from "../lib/validator-economics.mjs";

test("keeps unverified validator projections out of realized income", () => {
  const report = summarizeValidatorEconomics({
    validatorId: "klamath-falls-core",
    status: "Needs Review",
    verifiedPaidUsd: 0,
    realizedDailyUsd: 0,
    scenarios: [
      {
        name: "annualized_family",
        recognition: "projected",
        dailyUsd: 134.63,
        weeklyUsd: 945,
        monthlyUsd: 4095,
        annualUsd: 49140
      },
      {
        name: "daily_headline",
        recognition: "unverified",
        dailyUsd: 1463
      }
    ]
  });

  assert.equal(report.accounting.verified_paid_usd, 0);
  assert.equal(report.accounting.realized_annual_income_usd, 0);
  assert.equal(report.planning_range.projected_daily_low_usd, 134.63);
  assert.equal(report.planning_range.projected_daily_high_usd, 1463);
  assert.equal(report.planning_range.is_verified_income, false);
});

test("derives planning periods when a scenario supplies only daily value", () => {
  const report = summarizeValidatorEconomics({
    validatorId: "validator-1",
    status: "Projected",
    scenarios: [
      {
        name: "case",
        recognition: "projected",
        dailyUsd: 100
      }
    ]
  });

  assert.equal(report.scenarios[0].weekly_usd, 700);
  assert.equal(report.scenarios[0].monthly_usd, 3044);
  assert.equal(report.scenarios[0].annual_usd, 36500);
});

test("reports realized economics separately when supported", () => {
  const report = summarizeValidatorEconomics({
    validatorId: "validator-2",
    status: "Verified",
    verifiedPaidUsd: 250,
    realizedDailyUsd: 10,
    scenarios: []
  });

  assert.equal(report.accounting.realized_weekly_income_usd, 70);
  assert.equal(report.accounting.realized_annual_income_usd, 3650);
  assert.match(report.conclusion, /Evidence-backed realized income exists/);
});

test("rejects negative or malformed money values", () => {
  assert.throws(
    () =>
      summarizeValidatorEconomics({
        validatorId: "validator-3",
        status: "Needs Review",
        verifiedPaidUsd: -1
      }),
    /verified_paid_usd_invalid/
  );
});
