import test from "node:test";
import assert from "node:assert/strict";
import {
  summarizeRevenueLedger,
  validateLedgerEntry
} from "../lib/accounting/verified-revenue-ledger.mjs";

function entry(overrides = {}) {
  return {
    entry_id: "entry-1",
    occurred_at: "2026-08-04T00:00:00.000Z",
    network: "ethereum",
    role: "validator",
    category: "staking",
    amount_usd: 100,
    evidence_state: "verified",
    evidence_refs: ["tx:0xabc"],
    ...overrides
  };
}

test("verified revenue is reduced by verified operating costs", () => {
  const report = summarizeRevenueLedger([
    entry(),
    entry({
      entry_id: "cost-1",
      network: "aws",
      role: "infrastructure",
      category: "operating_cost",
      amount_usd: 35,
      evidence_refs: ["invoice:aws-2026-08"]
    })
  ]);

  assert.equal(report.totals.verified_revenue_usd, 100);
  assert.equal(report.totals.verified_operating_cost_usd, 35);
  assert.equal(report.totals.net_verified_income_usd, 65);
});

test("estimated revenue is excluded from verified income", () => {
  const report = summarizeRevenueLedger([
    entry({ evidence_state: "estimated", evidence_refs: [], amount_usd: 500 })
  ]);

  assert.equal(report.totals.estimated_revenue_usd, 500);
  assert.equal(report.totals.net_verified_income_usd, 0);
});

test("verified entries require evidence references", () => {
  assert.throws(
    () => validateLedgerEntry(entry({ evidence_refs: [] })),
    /require evidence_refs/
  );
});

test("expenses must use operating_cost instead of negative values", () => {
  assert.throws(
    () => validateLedgerEntry(entry({ amount_usd: -1 })),
    /must be non-negative/
  );
});
