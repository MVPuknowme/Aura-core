# SkyGrid Auto-Deployable Data Saving System

## Mission

SkyGrid is aiming to become an auto-deployable, consent-first data-saving and failover monitoring system for approved devices, endpoints, and community infrastructure.

The system watches authorized devices and service endpoints for degradation, outage signals, storage risk, battery risk, connectivity loss, and recovery needs. It then records proof, recommends a safe fallback path, and preserves user data or service continuity without exposing private content or modifying networks without approval.

## Core principle

```text
Consent first. Fail safely. Save data. Prove what happened. Recover without creating new risk.
```

## System boundary

This is not an unauthorized device-control system. It does not intercept packets, access private files, exfiltrate user data, modify router/ISP routes, sign wallet transactions, or bypass device security.

SkyGrid may monitor and act only on:

- devices explicitly opted in by an owner/controller
- endpoints explicitly configured by the operator
- public health/status URLs
- local agents installed with permission
- storage paths explicitly approved for backup
- telemetry explicitly scoped by policy

## Worlds-first target

SkyGrid's differentiator is the combination of:

1. auto-deployable monitoring
2. device consent registry
3. failover-needs detection
4. data-saving trigger logic
5. proof-grade event logs
6. route recommendation
7. optional fallback activation after policy approval
8. Airtable/GitHub/Postman/GitHub Pages reporting loop

## Device roles

```yaml
device_roles:
  observer:
    description: Reports health only. No data backup or relay.
  memory_backup_node:
    description: Saves approved folders or configured data bundles only.
  local_cache_node:
    description: Stores approved cache artifacts for recovery.
  community_failsafe_node:
    description: Supports approved failover tests or emergency continuity.
  relay_candidate:
    description: Candidate for future authorized relay tests, not active by default.
  emergency_only_node:
    description: Used only under explicit emergency policy.
  disabled:
    description: Registered but inactive.
```

## Data-saving states

```yaml
data_saving_states:
  normal:
    action: monitor only
  warning:
    action: increase health sampling and create proof event
  degraded:
    action: checkpoint approved data and recommend fallback
  failover_needed:
    action: save approved data bundle, mark fallback candidate, request/require policy approval
  recovery:
    action: verify data integrity, restore access path, write recovery log
  disabled:
    action: stop monitoring and mark device disconnected
```

## Failover-needs signals

SkyGrid should classify failover need from multiple safe signals:

```yaml
failover_signals:
  endpoint:
    - http_status_not_success
    - response_time_over_threshold
    - timeout
    - json_health_ack_false
    - html_error_instead_of_json
  device:
    - battery_below_threshold
    - storage_below_threshold
    - network_offline
    - high_packet_loss_from_authorized_probe
    - agent_heartbeat_missing
  data:
    - backup_checkpoint_stale
    - approved_data_bundle_changed
    - checksum_mismatch
    - local_cache_missing
  policy:
    - consent_expired
    - device_role_not_authorized
    - sentinel_blocked_action
```

## Event flow

```text
Device / endpoint registered
        |
        v
Consent and policy check
        |
        v
Health probe / heartbeat
        |
        v
Failover-needs classifier
        |
        v
Data-saving decision
        |
        v
Proof log
        |
        v
Airtable / GitHub artifact / Postman report / dashboard
        |
        v
Fallback recommendation or policy-approved activation
```

## Sentinel policy

```yaml
sentinel_policy:
  default_action: fail_closed
  allowed_without_extra_approval:
    - read_public_health_endpoint
    - receive_opted_in_agent_heartbeat
    - write_proof_log
    - create_backup_checkpoint_for_approved_scope
    - recommend_fallback
    - create_dashboard_report
  blocked_without_explicit_approval:
    - access_private_files
    - read_messages_or_photos
    - access_wallet_keys
    - sign_transactions
    - modify_router_settings
    - modify_isp_routes
    - intercept_packets
    - route_live_third_party_traffic
    - guarantee_payment_or_uptime
```

## Auto-deploy components

```yaml
components:
  github_actions:
    role: scheduled and manual auto-drill runner
    current_script: scripts/auto-drill.sh
  postman_newman:
    role: public endpoint and JSON health verification
  github_pages:
    role: public dashboard and proof surface
  airtable:
    role: route map, packet tests, device registry, node ledger, payout/proof status
  local_agent_future:
    role: permission-based device heartbeat and approved data checkpointing
  sentinel:
    role: policy gate and fail-closed decision layer
  aura_ai:
    role: classify events, summarize proof, and recommend operator action
```

## Minimum viable build

### Phase 1 — Endpoint-only proof

- Use `scripts/auto-drill.sh` to monitor approved URLs.
- Use Newman to verify public site and health JSON.
- Store drill artifacts in GitHub Actions.
- Publish one dashboard path.
- Log route state in Airtable.

### Phase 2 — Opt-in device registry

- Add Airtable Device Registry.
- Add website `Connect My Device` form.
- Store only consent, device class, public-safe metadata, and status.
- Do not store private data, keys, or full device identifiers unnecessarily.

### Phase 3 — Local agent heartbeat

- Build an optional local agent that reports:
  - device ID
  - battery band
  - storage band
  - connectivity status
  - backup checkpoint freshness
  - agent version
- No private file access unless explicitly scoped.

### Phase 4 — Data-saving checkpoint

- Allow approved folders or data bundles to be checkpointed.
- Store checksums and proof references.
- Do not upload private content to public dashboards.

### Phase 5 — Policy-approved failover

- Classify route health.
- Recommend fallback.
- Require policy approval before live route activation.
- Log before/after state.

## Proof event schema

```json
{
  "event_type": "failover_need_detected",
  "project": "SkyGrid",
  "device_id": "sg_device_generated_id",
  "endpoint_id": "optional_endpoint_id",
  "consent_status": "confirmed",
  "device_role": "memory_backup_node",
  "signal": "response_time_over_threshold",
  "severity": "degraded",
  "data_saving_state": "checkpoint_created",
  "fallback_recommendation": "fallback_candidate",
  "sentinel_policy": "allowed_proof_and_checkpoint_only",
  "private_data_accessed": false,
  "network_routes_modified": false,
  "proof_required": true,
  "timestamp": "ISO_8601"
}
```

## Public language

SkyGrid monitors authorized devices and endpoints for signs of failure, saves approved data before loss occurs, and creates auditable proof of what happened. It is designed for outages, congestion, recovery, and community resilience while preserving consent, privacy, and safety boundaries.

## Implementation status

```yaml
implementation_status:
  auto_drill_endpoint_monitor: active_script_exists
  newman_endpoint_checks: active_collection_exists
  github_pages_dashboard: pending_pages_source_enablement
  airtable_route_tracking: active
  device_registry: pending
  local_agent: pending
  data_checkpointing: pending
  live_failover_activation: policy_gated_future_phase
```
