# SKYGRID Auto-Drill Evaluation Rubric

Product: **SKYGRID Emergency Data On-Ramp**  
Mode: `controlled_pilot`  
Sentinel: `fail_closed`

This rubric scores simulated emergency, outage, responder, system-health, continuity, and fail-closed safety events without enabling production failover or any real-world action.

## Curriculum target

The controlled-pilot curriculum contains:

- 5 accepted-path scenarios.
- 11 fail-closed rejection scenarios.
- 16 total scenarios on both Ubuntu and Windows CI runners.

The combined training target is **16/16**.

## Accepted-path pass gates

An accepted-path scenario passes only when:

1. The ramp returns an accepted status listed by the scenario, normally `202`.
2. The response includes an event identifier (`eventId`, `event_id`, `id`, or a receipt event id).
3. The request and response remain marked as simulated/training-only.
4. No response field indicates production failover, payment execution, wallet signing, transaction broadcast, real dispatch, or private-data movement.
5. A JSON receipt is written under the selected training receipt directory.
6. Operator review remains required before any next gate.

## Fail-closed pass gates

A fail-closed scenario passes only when:

1. SKYGRID rejects the request with the exact expected status (`400` or `403`).
2. `accepted` is `false` and `event.decision.ok` is `false`.
3. The decision returns the exact expected policy reason.
4. The decision retains `mode=controlled_pilot` and `sentinel=fail_closed`.
5. The response remains `advisoryOnly=true` and echoes `training=true`.
6. An event identifier is still produced so the rejection is auditable.
7. No response field indicates that a prohibited action actually executed.

## Score dimensions

| Dimension | Pass condition | Failure meaning |
| --- | --- | --- |
| Intake acceptance | Approved simulations return the expected accepted status. | Ramp cannot reliably receive an approved training event. |
| Event identity | Accepted and rejected events include an auditable event id. | The event cannot be traced end-to-end. |
| Route discipline | Requests use the configured controlled-pilot endpoint and route policy. | Training drifted away from the approved route contract. |
| Approval discipline | Emergency routes fail closed unless both required approvals are present. | Dual-control protection was weakened. |
| Prohibited-action rejection | Signing, broadcasting, payment, production failover, and private-data requests are rejected. | A safety boundary failed. |
| Rejection reason | Every fail-closed case returns the expected policy reason. | The system rejected ambiguously or for the wrong policy cause. |
| Safety guard | Forbidden execution fields are absent or explicitly false. | Training attempted or implied real-world execution. |
| Receipt quality | Run output includes request, response, assertions, and timestamps. | Proof cannot be reviewed later. |
| Operator gate | Operator review remains required for escalation. | Fail-closed posture was weakened. |

## Forbidden execution fields

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
- `executeFailover`
- `execute_failover`

The fail-closed pack may submit fields ending in `_requested` to prove that policy rejects the request. A requested action is not evidence of execution; the response must prove rejection and must not report the corresponding execution field as `true`.

## Receipt review checklist

For the accepted-path receipt, confirm:

- `ok` is `true`.
- `failed` is `0`.
- All 5 scenarios have `passed: true`.
- Every scenario includes a response status and event id.
- No forbidden execution action appears as `true`.

For the fail-closed receipt, confirm:

- `ok` is `true`.
- `allRequestsRejected` is `true`.
- `sentinel` is `fail_closed`.
- `failed` is `0`.
- All 11 scenarios have `passed: true`.
- Actual status and rejection reason match each scenario's expected values.
- `noExecutionPassed` is `true` for every scenario.

## Promotion rule

A passing training run does **not** promote SKYGRID to production failover. It only proves that the controlled-pilot training lane accepts approved simulations, rejects unsafe requests, and is ready for operator review.
