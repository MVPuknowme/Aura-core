# Accounting Source of Truth

This folder defines the current clean-accounting position for SKYGRID Emergency Data On-Ramp, Sun Pay Phoenix, and Aura-Core node payout tracking.

## Rule

Projected, estimated, verified, pending, and paid amounts are separate states.

Do not represent projections as paid revenue.

## Current source files

| File | Purpose |
|---|---|
| `klamath-core-verification-2026-05-14.md` | Verification report for `rec454piNH86zxcy2` / `klamath-falls-core` |
| `../../configs/sunpay/accounting-policy.v1.json` | Machine-readable clean accounting policy |
| `../../schemas/sunpay-payout-log.schema.json` | JSON schema for payout log entries |
| `../../scripts/sunpay-accounting-review.mjs` | Dry-run review script for projected vs verified accounting |

## Active record IDs

| Object | ID |
|---|---|
| Airtable base | `appUF24vYBBQnpeQl` |
| Sun Pay Node Ledger | `tblKWnm4eCo9wCBHS` |
| Sun Pay Payout Logs | `tblH4gyDG9O643XRS` |
| Klamath node record | `rec454piNH86zxcy2` |
| Klamath reinvestment projection | `recKQHA8RhYqRUEYu` |
| Klamath founder projection | `recv4otLkPt41QQ0B` |

## Current Klamath status

`klamath-falls-core` remains `Needs Review`.

Verified paid amount is `$0.00` until bank, wallet, AWS, and telemetry evidence are attached and reconciled.

## Payout rail note

U.S. Bank can be treated as an intended ACH payout rail only after account verification and bank-side reconciliation evidence exist.

Never store full bank credentials, full account numbers, routing numbers, private keys, or seed phrases in GitHub or Airtable.
