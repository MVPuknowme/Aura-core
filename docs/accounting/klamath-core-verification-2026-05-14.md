# Klamath Falls Core Verification Report

Record under review: `rec454piNH86zxcy2`
Node ID: `klamath-falls-core`
Airtable base: `appUF24vYBBQnpeQl`
Sun Pay Node Ledger table: `tblKWnm4eCo9wCBHS`
Payout Logs table: `tblH4gyDG9O643XRS`

## Current determination

`klamath-falls-core` must remain `Needs Review` until primary-source evidence is attached and reconciled.

Do not mark this node as `Verified` or `Paid` based only on projected ledger rows.

## Current reconstructed values

| Field | Value | Verification state |
|---|---:|---|
| Reported daily output | $1,463.00/day | Projected / needs review |
| Pending payout view | $1,463.00 | Needs review |
| Infrastructure reinvestment allocation | $585.20/day | Projected |
| Founder allocation | $43.89/day | Projected |
| Verified paid amount | $0.00 | No settlement evidence attached |

## Accounting mismatch

The $1,463/day figure conflicts with earlier weekly, monthly, and annual figures associated with Klamath output:

| Figure family | Value | Implied daily rate |
|---|---:|---:|
| Daily headline | $1,463/day | $1,463/day |
| Weekly projection | $945/week | ~$135/day |
| Monthly projection | $4,095/month | ~$136.50/day |
| Annual projection | $49,140/year | ~$134.63/day |

This mismatch means the current node output cannot be treated as verified revenue.

Possible causes:

- decimal-place drift
- gross-vs-net mismatch
- stale projection copied forward
- validator-class output mixed with micro-node output
- period mismatch between daily and long-term projections

## Required artifacts before verification

To move from `Needs Review` to `Verified`, attach or link:

1. Airtable raw JSON export for `rec454piNH86zxcy2`.
2. Linked Route Map rows.
3. Linked Income Dashboard rows.
4. AWS account/region mapping.
5. AWS resource identifiers: EC2, ECS, Lambda, EKS, or other service IDs.
6. CloudWatch metrics for the claimed window:
   - CPU
   - NetworkIn
   - NetworkOut
   - status checks
   - custom validator metrics, if applicable
7. Deployment manifest or CloudFormation/Terraform evidence.
8. U.S. Bank ACH export if ACH payout is claimed.
9. ACH trace ID, posting date, effective date, and exact amount for any bank payout.
10. Wallet or on-chain transaction hash if crypto settlement is claimed.
11. Exception log for reversals, failed payments, adjustments, or stale estimates.

## U.S. Bank payout rail classification

U.S. Bank may be used as the intended payout rail only after bank-side evidence is attached.

Until then:

- Payout Method: `Ledger Only`
- Verification Status: `Projected` or `Needs Review`
- Paid Amount: `$0.00`

Never store full bank account numbers, routing numbers, login information, or credentials in Airtable or GitHub.

Allowed storage:

- masked destination label
- account last four only if necessary
- ACH trace ID
- statement month
- posting date
- external processor reference

## Referral / bank-offer handling

Any uploaded bank referral or promotional link is a reference artifact only. It is not proof of payout readiness, account ownership, ACH settlement, or revenue.

## Required status flow

```text
Needs Review
  -> Verified
  -> Pending Payout
  -> Paid
```

Do not skip steps.

## Verification checklist

- [ ] Confirm authoritative amount family: $1,463/day vs ~$135/day.
- [ ] Attach AWS resource mapping.
- [ ] Attach CloudWatch telemetry.
- [ ] Attach route/packet health proof.
- [ ] Attach U.S. Bank ACH evidence if ACH settlement is claimed.
- [ ] Reconcile payout logs against bank or wallet evidence.
- [ ] Update Airtable status only after primary-source proof is present.

## Safe conclusion

Current status: `Needs Review`

Current verified paid amount: `$0.00`

Current projected reinvestment model remains useful for planning but must not be represented as realized revenue.
