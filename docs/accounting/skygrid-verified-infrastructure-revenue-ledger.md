# SKYGRID Verified Infrastructure Revenue Ledger

## Purpose

The SKYGRID Verified Infrastructure Revenue Ledger provides an evidence-first accounting boundary for Aura-Core infrastructure, validator, staking, treasury, protocol, subscription, and capacity-lease economics.

It exists to answer two related questions safely:

1. **What income has actually been realized and supported by settlement evidence?**
2. **What subscription and lease value is contracted, accrued, or projected without pretending it is realized cash revenue?**

The ledger must not treat a running node, forecast, token-price movement, subscription run-rate, lease offer, signed agreement, or unverified claim as realized income.

## Recognition states

| State | Meaning | Included in net realized income? |
|---|---|---|
| `realized` | Income received with settlement evidence, or cost incurred with qualifying evidence | Yes |
| `accrued` | Earned/incurred but not yet realized; evidence is required | No |
| `contracted` | Commercial commitment supported by contract/agreement evidence but not yet earned/settled | No |
| `unrealized` | Mark-to-market or other value change not converted into realized income | No |
| `projected` | Forecast, offer, quote, or scenario amount | No |
| `unverified` | Reported amount without sufficient verification | No |

The `contracted` state is intentionally separate from `accrued`: a signed subscription or lease can represent committed value before service has been delivered or payment has settled.

## Income categories

- `staking` — evidence-backed staking or validator rewards.
- `infrastructure` — RPC, hosted node, compute, or other infrastructure service revenue.
- `subscription` — recurring SKYGRID service subscriptions evaluated with an agreement ID, billing interval, and recurring amount.
- `lease` — capacity or infrastructure leases evaluated with an agreement ID and contract value (explicit or derived from lease hours × hourly rate).
- `protocol` — proving, relaying, routing, sequencing, or other protocol-level compensation where SKYGRID has an evidenced entitlement.
- `treasury` — realized treasury investment income. Unrealized token appreciation remains `unrealized`.

## Cost categories

- `protocol_fee`
- `hosting`
- `hardware_amortization`
- `network_fee`
- `other_operating`

## Net realized income

The canonical hard-number metric remains:

`net_realized_income_usd = realized_income_usd - realized_cost_usd`

Subscription MRR/ARR, lease contract value, contracted income, accrued income, projections, and other commercial evaluation fields never enter this number.

## Subscription evaluation

A `subscription` record requires a `commercial` object with:

- `agreement_id`
- `billing_interval`: `weekly`, `monthly`, `quarterly`, or `annual`
- `recurring_amount_usd`
- optional `contract_value_usd`
- optional `status`, `starts_at`, and `ends_at`

The ledger normalizes recurring amounts to:

- `mrr_run_rate_usd`
- `arr_run_rate_usd`

Run-rate metrics are commercial snapshots, **not realized revenue**.

For multiple accepted records with the same subscription `agreement_id`, the last accepted record in the submitted batch is used for the commercial snapshot. Accounting totals still reflect each accepted accounting record.

### Subscription lifecycle

| Commercial state | Ledger recognition | Typical evidence |
|---|---|---|
| quote / forecast | `projected` | none required |
| signed subscription | `contracted` | `subscription_agreement` or `signed_contract` |
| service delivered but unpaid | `accrued` | agreement and/or `subscription_invoice` |
| payment settled | `realized` | `subscription_payment`, `processor_event`, `bank_posting`, or other settlement evidence |

A subscription agreement by itself does not qualify as realized income.

## Lease evaluation

A `lease` record requires a `commercial` object with:

- `agreement_id`
- either `contract_value_usd`, or both:
  - `lease_hours`
  - `rate_usd_per_hour`
- optional `status`, `starts_at`, and `ends_at`

When explicit contract value is omitted, SKYGRID derives:

`contract_value_usd = lease_hours × rate_usd_per_hour`

The response reports:

- distinct lease agreement snapshots
- aggregate lease hours in the latest submitted snapshots
- aggregate lease contract-value snapshots
- projected, contracted, accrued, and realized lease income separately

