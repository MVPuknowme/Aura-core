# SkyGrid / Aura-Core AI Resource Training Loop

## Purpose

Use all connected AI/workflow resources as a coordinated training loop for SkyGrid production failover readiness without activating live production switching.

This document binds the training loop across GitHub, Linear, Airtable, Postman/Newman, Vercel, AWS health mirrors, and Web3/Base advisory routes.

## Core posture

- Mode: training only
- Runtime: advisory preflight
- Sentinel: fail-closed
- Primary lane: aura-core-yvov
- Watch lanes: aura-core, aura-core-t2t5
- Live cutover: blocked until explicit approval and proof gates pass

## Resource roles

### GitHub

Source of truth for:
- Runtime code
- Failover training plans
- Highway API docs
- Config files
- Commit proof
- CI / Vercel status signals

### Linear

Execution tracker for:
- Training tasks
- Risks and blockers
- Gate status
- Production-readiness sequencing
- Agent/Codex prompts

### Airtable

Operations dashboard for:
- Route status
- Training milestones
- Lane health
- Proof references
- Operator-facing status summaries

### Postman / Newman

Validation layer for:
- Public route checks
- JSON response checks
- Advisory language checks
- Proof packet generation

### Vercel

Runtime lane for:
- Public route serving
- Health endpoint
- Highway API page and JSON routes
- Quote/status/advisory endpoints

### AWS

Fallback mirror for:
- Lambda URL health route
- Route 66 backup lane
- Production-failover training verification

### Web3 / Base

Advisory status lane for:
- Base rate posture
- Quote-only Sun-Pay checks
- Bridge-readiness status
- No execution without approval

## Training loop

1. GitHub stores and versions the training plan.
2. Vercel deploys the public runtime.
3. Postman/Newman probes required routes.
4. AWS mirror health is checked as fallback readiness.
5. Web3/Base quote route is checked for advisory response only.
6. Airtable records operator-facing status.
7. Linear tracks next action, blockers, and completion gates.
8. Sentinel stays fail-closed until all gates pass.

## Required proof gates

- GitHub commit exists.
- Vercel primary lane succeeds.
- Required public routes return expected safe responses.
- Postman/Newman route validation passes.
- AWS fallback health route responds.
- Advisory language is present.
- No live payment, device activation, or traffic switching occurs.
- Operator approval is recorded before any production cutover.

## Required routes

```text
/
/health.json
/highway
/api/highway/status
/api/highway/flasks
/api/highway/postman
/dispatch
/scenarios
/rates
/base
/pay
/api/pay/quote?amount=25
/api/stripe/device-link
```

## Safe training command

```bash
BASE="https://YOUR-SUCCESSFUL-VERCEL-DOMAIN.vercel.app"

for path in \
  "/" \
  "/health.json" \
  "/highway" \
  "/api/highway/status" \
  "/api/highway/flasks" \
  "/api/highway/postman" \
  "/dispatch" \
  "/scenarios" \
  "/rates" \
  "/base" \
  "/pay" \
  "/api/pay/quote?amount=25" \
  "/api/stripe/device-link"
do
  echo "== $path =="
  curl -sS -o /dev/null -w "%{http_code} %{time_total}s\n" "$BASE$path"
done
```

## Sentinel rule

```yaml
sentinel:
  default: fail_closed
  training_allowed:
    - health_probe
    - route_probe
    - proof_log
    - advisory_dashboard_update
  blocked_without_approval:
    - automatic_cutover
    - live_traffic_switch
    - payment_execution
    - private_data_transfer
    - device_activation
```

## Launch language

Use:
- advisory production-readiness training
- controlled pilot
- proof-first failover validation
- Route 66 fallback readiness

Avoid:
- guaranteed uptime
- certified emergency replacement
- automatic takeover
- guaranteed revenue
