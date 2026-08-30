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
  assert.deepEqual(report.records[0].errors, [
    "realized_requires_qualifying_evidence",
    "realized_income_requires_settlement_evidence"
  ]);
});

test("keeps contracted, accrued, unrealized, projected, and unverified values outside realized net", () => {
  const report = summarizeRevenueLedger([
    {
      id: "contracted-service",
      direction: "income",
      category: "infrastructure",
      recognition: "contracted",
      amount_usd: 1200,
      evidence: [{ type: "signed_contract", reference: "contract:001" }]
    },
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
  assert.equal(report.summary.contracted_income_usd, 1200);
  assert.equal(report.summary.accrued_income_usd, 300);
  assert.equal(report.summary.unrealized_change_usd, 80);
  assert.equal(report.summary.projected_income_usd, 500);
  assert.equal(report.summary.unverified_income_usd, 700);
});

test("evaluates subscription run-rate separately from realized revenue", () => {
  const commercial = {
    model: "subscription",
    agreement_id: "sub_001",
    status: "active",
    billing_interval: "monthly",
    recurring_amount_usd: 100,
    contract_value_usd: 1200
  };

  const report = summarizeRevenueLedger([
    {
      id: "sub-contract",
      direction: "income",
      category: "subscription",
      recognition: "contracted",
      amount_usd: 1200,
      commercial,
      evidence: [
        { type: "subscription_agreement", reference: "sub_001" }
      ]
    },
    {
      id: "sub-payment-1",
      direction: "income",
      category: "subscription",
      recognition: "realized",
      amount_usd: 100,
      commercial,
      evidence: [
        { type: "subscription_payment", reference: "pi_001" }
      ]
    }
  ]);

  assert.equal(report.summary.contracted_income_usd, 1200);
  assert.equal(report.summary.realized_income_usd, 100);
  assert.equal(report.summary.net_realized_income_usd, 100);
  assert.equal(report.commercial_evaluation.subscriptions.agreements, 1);
  assert.equal(report.commercial_evaluation.subscriptions.mrr_run_rate_usd, 100);
  assert.equal(report.commercial_evaluation.subscriptions.arr_run_rate_usd, 1200);
  assert.equal(
    report.commercial_evaluation.subscriptions.contract_value_snapshot_usd,
    1200
  );
});

test("evaluates lease value and requires settlement evidence before realization", () => {
  const commercial = {
    model: "lease",
    agreement_id: "lease_001",
    status: "owner_accepted_pending_operator",
    lease_hours: 24,
    rate_usd_per_hour: 2.5
  };

  const report = summarizeRevenueLedger([
    {
      id: "lease-offer",
      direction: "income",
      category: "lease",
      recognition: "projected",
      amount_usd: 60,
      commercial
    },
    {
      id: "lease-contract",
      direction: "income",
      category: "lease",
      recognition: "contracted",
      amount_usd: 60,
      commercial,
      evidence: [
        { type: "capacity_lease", reference: "lease_001" }
      ]
    },
    {
      id: "lease-not-paid",
      direction: "income",
      category: "lease",
      recognition: "realized",
      amount_usd: 60,
      commercial,
      evidence: [
        { type: "capacity_lease", reference: "lease_001" }
      ]
    },
    {
      id: "lease-payment",
      direction: "income",
      category: "lease",
      recognition: "realized",
      amount_usd: 60,
      commercial: { ...commercial, status: "released" },
      evidence: [
        { type: "lease_payment", reference: "leasepay_001" }
      ]
    }
  ]);

  assert.equal(report.summary.projected_income_usd, 60);
  assert.equal(report.summary.contracted_income_usd, 60);
  assert.equal(report.summary.realized_income_usd, 60);
  assert.equal(report.summary.rejected_records, 1);
  assert.deepEqual(report.records[2].errors, [
    "realized_income_requires_settlement_evidence"
  ]);
  assert.equal(report.commercial_evaluation.leases.agreements, 1);
  assert.equal(report.commercial_evaluation.leases.lease_hours_snapshot, 24);
  assert.equal(report.commercial_evaluation.leases.contract_value_snapshot_usd, 60);
  assert.equal(report.commercial_evaluation.leases.realized_income_usd, 60);
});

test("rejects subscription or lease records without evaluable commercial terms", () => {
  const report = summarizeRevenueLedger([
    {
      id: "bad-sub",
      direction: "income",
      category: "subscription",
      recognition: "projected",
      amount_usd: 100
    },
    {
      id: "bad-lease",
      direction: "income",
      category: "lease",
      recognition: "projected",
      amount_usd: 100,
      commercial: {
        model: "lease",
        agreement_id: "lease_bad"
      }
    }
  ]);

  assert.equal(report.summary.accepted_records, 0);
  assert.equal(report.summary.rejected_records, 2);
  assert.ok(report.records[0].errors.includes("subscription_agreement_id_required"));
  assert.ok(report.records[0].errors.includes("subscription_billing_interval_required"));
  assert.ok(report.records[0].errors.includes("subscription_recurring_amount_required"));
  assert.ok(report.records[1].errors.includes("lease_contract_value_required"));
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
