# SKYGRID Epoch 4 — Taiwan Readiness

Status: **readiness only**. This does not authorize or trigger a production deployment.

## Target

- SKYGRID epoch: `4`
- AWS Region: Asia Pacific (Taipei)
- Region code: `ap-east-2`
- Availability Zones: 3
- Default data boundary: Taiwan Region
- Cross-border failover: disabled until explicitly approved by policy and operator review

AWS currently marks `ap-east-2` as a Region that may require account enablement. Confirm access before any deployment step.

## Readiness sequence

1. Enable and verify `ap-east-2` for the intended AWS account.
2. Confirm every required AWS service and SKU is available in Taipei; do not assume parity with other Regions.
3. Run IAM preflight using least privilege and a deployment-specific role.
4. Build or select a multi-AZ network topology; prefer in-Region redundancy before any cross-border fallback.
5. Confirm encryption, KMS/key residency, secrets handling, logging, retention, and data-residency requirements.
6. Configure independent health checks, alarms, budgets, and cost-anomaly alerts.
7. Establish latency baselines from Taiwan and from the existing SKYGRID control-plane observers.
8. Run synthetic failure tests: one-AZ impairment, dependency failure, route degradation, and rollback.
9. Capture evidence receipts without storing credentials or regulated payload data.
10. Promote only after operator approval and a passing health quorum.

## Fail-closed rules

Do not promote if any of the following is true:

- `ap-east-2` is not enabled for the account.
- A required service is unavailable in Taipei.
- Authorization or data-residency requirements are unresolved.
- Health quorum fails.
- Rollback has not been proven.
- Cross-border routing would violate workload policy.

## Version-4 guardrail

Epoch 4 remains the declared deployment generation for this readiness package. This branch is intentionally isolated from the live/default branch so Taiwan preparation can be reviewed without changing current production behavior.

## Promotion evidence

Before staging or production, attach or link:

- region/account enablement proof;
- service-availability results;
- network/AZ topology;
- external health-check receipts;
- latency measurements;
- rollback test receipt;
- budget/anomaly-alert confirmation;
- operator approval record.

The machine-readable companion is `configs/skygrid-taiwan-epoch4-readiness.json`.
