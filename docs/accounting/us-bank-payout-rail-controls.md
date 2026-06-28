# U.S. Bank Payout Rail Controls

Purpose: define the safe accounting controls for using U.S. Bank as a potential ACH payout rail for Sun Pay Phoenix / SKYGRID node credits.

## Scope

This document applies to:

- `klamath-falls-core`
- `rec454piNH86zxcy2`
- Sun Pay Payout Logs
- founder allocation records
- infrastructure reinvestment records
- future node-host payout records

## Current classification

U.S. Bank is an intended or candidate payout rail only.

It is not verified payout evidence until statement or ACH trace documentation exists.

## Required bank-side artifacts

To promote a payout from `Projected` or `Estimated` to `Paid`, the record must include:

1. exact amount
2. posting date
3. effective date if available
4. ACH trace ID or bank reference
5. masked destination
6. statement month
7. reconciliation note
8. matching Airtable payout log ID

## Forbidden information

Never commit or store:

- full account number
- routing number
- username
- password
- one-time passcode
- Plaid access token
- bank API token
- private key
- seed phrase

## Allowed masked destination examples

```text
usbank-checking-****1234
usbank-savings-****9876
usbank-ach-verified-last4-only
```

## Status rules

| Status | Meaning |
|---|---|
| Projected | model only; no bank proof |
| Estimated | internal calculation; no final settlement |
| Verified | source evidence exists, but not paid yet |
| Pending Payout | approved for payment execution |
| Paid | matched bank/chain/processor record exists |
| Needs Review | discrepancy or missing source evidence |

## Klamath rule

`rec454piNH86zxcy2` must remain `Needs Review` until the $1,463/day figure is reconciled against AWS telemetry, payment evidence, and earlier weekly/monthly/annual projection figures.

No Klamath allocation should be classified as `Paid` unless a U.S. Bank, wallet, or processor source trace exists.
