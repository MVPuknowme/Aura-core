# SkyGrid Production Failover Training

## Purpose

This document sets up production failover training for SkyGrid / Aura-Core without activating live production switching.

The training lane verifies runtime health, Highway API status, Postman validation, AWS health mirror readiness, and operator approval before any production failover decision is considered.

## Current lane posture

- Primary training lane: aura-core-yvov
- Degraded training lanes: aura-core, aura-core-t2t5
- Runtime posture: advisory preflight
- Sentinel posture: fail-closed

## Training objectives

1. Confirm the primary runtime responds on public health routes.
2. Confirm Highway API exposes the four-lane bridge map.
3. Confirm Postman/Newman can validate the route checklist.
4. Confirm AWS mirror health route is reachable before fallback use.
5. Confirm degraded Vercel lanes are logged as drill targets only.
6. Confirm no production switch occurs without human/operator approval.
7. Confirm public language remains advisory and does not overclaim uptime or guaranteed outcomes.

## Required route checks

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

## Training drill sequence

### Drill 1: Primary healthy

Expected result: primary runtime returns HTTP 200 on required routes.

Action:
- Run Postman/Newman route checklist.
- Save output as proof.
- Keep Sentinel status as monitor-only.

### Drill 2: Secondary degraded

Expected result: failed Vercel lanes are marked degraded and not used for public claims.

Action:
- Record failed lane names.
- Confirm primary lane remains selected.
- Do not switch user traffic.

### Drill 3: AWS mirror check

Expected result: AWS health mirror responds before fallback is considered.

Action:
- Probe AWS health URL.
- If AWS is unavailable, keep fallback blocked.

### Drill 4: Web3/Base quote posture

Expected result: quote route returns advisory quote only.

Action:
- Query /api/pay/quote?amount=25.
- Confirm no execution flag is true.

### Drill 5: Production readiness gate

Expected result: production failover remains blocked until all gates pass.

Gates:
- Primary health passes.
- Postman/Newman passes.
- AWS mirror passes.
- Operator approval recorded.
- Sentinel review passes.
- Rollback route is documented.

## Sentinel rule

```yaml
sentinel:
  default: fail_closed
  production_failover_training: enabled
  production_switching: blocked_until_all_gates_pass
  allowed_actions:
    - health_probe
    - route_probe
    - postman_validation
    - proof_log
    - advisory_dashboard_update
  blocked_actions:
    - automatic_user_traffic_switch
    - unattended_production_cutover
    - payment_execution
    - private_data_transfer
```

## Production launch language

Use:
- advisory failover training
- production readiness drill
- proof-first route validation
- controlled pilot

Avoid:
- guaranteed uptime
- certified emergency replacement
- automatic live takeover
- guaranteed revenue

## Operator checklist

```bash
BASE="https://PASTE-SUCCESSFUL-VERCEL-DOMAIN.vercel.app"

curl -sS -o /dev/null -w "%{http_code} /health.json\n" "$BASE/health.json"
curl -sS -o /dev/null -w "%{http_code} /highway\n" "$BASE/highway"
curl -sS -o /dev/null -w "%{http_code} /api/highway/status\n" "$BASE/api/highway/status"
curl -sS -o /dev/null -w "%{http_code} /api/pay/quote\n" "$BASE/api/pay/quote?amount=25"
curl -sS -o /dev/null -w "%{http_code} /api/stripe/device-link\n" "$BASE/api/stripe/device-link"
```

Pass condition: all required public routes return expected safe responses, and production switching remains blocked until operator approval and Sentinel review are complete.
