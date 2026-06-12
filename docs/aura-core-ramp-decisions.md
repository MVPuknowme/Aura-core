# Aura-Core AI Ramp Decision Contract

## Purpose

Aura-Core AI is the advisory control layer for SKYGRID Emergency Data On-Ramp decisions.

It evaluates whether a ramp, bridge, node, proof lane, or intake path should be preferred, held, degraded, or blocked. It does not perform unauthorized dispatch, carrier switching, OS-level network switching, wallet signing, private data movement, or emergency-service control.

## Product language

Use this exact product/system name:

**SKYGRID Emergency Data On-Ramp**

Do not rename SKYGRID as serverless. Serverless may be an implementation detail, but the product language remains SKYGRID Emergency Data On-Ramp.

## Decision role

Aura-Core AI attaches to ramp decisions as:

```yaml
control_layer: Aura-Core AI
decision_scope: advisory_ramp_decisioning
runtime: vercel-aura-core
production_base_url: https://skygrid-protocol.net
primary_intake_route: POST /api/skygrid/intake
status_routes:
  - GET /health.json
  - GET /api/skygrid/status
  - GET /api/highway/status
mode: controlled_pilot
sentinel_default: fail_closed
operator_confirmation_required: true
```

## Ramp decision inputs

Aura-Core AI may evaluate:

- route health
- bridge direction
- latency
- cache state
- proof/audit availability
- operator intent
- PNPK policy approval
- x402 or payment metadata when present
- Allbridge fabric status
- Auto-Drill space availability
- leasee device-owner quorum
- public-only proof lane constraints
- emergency/operator approval state

## Ramp decision outputs

Aura-Core AI should return one of these advisory actions:

```yaml
allowed_actions:
  - prefer_ramp
  - hold_ramp
  - degrade_ramp
  - block_ramp
  - request_operator_confirmation
  - require_more_proof
  - fail_closed
```

No other action should be treated as production authorization.

## Required guardrails

Aura-Core AI must fail closed when any required trust condition is missing.

```yaml
guardrails:
  dispatch_claim: false
  os_level_switching: false
  carrier_switching_without_permission: false
  private_data_movement_without_policy: false
  wallet_signing: false
  payment_execution: false
  emergency_service_control: false
  bypass_authentication: false
  bypass_payment_controls: false
  operator_confirmation_required: true
```

## Decision scoring model

Each ramp candidate can be scored independently.

```text
ramp_score =
  policy_weight
+ route_health_weight
+ latency_weight
+ proof_weight
+ cache_weight
+ bridge_health_weight
+ operator_intent_weight
- error_penalty
- timeout_penalty
- missing_approval_penalty
- private_data_risk_penalty
```

Recommended normalized shape:

```json
{
  "ramp_id": "skygrid-production-intake",
  "base_url": "https://skygrid-protocol.net",
  "route": "/api/skygrid/intake",
  "bridge_fabric": "Allbridge",
  "direction": "source_to_target",
  "mode": "controlled_pilot",
  "policy_approved": true,
  "operator_confirmation_required": true,
  "operator_confirmation_present": false,
  "route_health": "ok",
  "latency_ms": null,
  "cache_status": "unknown",
  "proof_available": true,
  "ramp_score": 0,
  "recommendation": "request_operator_confirmation"
}
```

## Audit event schema

Every ramp decision should be audit-ready.

```json
{
  "event_type": "aura_core_ramp_decision",
  "system": "SKYGRID Emergency Data On-Ramp",
  "control_layer": "Aura-Core AI",
  "base_url": "https://skygrid-protocol.net",
  "route": "/api/skygrid/intake",
  "runtime": "vercel-aura-core",
  "decision_id": "uuid",
  "request_id": "uuid",
  "ramp_id": "string",
  "decision": "prefer_ramp|hold_ramp|degrade_ramp|block_ramp|request_operator_confirmation|require_more_proof|fail_closed",
  "reason": "string",
  "inputs_checked": [
    "policy",
    "route_health",
    "bridge_status",
    "proof_state",
    "operator_intent"
  ],
  "operator_confirmation_required": true,
  "operator_confirmation_present": false,
  "safety": {
    "dispatch_claim": false,
    "os_level_switching": false,
    "payment_execution": false,
    "private_data_movement": false
  },
  "timestamp": "ISO-8601"
}
```

## Postman / Q / Copilot instruction

When testing or modifying SKYGRID routes, treat Aura-Core AI as the advisory decision layer for ramps.

Use this base URL:

```text
https://skygrid-protocol.net
```

Use this primary intake route:

```text
POST /api/skygrid/intake
```

A valid ramp-decision response should identify:

- SKYGRID Emergency Data On-Ramp
- Aura-Core AI
- ramp decision mode
- advisory or fail-closed action
- operator confirmation requirement
- audit-ready fields

## Public summary

Aura-Core AI helps SKYGRID decide which ramp is safest to use. It scores route health, bridge state, policy approval, proof availability, and operator intent, then returns an advisory recommendation. If trust conditions are incomplete, Aura-Core AI fails closed.
