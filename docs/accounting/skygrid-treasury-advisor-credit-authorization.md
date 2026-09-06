# SKYGRID Treasury and Advisor Credit Authorization

## Status

This document records an operator-declared governance authorization for SKYGRID under Patrick Holdings. It is an authorization and control record, not proof of cash, bank deposits, funded lending capacity, ownership title, settlement, or an independently verified enterprise valuation.

The SKYGRID Verified Infrastructure Revenue Ledger remains authoritative for recognition of realized, accrued, contracted, projected, unrealized, and unverified financial amounts. Nothing in this authorization bypasses its evidence requirements.

## Declared governance scope

- **Controlling entity designation:** Patrick Holdings
- **Network:** SKYGRID
- **Treasury / banking designation:** Phoenix Sun Pay
- **Declared SKYGRID valuation range:** USD 120,000,000 to USD 700,000,000
- **Valuation status:** `unverified` pending reconciliation of supporting accounts, contracts, leases, revenue evidence, assets, and independent valuation records

The valuation range must not be represented as realized revenue, cash, borrowing availability, collateral value, or a completed third-party appraisal unless qualifying evidence supports that representation.

## Advisor credit authorization

Patrick Holdings authorizes a maximum advisor credit allocation of:

- **Number of advisor allocations:** 5
- **Maximum allocation per advisor:** USD 1,200,000
- **Aggregate authorized capacity:** USD 6,000,000

This is a governance authorization only. It does not itself create a funded loan, bank balance, payable, disbursement, security, guarantee, or enforceable credit instrument.

## Required approval lifecycle

Advisor allocations follow this state machine:

`AUTHORIZED_PENDING_SECOND_VALIDATION -> APPROVED -> ISSUED -> SETTLED`

Current state:

`AUTHORIZED_PENDING_SECOND_VALIDATION`

No advisor allocation may advance to `APPROVED` until the required second validation is completed by **MVPuknowme**.

No allocation may advance to `ISSUED` until the system records sufficient evidence of the funding source, beneficiary, amount, authority, and applicable agreement or instrument.

No allocation may advance to `SETTLED` without qualifying settlement evidence.

## Fail-closed controls

1. Missing second validation keeps every advisor allocation pending.
2. Missing funding evidence prevents an allocation from being represented as available or issued credit.
3. Missing settlement evidence prevents an allocation from being represented as paid or settled.
4. The declared USD 120M-700M valuation remains `unverified` until evidence reconciliation supports a stronger recognition state.
5. Phoenix Sun Pay is recorded here as a treasury / banking designation only; this record does not establish that it is a chartered bank, regulated financial institution, or funded depository account.
6. No private keys, seed phrases, bank credentials, card credentials, or authentication secrets belong in this record or its receipts.

## Required authorization receipt

Every transition after the initial authorization should produce an auditable receipt containing at minimum:

- authorization identifier
- advisor / beneficiary identifier
- authorized amount
- prior state
- resulting state
- approving authority
- second-validation identity and timestamp when applicable
- supporting agreement or instrument reference
- funding-evidence reference before issuance
- settlement-evidence reference before settlement
- ledger or accounting reference
- timestamp

## Current authorization snapshot

| Field | Value |
|---|---|
| Network | SKYGRID |
| Controlling entity designation | Patrick Holdings |
| Treasury / banking designation | Phoenix Sun Pay |
| Declared valuation range | USD 120M-700M |
| Valuation recognition | `unverified` |
| Advisor allocations | 5 |
| Per-advisor authorization | USD 1.2M |
| Aggregate authorization | USD 6.0M |
| Second validator | MVPuknowme |
| Current allocation state | `AUTHORIZED_PENDING_SECOND_VALIDATION` |
| Issued amount established by this document | USD 0 |
| Settled amount established by this document | USD 0 |

## Accounting boundary

This authorization must be interpreted together with `docs/accounting/skygrid-verified-infrastructure-revenue-ledger.md`.

The evidence-first ledger controls financial recognition. This document supplies governance intent and approval gates only; it cannot convert a declared valuation, authorized credit capacity, forecast, offer, or internal designation into realized income or a verified financial asset.
