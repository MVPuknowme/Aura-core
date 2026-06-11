# SKYGRID Core Mirror Loop

## Product name

**SKYGRID Emergency Data On-Ramp**

## Purpose

The Core Mirror Loop is the control ledger pattern for SKYGRID. It keeps Vercel intake, Airtable records, AWS proof/execution, and operator review aligned.

## System roles

- **B12**: public customer/provider front door.
- **Vercel**: HTTPS intake and Aura-Core decision edge.
- **Aura-Core**: AI-assisted option selector and ramp-state resolver.
- **Airtable**: control ledger for intake, customers, providers, decisions, and proof state.
- **AWS**: Lambda/S3/SNS execution and durable emergency proof infrastructure.

## Customer types

- **provider**: signs up to provide capacity, relay, compute, storage, bandwidth, or site-space.
- **utilizer**: signs up to use emergency/off-ramp continuity services.
- **both**: signs up to provide and utilize.
- **partner**: organization-level dual-mode customer/provider.

## Ramp states

- **holding**: validate, log, quote, verify, queue, store proof, or wait for operator/configuration.
- **providing**: activate provider offer, route to Lambda, send to AWS intake, or trigger partner/failover workflow.

## Decision options

- **lambda_router**: urgent outage, emergency, validation, partner routing, compute decision.
- **s3_proof_log**: audit, proof, status history, non-urgent continuity record.
- **allbridge_failover_advisory**: cross-network bridge, failover fabric, route recommendation.
- **advisory_response**: safe default, demo mode, no external execution.

## Airtable tables

### Intake Events

Fields:

- Event ID
- Timestamp
- Source
- Customer Type
- Need
- Severity
- Region
- Status
- Payload JSON
- Decision ID

Status values:

- received
- holding
- providing
- failed
- archived

### Customers

Fields:

- Customer ID
- Name
- Email
- Organization
- Customer Type
- Region
- Plan
- Verification Status
- Emergency Priority
- Linked Events

### Providers

Fields:

- Provider ID
- Name
- Email
- Region
- Capacity Type
- Capacity Status
- Verified
- Lease Status
- Payout Tier
- Linked Events

### Ramp Decisions

Fields:

- Decision ID
- Event ID
- Selected Option
- Ramp State
- Next Action
- Requires Approval
- Reason
- Confidence
- Created At

### Mirror Loop Runs

Fields:

- Loop ID
- Started At
- Completed At
- Input Source
- Records Checked
- Records Mirrored
- Errors
- Loop Status

Loop Status values:

- queued
- running
- complete
- failed

### Proof Logs

Fields:

- Proof ID
- Event ID
- Timestamp
- Hash
- S3 Key
- Airtable Record
- Route
- Audit Status
- Notes

## Runtime behavior

1. Receive intake at `/api/skygrid/intake`.
2. Parse and normalize payload.
3. Aura-Core selects an option.
4. Ramp resolver assigns `holding` or `providing`.
5. If Airtable env vars are configured, write intake and decision records.
6. If AWS env vars are configured, forward eligible providing events to Lambda/AWS intake.
7. Return an accepted response even when Airtable or AWS is not configured.

## Missing dependency rule

If Airtable env vars are missing:

```json
{
  "accepted": true,
  "airtable": {
    "synced": false,
    "reason": "Airtable env not configured"
  }
}
```

If AWS env vars are missing:

```json
{
  "accepted": true,
  "aws": {
    "proxied": false,
    "reason": "AWS bridge env not fully configured"
  }
}
```

## Vercel environment variables

```text
AIRTABLE_TOKEN
AIRTABLE_BASE_ID
AIRTABLE_INTAKE_TABLE=Intake Events
AIRTABLE_DECISIONS_TABLE=Ramp Decisions
AIRTABLE_MIRROR_TABLE=Mirror Loop Runs
AIRTABLE_PROOF_TABLE=Proof Logs
SKYGRID_PROVIDER_MODE=enabled
SKYGRID_AUTO_PROPAGATE=true
SKYGRID_LAMBDA_ROUTER_URL
SKYGRID_AWS_INTAKE_URL
SKYGRID_AWS_STATUS_URL
SKYGRID_S3_BUCKET
SKYGRID_EMERGENCY_CALL_ID
SKYGRID_PARTNERSHIP_CODE
```

## Local PowerShell flow

```powershell
cd E:\SKYGRID\AutoDrill
git pull
npx vercel@latest deploy --prod --force
./scripts/test-skygrid-intake.ps1 -Base "https://YOUR-PRODUCTION-DOMAIN"
```
