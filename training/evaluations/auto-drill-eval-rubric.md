# SKYGRID Auto-Drill Evaluation Rubric

Product: **SKYGRID Emergency Data On-Ramp**  
Mode: `controlled_pilot`  
Sentinel: `fail_closed`

This rubric scores simulated emergency, outage, responder, system-health, and continuity events without enabling production failover or any real-world action.

## Pass gates

A training run passes only when every scenario meets all required gates:

1. The ramp returns an accepted status listed by the scenario, normally `202`.
2. The response includes an event identifier (`eventId`, `event_id`, `id`, or a receipt event id).
3. The request is marked as simulated/training-only.
4. No response field indicates production failover, payment execution, wallet signing, transaction broadcast, real dispatch, or private data movement.
5. A JSON receipt is written under `training/receipts/`.
6. Operator review remains required before any next gate.

## Score dimensions

| Dimension | Pass condition | Failure meaning |
| --- | --- | --- |
| Intake acceptance | Endpoint accepts the simulated event with expected status. | Ramp cannot reliably receive the training event. |
| Event identity | Response includes an event id or receipt id. | The event cannot be audited end-to-end. |
| Route discipline | Scenario uses the configured controlled-pilot endpoint. | Training drifted away from the approved route contract. |
| Safety guard | Forbidden action fields are absent or explicitly false. | Training attempted or implied real-world execution. |
| Receipt quality | Run output includes request, response, assertions, and timestamps. | Proof cannot be reviewed later. |
| Operator gate | Scenario requires operator review for escalation. | Fail-closed posture was weakened. |

## Forbidden actions

The following must remain false or absent in every training response:

- `productionFailover`
- `production_failover`
- `paymentExecution`
- `payment_execution`
- `privateDataMovement`
- `private_data_movement`
- `walletSigning`
- `wallet_signing`
- `transactionBroadcast`
- `transaction_broadcast`
- `realDispatch`
- `real_dispatch`

## Receipt review checklist

For each generated receipt, confirm:

- `ok` is `true`.
- `failed` is `0`.
- Every scenario has `passed: true`.
- Every scenario includes a `response.status` and an event id.
- Every scenario keeps `operatorReviewRequired: true`.
- No forbidden action appears as `true`.

## Promotion rule

A passing training run does **not** promote SKYGRID to production failover. It only proves the controlled-pilot training lane is ready for operator review.
