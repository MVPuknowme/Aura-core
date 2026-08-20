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

## 10-point controlled-pilot evidence score

Each dimension is worth one point. A run may claim **9/10 or better controlled-pilot evidence** only when it scores at least 9 points and also satisfies every hard gate below.

| Dimension | Pass condition | Failure meaning |
| --- | --- | --- |
| Intake acceptance | All 5 approved simulations return the expected accepted status and pass their assertions. | Ramp cannot reliably receive an approved training event. |
| Event identity | All 16 accepted and rejected events include an auditable event id. | An event cannot be traced end-to-end. |
| Route discipline | Primary, local-fallback, and safe-queue route probes select the expected lane. | Route-selection behavior drifted from the controlled-pilot contract. |
| Approval discipline | Both approval-gate scenarios fail closed with the expected policy reason. | Dual-control protection was weakened. |
| Prohibited-action rejection | All 5 prohibited-action scenarios are rejected and report no execution. | A safety boundary failed. |
| Rejection reason | All 11 fail-closed cases return the exact expected policy reason. | The system rejected ambiguously or for the wrong policy cause. |
| Safety guard | Forbidden execution fields are absent or explicitly false across accepted and rejected paths. | Training attempted or implied real-world execution. |
| Receipt quality | All 16 results include request, response, assertions, start timestamp, and measured duration. | Proof cannot be reviewed or compared later. |
| Operator gate | Operator-review/advisory-only posture remains present for escalation. | Fail-closed posture was weakened. |
| Controlled-pilot p95 latency | Same-run local-runtime p95 request duration is at or below the configured threshold; CI default is 1500 ms. | The controlled runtime regressed beyond the pilot performance budget. |

The latency dimension is a **local-runtime/CI regression metric**, not a WAN, partner, AWS-region, or field-SLA claim.

## Mandatory hard gates

A numeric score alone is insufficient. The report fails unless all of these are true:

1. **Complete curriculum:** 16/16 scenarios pass.
2. **Fail-closed safety:** all fail-closed requests are rejected as expected and no forbidden execution is reported.
3. **Minimum evidence score:** score is at least the requested threshold, normally 9.0/10.

This prevents a 9/10 score from masking a failed scenario or safety regression.

## Cost-efficiency evidence

Cost per event may be reported only when a cost can be attributed to the same measured run. Historical AWS, Vercel, or other infrastructure charges must not be automatically divided across a later test run.

When same-run cost is available:

```text
cost_per_event = same_run_infrastructure_cost / measured_events
```

Cost is reported separately and does not change the 10-point functional/safety/performance score.

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

For the quantitative report, confirm:

- `passed` is `true`.
- `score` is at least `9.0`.
- Every `hardGates` entry has `passed: true`.
- `metrics.scenariosPassed` is `16`.
- `metrics.missingEventIds` is `0`.
- Same-run cost is either attributable and explicitly supplied or left unscored.

## Promotion rule

A passing score does **not** promote SKYGRID to production failover. It proves only that the controlled-pilot lane met the repository-defined functional, safety, evidence, routing, and local-runtime performance gates for that run and is ready for operator review.
