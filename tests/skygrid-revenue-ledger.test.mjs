import assert from "node:assert/strict";
import test from "node:test";

import { summarizeRevenueLedger } from "../lib/skygrid-revenue-ledger.mjs";

test("counts only evidence-backed realized income in realized net", () => {
  const report = summarizeRevenueLedger([
    {
      id: "staking-withdrawal-1",
      direction: "income",
      category: "staking",
      recognition: "realized",
      amount_usd: 125.5,
      network: "ethereum",
      evidence: [
        { type: "staking_withdrawal", reference: "0xabc" }
      ]
    },
    {
      id: "hosting-cost-1",
      direction: "cost",
      category: "hosting",
      recognition: "realized",
      amount_usd: 25.25,
      evidence: [
        { type: "cloud_billing", reference: "aws:invoice:123" }
      ]
    },
    {
      id: "projection-1",
      direction: "income",
      category: "infrastructure",
      recognition: "projected",
      amount_usd: 9000
    }
  ]);

  assert.equal(report.summary.realized_income_usd, 125.5);
  assert.equal(report.summary.realized_cost_usd, 25.25);
  assert.equal(report.summary.net_realized_income_usd, 100.25);
  assert.equal(report.summary.projected_income_usd, 9000);
});

test("rejects a realized amount that lacks qualifying evidence", () => {
  const report = summarizeRevenueLedger([
    {
      id: "unsupported-realized-claim",
      direction: "income",
      category: "protocol",
      recognition: "realized",
      amount_usd: 100000,
      evidence: []
    }
  ]);

  assert.equal(report.summary.realized_income_usd, 0);
  assert.equal(report.summary.rejected_records, 1);
  assert.deepEqual(report.records[0].errors, ["realized_requires_qualifying_evidence"]);
});

test("keeps accrued, unrealized, projected, and unverified values outside realized net", () => {
  const report = summarizeRevenueLedger([
    {
      id: "accrued-service",
      direction: "income",
      category: "infrastructure",
      recognition: "accrued",
      amount_usd: 300,
      evidence: [{ type: "signed_contract", reference: "contract:001" }]
    },
    {
      id: "treasury-gain",
      direction: "income",
      category: "treasury",
      recognition: "unrealized",
      amount_usd: 80
    },
    {
      id: "forecast",
      direction: "income",
      category: "protocol",
      recognition: "projected",
      amount_usd: 500
    },
    {
      id: "claim",
      direction: "income",
      category: "staking",
      recognition: "unverified",
      amount_usd: 700
    }
  ]);

  assert.equal(report.summary.net_realized_income_usd, 0);
  assert.equal(report.summary.accrued_income_usd, 300);
  assert.equal(report.summary.unrealized_change_usd, 80);
  assert.equal(report.summary.projected_income_usd, 500);
  assert.equal(report.summary.unverified_income_usd, 700);
});

test("rejects invalid categories and negative amounts", () => {
  const report = summarizeRevenueLedger([
    {
      id: "bad-record",
      direction: "income",
      category: "validator_magic",
      recognition: "realized",
      amount_usd: -10,
      evidence: [{ type: "onchain_payout", reference: "0xdef" }]
    }
  ]);

  assert.equal(report.summary.accepted_records, 0);
  assert.equal(report.summary.rejected_records, 1);
  assert.ok(report.records[0].errors.includes("invalid_amount_usd"));
  assert.ok(report.records[0].errors.includes("invalid_income_category"));
});
