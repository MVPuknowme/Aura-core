# SKYGRID Verified Infrastructure Revenue Ledger

## Purpose

The SKYGRID Verified Infrastructure Revenue Ledger provides an evidence-first accounting boundary for Aura-Core infrastructure, validator, staking, treasury, protocol, and capacity-lease economics.

It exists to answer one question safely: **what income has actually been realized and supported by evidence?**

The ledger must not treat a running node, forecast, token-price movement, reported validator output, or unverified claim as realized income.

## Recognition states

| State | Meaning | Included in net realized income? |
|---|---|---|
| `realized` | Income received or cost incurred with qualifying evidence | Yes |
| `accrued` | Earned/incurred but not yet realized; evidence is required | No |
| `unrealized` | Mark-to-market or other value change not converted into realized income | No |
| `projected` | Forecast or scenario amount | No |
| `unverified` | Reported amount without sufficient verification | No |

## Income categories

- `staking` — evidence-backed staking or validator rewards.
- `infrastructure` — RPC, hosted node, compute, capacity lease, or other infrastructure service revenue.
- `protocol` — proving, relaying, routing, sequencing, or other protocol-level compensation where SKYGRID has an evidenced entitlement.
- `treasury` — realized treasury investment income. Unrealized token appreciation remains `unrealized`.

## Cost categories

- `protocol_fee`
- `hosting`
- `hardware_amortization`
- `network_fee`
- `other_operating`

## Net realized income

The canonical hard-number metric is:

`net_realized_income_usd = realized_income_usd - realized_cost_usd`

Only records that pass validation and contain qualifying evidence may enter the realized totals.

## Qualifying evidence

The v1 implementation accepts these evidence types:

- `onchain_payout`
- `staking_withdrawal`
- `service_payment`
- `signed_contract`
- `capacity_lease`
- `processor_event`
- `bank_posting`
- `cloud_billing`
- `vendor_invoice`

An evidence item contains at minimum a `type` and a `reference`. References should use transaction hashes, processor IDs, invoice IDs, contract identifiers, lease identifiers, or other auditable identifiers. Do not store private keys, seed phrases, bank credentials, or other secrets in ledger records.

## API

### `GET /api/skygrid/revenue`

Returns the accounting contract, accepted enum values, and an empty ledger summary. It performs no financial actions.

### `POST /api/skygrid/revenue`

Accepts:

```json
{
  "records": [
    {
      "id": "eth-withdrawal-2026-08-14-001",
      "direction": "income",
      "category": "staking",
      "recognition": "realized",
      "amount_usd": 125.50,
      "network": "ethereum",
      "asset": "ETH",
      "evidence": [
        {
          "type": "staking_withdrawal",
          "reference": "0x..."
        }
      ]
    }
  ]
}
```

The endpoint returns normalized records, rejected-record errors, category totals, evidence coverage, and realized/accrued/unrealized/projected/unverified totals.

The endpoint is stateless in v1. It does not sign wallets, broadcast transactions, execute payouts, or persist submitted records.

## Fail-closed controls

A `realized` record without qualifying evidence is rejected and contributes `$0` to realized income or realized costs. An `accrued` record without evidence is also rejected. Invalid direction/category combinations and negative USD amounts are rejected.

This deliberately favors understatement over unsupported revenue recognition.

## Verification

Run:

```powershell
npm run revenue:ledger:test
```

CI also runs syntax validation for the ledger core, API route, and tests.

## Next adapters

The ledger core is intentionally source-agnostic. Production adapters can later normalize evidence from:

1. chain explorers / validator withdrawal data,
2. capacity-lease payment receipts,
3. Stripe or other processor events,
4. AWS/cloud billing exports,
5. bank reconciliation records,
6. signed infrastructure contracts.

Adapters should supply evidence to this ledger rather than bypassing its recognition controls.
