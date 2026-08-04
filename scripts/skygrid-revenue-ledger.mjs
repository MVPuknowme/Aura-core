#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { summarizeRevenueLedger } from "../lib/accounting/verified-revenue-ledger.mjs";

const inputPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(process.cwd(), "configs", "accounting", "verified-revenue-ledger.sample.json");

async function writeStepSummary(report) {
  if (!process.env.GITHUB_STEP_SUMMARY) return;

  const totals = report.totals;
  const rows = Object.entries(report.by_network)
    .map(([network, values]) => `| ${network} | $${values.verified_usd.toFixed(2)} | $${values.projected_usd.toFixed(2)} |`)
    .join("\n");

  await fs.appendFile(
    process.env.GITHUB_STEP_SUMMARY,
    `# SKYGRID Verified Infrastructure Revenue Ledger\n\n` +
      `- Net verified income: **$${totals.net_verified_income_usd.toFixed(2)}**\n` +
      `- Verified operating costs: **$${totals.verified_operating_cost_usd.toFixed(2)}**\n` +
      `- Estimated revenue excluded from verified income: **$${totals.estimated_revenue_usd.toFixed(2)}**\n\n` +
      `| Network | Verified net contribution | Projected net contribution |\n|---|---:|---:|\n${rows}\n`
  );
}

async function main() {
  const document = JSON.parse(await fs.readFile(inputPath, "utf8"));
  if (!Array.isArray(document.entries)) {
    throw new TypeError("ledger document must contain an entries array");
  }

  const report = summarizeRevenueLedger(document.entries);
  console.log(JSON.stringify(report, null, 2));
  await writeStepSummary(report);
}

main().catch((error) => {
  console.error(`Revenue ledger verification failed: ${error.message}`);
  process.exitCode = 1;
});
