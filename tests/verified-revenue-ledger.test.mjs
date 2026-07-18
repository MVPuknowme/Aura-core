import test from "node:test";
import assert from "node:assert/strict";
import {
  ledgerSchema,
  normalizeLedgerRecord,
  summarizeLedger
} from "../lib/verified-revenue-ledger.mjs";

test("counts only verified and reconciled records in verified net income", () => {
  const result = summarizeLedger([
    {
      id: "staking-1",
      kind: "revenue",
      classification: "staking",
      amount_usd: 100,
      network: "ethereum",
      evidence_state: "verified",
      evidence: { tx_hash: "0xabc" }
    },
    {
      id: "rpc-1",
      kind: "revenue",
      classification: "infrastructure",
      amount_usd: 50,
      network: "skygrid",
      evidence_state: "estimated"
    },
    {
      id: "cloud-1",
      kind: "cost",
      classification: "cloud",
      amount_usd: 30,
      network: "skygrid",
      evidence_state: "reconciled",
      evidence: { invoice_id: "inv-1" }
    }
  ]);

  assert.equal(result.totals.verified_revenue_usd, 100);
  assert.equal(result.totals.verified_cost_usd, 30);
  assert.equal(result.totals.verified_net_income_usd, 70);
  assert.equal(result.totals.estimated_revenue_usd, 50);
  assert.equal(result.record_counts.excluded_from_verified_totals, 1);
  assert.equal(result.safeguards.estimates_in_verified_income, false);
});

test("separates network and classification net values", () => {
  const result = summarizeLedger([
    {
      kind: "revenue",
      classification: "protocol",
      amount_usd: 80,
      network: "scroll",
      evidence_state: "verified"
    },
    {
      kind: "cost",
      classification: "gas",
      amount_usd: 15,
      network: "scroll",
      evidence_state: "verified"
    }
  ]);

  assert.equal(result.by_network.scroll, 65);
  assert.equal(result.by_classification.protocol, 80);
  assert.equal(result.by_classification.gas, -15);
});

test("rejects negative amounts and unsupported classifications", () => {
  assert.throws(() => normalizeLedgerRecord({
    kind: "revenue",
    classification: "staking",
    amount_usd: -1,
    evidence_state: "verified"
  }), /cannot be negative/);

  assert.throws(() => normalizeLedgerRecord({
    kind: "revenue",
    classification: "node_magic",
    amount_usd: 1,
    evidence_state: "verified"
  }), /classification must be one of/);
});

test("publishes the controlled ledger schema", () => {
  const schema = ledgerSchema();
  assert.ok(schema.revenue_classes.includes("staking"));
  assert.ok(schema.cost_classes.includes("cloud"));
  assert.match(schema.verified_income_rule, /verified or reconciled/);
});