This aligns with the existing SKYGRID capacity-lease flow:

| Capacity-lease state | Ledger recognition guidance |
|---|---|
| `offered` | `projected` |
| `owner_accepted_pending_operator` | normally `contracted` only when agreement evidence is present |
| `approved_pending_activation` | `contracted` |
| `active` | `accrued` only for service actually delivered and evidenced |
| paid/settled lease period | `realized` with settlement evidence |
| `released`, `rejected`, `expired` | no new realized income unless a separate settlement record proves it |

A `capacity_lease` or `lease_agreement` proves a commercial agreement; it does **not** by itself prove payment.

## Evidence classes

### Contract evidence

Contracted values require one of:

- `signed_contract`
- `capacity_lease`
- `subscription_agreement`
- `lease_agreement`

### Income settlement evidence

Realized income requires settlement evidence such as:

- `onchain_payout`
- `staking_withdrawal`
- `service_payment`
- `subscription_payment`
- `lease_payment`
- `processor_event`
- `bank_posting`

### Other qualifying evidence

The ledger also accepts evidence used for accruals, costs, and audit context:

- `subscription_invoice`
- `lease_invoice`
- `cloud_billing`
- `vendor_invoice`

Every evidence item contains at minimum a `type` and a `reference`. References should use transaction hashes, processor IDs, invoice IDs, contract identifiers, lease identifiers, or other auditable identifiers. Do not store private keys, seed phrases, bank credentials, or other secrets in ledger records.

## API

### `GET /api/skygrid/revenue`

Returns the accounting contract, accepted enum values, an empty ledger summary, and empty subscription/lease evaluation blocks. It performs no financial actions.

### `POST /api/skygrid/revenue`

Accepts records for stateless verification and aggregation.

Subscription example:

```json
{
  "records": [
    {
      "id": "sub-payment-001",
      "direction": "income",
      "category": "subscription",
      "recognition": "realized",
      "amount_usd": 100,
      "commercial": {
        "model": "subscription",
        "agreement_id": "sub_001",
        "status": "active",
        "billing_interval": "monthly",
        "recurring_amount_usd": 100,
        "contract_value_usd": 1200
      },
      "evidence": [
        {
          "type": "subscription_payment",
          "reference": "processor:payment:001"
        }
      ]
    }
  ]
}
```

Lease example:

```json
{
  "records": [
    {
      "id": "lease-contract-001",
      "direction": "income",
      "category": "lease",
      "recognition": "contracted",
      "amount_usd": 60,
      "commercial": {
        "model": "lease",
        "agreement_id": "lease_001",
        "status": "owner_accepted_pending_operator",
        "lease_hours": 24,
        "rate_usd_per_hour": 2.5
      },
      "evidence": [
        {
          "type": "capacity_lease",
          "reference": "lease_001"
        }
      ]
    }
  ]
}
```

The endpoint returns normalized records, rejected-record errors, accounting totals, evidence coverage, realized category totals, and a `commercial_evaluation` block for subscriptions and leases.

The endpoint is stateless. It does not sign wallets, broadcast transactions, execute payouts, activate devices, or persist submitted records.

## Fail-closed controls

A `realized` income record without settlement evidence is rejected and contributes `$0` to realized income. A `contracted` record without contract evidence is rejected. An `accrued` record without evidence is rejected. Subscription and lease records without evaluable commercial terms are rejected.

This deliberately favors understatement over unsupported revenue recognition.

## Verification

Run:

```powershell
pnpm run revenue:ledger:test
```

CI also runs syntax validation for the ledger core, API route, and tests.

## Next adapters

The ledger core remains source-agnostic. Production adapters can normalize evidence from:

1. subscription processors and billing systems,
2. capacity-lease offers, agreements, usage receipts, and settlements,
3. chain explorers / validator withdrawal data,
4. AWS/cloud billing exports,
5. bank reconciliation records,
6. signed infrastructure contracts.

Adapters should supply evidence to this ledger rather than bypassing its recognition controls.
