#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";

const POLICY_PATH = path.join(process.cwd(), "configs", "sunpay", "accounting-policy.v1.json");

const KNOWN_REVIEW_RECORDS = [
  {
    record_id: "rec454piNH86zxcy2",
    node_id: "klamath-falls-core",
    region: "Klamath Falls / Klamath County",
    reported_daily_output_usd: 1463,
    weekly_projection_usd: 945,
    monthly_projection_usd: 4095,
    annual_projection_usd: 49140,
    status: "Needs Review",
    verified_paid_usd: 0,
    required_evidence: [
      "aws_region_mapping",
      "cloudwatch_metrics",
      "deployment_manifest",
      "bank_or_payment_statement",
      "source_trace"
    ]
  }
];

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function analyzeRecord(record) {
  const implied = {
    daily_from_weekly: roundMoney(record.weekly_projection_usd / 7),
    daily_from_monthly_30d: roundMoney(record.monthly_projection_usd / 30),
    daily_from_annual: roundMoney(record.annual_projection_usd / 365)
  };

  const headline = Number(record.reported_daily_output_usd);
  const baselineAverage = roundMoney((implied.daily_from_weekly + implied.daily_from_monthly_30d + implied.daily_from_annual) / 3);
  const ratio = roundMoney(headline / baselineAverage);

  const flags = [];

  if (record.status === "Paid" && record.verified_paid_usd <= 0) {
    flags.push("paid_status_without_verified_paid_amount");
  }

  if (record.status === "Verified" && record.verified_paid_usd <= 0) {
    flags.push("verified_status_without_payment_evidence");
  }

  if (ratio > 2) {
    flags.push("daily_output_conflicts_with_projection_family");
  }

  if (record.status === "Needs Review") {
    flags.push("manual_review_required");
  }

  return {
    ...record,
    implied_daily_rates: implied,
    baseline_average_daily_usd: baselineAverage,
    headline_to_baseline_ratio: ratio,
    flags,
    safe_status: flags.length ? "Needs Review" : record.status
  };
}

async function writeStepSummary(report) {
  if (!process.env.GITHUB_STEP_SUMMARY) return;

  const rows = report.records.map((record) => (
    `| ${record.node_id} | ${record.record_id} | $${record.reported_daily_output_usd.toFixed(2)} | $${record.baseline_average_daily_usd.toFixed(2)} | ${record.headline_to_baseline_ratio}x | ${record.safe_status} | ${record.flags.join(", ")} |`
  )).join("\n");

  await fs.appendFile(
    process.env.GITHUB_STEP_SUMMARY,
    `# Sun Pay Accounting Review\n\n| Node | Record | Headline Daily | Projection Baseline | Ratio | Safe Status | Flags |\n|---|---|---:|---:|---:|---|---|\n${rows}\n`
  );
}

async function main() {
  const policy = JSON.parse(await fs.readFile(POLICY_PATH, "utf8"));
  const records = KNOWN_REVIEW_RECORDS.map(analyzeRecord);

  const report = {
    generated_at: new Date().toISOString(),
    policy_id: policy.policy_id,
    system: policy.system,
    records,
    summary: {
      total_records_checked: records.length,
      needs_review: records.filter((record) => record.safe_status === "Needs Review").length,
      verified_paid_usd: records.reduce((sum, record) => sum + Number(record.verified_paid_usd || 0), 0)
    }
  };

  console.log(JSON.stringify(report, null, 2));
  await writeStepSummary(report);

  const disallowed = records.filter((record) => record.flags.includes("paid_status_without_verified_paid_amount"));
  if (disallowed.length) {
    throw new Error(`Accounting review failed: ${disallowed.length} records marked paid without verified paid amount.`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
