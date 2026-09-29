#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { verifyCoinbaseReferralBatch } from "../lib/referrals/coinbase-preflight.mjs";

const inputPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(process.cwd(), "configs", "referrals", "coinbase-referral.sample.json");

const threshold = process.env.COINBASE_REFERRAL_VERIFY_THRESHOLD || "0.96";

async function main() {
  const document = JSON.parse(await fs.readFile(inputPath, "utf8"));
  const records = Array.isArray(document) ? document : document.records;
  const report = verifyCoinbaseReferralBatch(records, { threshold });

  console.log(JSON.stringify(report, null, 2));

  if (process.env.GITHUB_STEP_SUMMARY) {
    await fs.appendFile(
      process.env.GITHUB_STEP_SUMMARY,
      `# Coinbase referral preflight\n\n` +
        `- Verification threshold: **${report.threshold}**\n` +
        `- Records checked: **${report.total}**\n` +
        `- Deposit-ready: **${report.deposit_ready}**\n` +
        `- Blocked / fail-closed: **${report.blocked}**\n\n` +
        `This verifier does not move funds or retroactively alter Coinbase referral attribution.\n`
    );
  }

  if (!report.ok) process.exitCode = 2;
}

main().catch((error) => {
  console.error(`Coinbase referral preflight failed: ${error.message}`);
  process.exitCode = 1;
});
