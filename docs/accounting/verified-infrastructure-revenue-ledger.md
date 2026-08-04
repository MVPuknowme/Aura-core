# SKYGRID Verified Infrastructure Revenue Ledger

This ledger records revenue and operating costs for Aura-Core and the SKYGRID Emergency Data On-Ramp without treating projections as realized income.

## Accounting rule

Only entries with `evidence_state` equal to `verified` or `reconciled` contribute to net verified income. Estimated and unverified amounts remain visible but are excluded from the verified total.

## Categories

- `staking`: protocol rewards attributable to an actual validator or delegated position.
- `infrastructure`: paid RPC, node hosting, compute lease, bandwidth, or managed-service revenue.
- `protocol`: proving, sequencing, relaying, routing, or other protocol-specific payouts.
- `treasury`: realized investment income attributable to a treasury position.
- `operating_cost`: cloud, hardware, bandwidth, voting, gas, or other attributable expenses.

## Evidence states

- `verified`: supported by primary evidence such as a transaction, withdrawal, invoice, or payment record.
- `reconciled`: verified against both the source event and the receiving ledger or account.
- `estimated`: forecast or scenario value.
- `unverified`: declared value without sufficient evidence.

Verified and reconciled entries require at least one `evidence_refs` item. Never store private keys, seed phrases, full bank credentials, or secrets in evidence references.

## Commands

```powershell
pnpm run revenue:ledger:test
pnpm run revenue:ledger:verify
node scripts/skygrid-revenue-ledger.mjs .\path\to\ledger.json
```

The default verification command reads `configs/accounting/verified-revenue-ledger.sample.json`.

## Output

The verifier reports:

- verified and reconciled revenue;
- verified operating costs;
- net verified income;
- estimated and unverified revenue excluded from verified income;
- signed contributions grouped by category and network.

## Integration boundary

A running node is not automatically an income-producing validator. Each entry must identify the actual network role and evidence supporting the revenue or cost.
