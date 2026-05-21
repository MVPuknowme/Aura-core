# SkyGrid Post-Onboarding Resource Activation

## Purpose

After a partner completes SkyGrid onboarding, the system should recommend and prepare the best resource lane for the onboarder. The lane may support processor power, performance, storage, failover, solar-backed systems, network gas budgeting, token-space leasing, or platform resource discovery.

This is a proof-gated automation design. SkyGrid may automatically score, recommend, reserve, draft, queue, and prepare actions. SkyGrid must not execute spend, token leases, production infrastructure changes, wallet actions, or client-facing activation until the SkyGrid Preflight Protection Lane has the required approval.

## Core Flow

1. Onboarder submits intake.
2. Flask/Postman onboarding gateway validates intake.
3. Airtable record is created or updated.
4. DynamoDB preflight record is created.
5. Auto Drill evaluates available resource lanes.
6. Resource selector recommends best lane and alternates.
7. System prepares a resource activation draft.
8. Human approval gate reviews proof, cost, risk, and intended resource.
9. Approved action can be executed by an authorized deploy/payment/provisioning system.
10. Evidence is written back to Airtable, DynamoDB, Linear, and proof packet.

## Resource Activation Types

- compute_contribution
- compute_request
- storage_contribution
- storage_request
- network_failover
- solar_backed_node
- gas_fee_budget
- token_space_lease
- platform_resource_discovery
- edge_performance_lane
- warehouse_server_lane

## Example: New Solar System

A new solar-backed partner completes onboarding. SkyGrid Auto Drill evaluates:

- solar_backup availability
- device_compute capacity
- local_wifi reliability
- lora backup potential
- cloudflare edge support
- aws_lambda fallback support
- base / usdc / x402 budget lane readiness
- proof packet completeness
- region fit
- expected uptime

Output may recommend:

```json
{
  "activationType": "solar_backed_node",
  "recommendedResourceLane": "solar_backup",
  "secondaryLane": "device_compute",
  "budgetLane": "gas_fee_budget",
  "leaseModel": "token_space_lease",
  "allowedToExecute": false,
  "humanApprovalRequired": true,
  "proofRequired": true,
  "nextAction": "Prepare token-space lease draft and gas budget estimate for approval."
}
```

## Automation States

- intake_received
- preflight_created
- resource_scoring
- resource_recommended
- draft_prepared
- awaiting_approval
- approved_for_execution
- execution_queued
- active
- blocked
- closed

## Financial / Lease Model Fields

These fields are planning and recordkeeping fields unless an approved execution system is explicitly attached.

- leaseModel
- tokenSpaceLeaseRef
- gasBudgetEstimate
- gasBudgetCurrency
- maxApprovedSpend
- paymentRailPreference
- rateBand
- proofRequired
- humanApprovalRequired
- allowedToExecute
- approvalTimestamp
- executionEvidenceUrl

## Allowed Auto Actions Before Approval

SkyGrid may automatically:

- score lanes
- recommend best lane
- produce alternates
- classify risk
- estimate gas or lease budget
- draft a resource lease plan
- queue an approval request
- write proof records
- update Airtable/Linear/DynamoDB status

## Blocked Auto Actions Before Approval

SkyGrid must not automatically:

- spend funds
- transfer tokens
- sign wallet transactions
- activate a paid lease
- deploy production infrastructure
- represent technical readiness as legal/financial approval
- move onboarder to active_node without proof gate

## Execution Gate

A resource activation may execute only when:

```text
FinalReadinessState == Approved
HumanApprovalRequired == false OR approvalTimestamp is present
ProofRequired == false OR proof record is attached
allowedToExecute == true
riskLevel is not Critical
```

## Recommended API Output

```json
{
  "ok": true,
  "onboarderId": "onboarder_123",
  "preflightId": "preflight_456",
  "activationType": "solar_backed_node",
  "recommendedResourceLane": "solar_backup",
  "secondaryLane": "device_compute",
  "budgetLane": "gas_fee_budget",
  "leaseModel": "token_space_lease",
  "score": 88,
  "band": "strong",
  "riskLevel": "Medium",
  "proofRequired": true,
  "humanApprovalRequired": true,
  "allowedToExecute": false,
  "nextAction": "Prepare approval packet for token-space lease and gas budget."
}
```

## Integration Points

- B12 node onboarding page
- Flask onboarding gateway
- Postman onboarding collection
- Airtable SkyGrid Web3 Onboarders table
- DynamoDB preflight record table
- Auto Drill Resource Selector
- S3 proof document lane
- Linear task/proof review
- Vercel dashboard status display

## Implementation Requirement

Add a post-onboarding endpoint such as:

```text
POST /api/onboarding/resource-activation-draft
```

This endpoint should:

1. Accept onboarder ID and requested activation type.
2. Pull or receive candidate resource lanes.
3. Score candidates using Auto Drill.
4. Return recommended lane, lease model, gas budget estimate, and proof requirements.
5. Write a draft status to the proof trail.
6. Keep `allowedToExecute=false` until approval exists.

## Summary

SkyGrid can make onboarding feel automatic by doing the heavy work instantly: scoring, matching, drafting, estimating, and queuing. Execution remains approval-gated so the system can scale safely into solar systems, warehouse servers, token-space leases, and network gas budgeting.