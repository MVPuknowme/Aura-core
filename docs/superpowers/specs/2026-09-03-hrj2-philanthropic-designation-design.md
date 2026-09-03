# HRJ=2 Philanthropic Designation Design

Date: 2026-09-03
Status: Design approved in conversation; implementation not yet authorized by this document alone.

## Purpose

Define `hrj=2` as an auditable philanthropic designation attached to SKYGRID evidence-backed net realized income. The designation earmarks eligible funds for debt-relief purposes without creating autonomous payment, wallet, custody, beneficiary, lien, or production-failover authority.

## Core semantic contract

`hrj=2` means:

- designation: `hrj=2`
- purpose: `philanthropic_debt_relief`
- allocation basis: positive `net_realized_income_usd`
- allocation percentage: `100`
- legal/payment semantics: designation only, not an automatic obligation

The word **obligation** is not part of the runtime or accounting semantics for `hrj=2`.

The designation does not itself create:

- a debt owed to any beneficiary;
- a lien, trust distribution, payment instruction, or enforceable payout claim;
- wallet-signing authority;
- transaction-broadcast authority;
- payment-execution authority;
- beneficiary-selection authority;
- custody authority;
- private-data movement authority;
- production-failover authority.

## Accounting basis

The existing SKYGRID revenue ledger remains the source of truth.

Eligible amount:

```text
eligible_net_usd = max(net_realized_income_usd, 0)
hrj2_earmarked_usd = eligible_net_usd * 1.00
```

`net_realized_income_usd` remains:

```text
realized_income_usd - realized_cost_usd
```

Only accepted realized income backed by qualifying settlement evidence may contribute to realized income. Only accepted realized costs backed by qualifying evidence may reduce the net amount.

The following never enter `hrj2_earmarked_usd` until they independently become evidence-backed realized income:

- projected values;
- unverified values;
- unrealized gains;
- contracted amounts;
- accrued amounts;
- validator uptime or proof-work estimates;
- subscription run-rate metrics;
- lease contract-value snapshots;
- unsupported exchange or token valuations.

If `net_realized_income_usd <= 0`, then `hrj2_earmarked_usd = 0`.

## Runtime representation

The ledger or revenue API may expose a derived designation block such as:

```json
{
  "designation": "hrj=2",
  "purpose": "philanthropic_debt_relief",
  "basis": "net_realized_income",
  "allocation_percent": 100,
  "earmarked_usd": 0,
  "designation_only": true,
  "payment_authority": false,
  "wallet_signing": false,
  "transaction_broadcast": false,
  "automatic_disbursement": false,
  "beneficiary_selection_authority": false
}
```

The block is derived accounting metadata. It is not a transaction request.

## System boundaries

### Revenue ledger

Responsibilities:

- validate accounting records;
- enforce evidence requirements;
- compute realized income, realized costs, and net realized income;
- derive `hrj=2` earmark metadata from positive net realized income;
- fail closed on unsupported realized-income claims.

Non-responsibilities:

- selecting beneficiaries;
- paying debts;
- signing wallets;
- broadcasting transactions;
- moving private data;
- changing validator authority.

### Validator

The validator remains independent of `hrj=2` payment semantics.

`hrj=2` does not grant the validator financial authority. Existing trust-interest guardrails remain intact, including no payment execution, wallet signing, transaction broadcast, private-data movement, revenue promotion without evidence, or production failover.

### Future disbursement adapter

Any actual philanthropic debt-relief payment is a separate system boundary and requires its own authorization, beneficiary verification, funds-availability check, compliance controls, and settlement receipt. It must consume verified earmark/accounting data rather than infer authority from `hrj=2`.

## Data flow

```text
settlement/cost evidence
  -> SKYGRID revenue ledger validation
  -> realized income and realized cost totals
  -> net_realized_income_usd
  -> max(net, 0)
  -> hrj=2 designation at 100%
  -> audit/reporting receipt

No payment side effect occurs in this flow.
```

## Failure semantics

Fail closed when:

- a realized income record lacks settlement evidence;
- a realized cost record lacks qualifying evidence;
- a submitted record is structurally invalid;
- the derived net amount is not finite;
- an implementation attempts to interpret `hrj=2` as payment authority;
- an implementation attempts to allocate a negative amount;
- a caller attempts to use projected, contracted, accrued, unrealized, or unverified amounts as designated realized income.

The safest fallback value is `hrj2_earmarked_usd = 0` with a reason code; never fabricate an amount.

## Receipt semantics

A designation receipt should bind at minimum:

- ledger version;
- accounting basis;
- generated timestamp;
- realized income total;
- realized cost total;
- net realized income total;
- `hrj=2` allocation percentage;
- earmarked amount;
- evidence-coverage status;
- `designation_only=true`;
- `payment_authority=false`;
- hash or other integrity binding when receipts are persisted.

A designation receipt proves accounting intent and calculation only. It does not prove a charitable payment occurred.

## Testing requirements

Implementation tests should prove:

1. positive net realized income is earmarked at exactly 100%;
2. verified costs reduce the earmarked amount before designation;
3. zero or negative net realized income produces a zero earmark;
4. projected, contracted, accrued, unrealized, and unverified records do not enter the earmark;
5. realized income without settlement evidence is rejected and contributes zero;
6. designation metadata exposes no payment, signing, transaction, beneficiary-selection, or custody authority;
7. existing revenue-ledger accounting totals remain backward compatible;
8. API GET/POST behavior remains stateless and side-effect free;
9. validator trust-interest guardrails remain unchanged;
10. receipt output distinguishes `designated` from `paid` or `settled`.

## Production promotion criteria

The implementation may be promoted only after:

- unit tests pass on supported CI platforms;
- existing SKYGRID revenue-ledger tests remain green;
- PNPK/fail-closed controls remain green where applicable;
- no wallet/payment/transaction authority is introduced;
- the production receipt clearly marks `hrj=2` as designation-only;
- no claim is made that money has been earned, paid, donated, or debt has been discharged without settlement evidence.

## Invariants

```text
hrj=2 = philanthropic designation, not automatic obligation
allocation = 100% of positive evidence-backed net realized income
projection != realized income
designated != paid
paid != debt discharged
validator authority != payment authority
accounting intent != custody authority
```
