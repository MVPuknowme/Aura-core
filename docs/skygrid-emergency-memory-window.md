# SkyGrid Emergency Memory Window

## Purpose

SkyGrid Emergency Memory Window is a consent-first preservation framework for opted-in devices during verified local emergency or power-loss risk events.

The goal is to help protect approved device state, memory records, game saves, home server data, project files, and node status before a likely outage or shutdown window.

This framework is not a responder backdoor, money-transfer system, or unrestricted device access layer.

## Core principle

```text
Warn early. Save approved data. Protect people. Preserve memories. Log proof. Fail closed.
```

## Service summary

When a verified incident or local power-risk signal affects a participant's zone, SkyGrid can open a short Emergency Memory Window for opted-in devices. During that window, SkyGrid may notify the participant, request approved checkpoint actions, record device status, and create proof logs.

Any action involving private data, account credentials, financial assets, game credits, crypto wallets, or other value-bearing assets requires explicit participant authorization and must remain user-controlled.

## Emergency triggers

```yaml
triggers:
  simulated_pilot_event:
    status: allowed_for_testing
  participant_reported_power_risk:
    status: allowed
  verified_local_incident_reference:
    status: planned_integration
  utility_power_loss_notice:
    status: planned_integration
  responder_console_preservation_request:
    status: planned_policy_gated_integration
```

## Device classes

```yaml
device_classes:
  game_console:
    examples:
      - Xbox
      - PlayStation
      - Nintendo Switch
    safe_actions:
      - notify_owner
      - record_device_status
      - request_cloud_save_sync_if_supported
      - log recovery checklist

  home_computer:
    examples:
      - desktop
      - laptop
      - workstation
    safe_actions:
      - notify_owner
      - checkpoint approved folders
      - capture non-sensitive state metadata
      - log last heartbeat

  home_server:
    examples:
      - NAS
      - media server
      - local web server
      - validator host
    safe_actions:
      - notify_owner
      - checkpoint approved volumes
      - capture service status
      - request graceful shutdown
      - log proof event

  node_or_compute_device:
    examples:
      - validator node
      - mining rig
      - edge compute node
    safe_actions:
      - capture node status
      - checkpoint logs
      - preserve config references
      - request graceful shutdown
```

## Asset safety policy

SkyGrid must separate data preservation from value transfer.

```yaml
asset_safety_policy:
  default_mode: metadata_only
  allowed_without_extra_authorization:
    - public status metadata
    - last backup time
    - approved device state
    - approved folder checkpoint
    - public receive address only if participant configured it

  requires_explicit_participant_authorization:
    - crypto wallet transfer
    - game credit transfer
    - account balance movement
    - marketplace asset movement
    - bank or payment action

  always_blocked:
    - private key extraction
    - seed phrase access
    - credential scraping
    - automatic fund movement without user-controlled authorization
    - bypassing console or platform security
    - unrestricted responder access to devices
```

## Emergency Memory Window states

```yaml
states:
  idle:
    action: monitor opted-in heartbeat only
  warning:
    action: notify participant and raise checkpoint priority
  preservation_requested:
    action: ask participant yes/no or apply preconfigured safe policy
  checkpointing:
    action: save approved scope only
  proof_logged:
    action: write event receipt and dashboard status
  expired:
    action: close window and deny further actions by default
  denied:
    action: record denial and stop
```

## Yes / No logic

```yaml
yes:
  result: run_approved_preservation_actions
  maximum_window_minutes: 15
  proof_event: emergency_memory_window_approved

no:
  result: deny_preservation_request
  proof_event: emergency_memory_window_denied

no_response:
  result: deny_by_default_unless_preconfigured_safe_policy_exists
  proof_event: emergency_memory_window_no_response
```

## Minimum viable pilot

```yaml
pilot_v1:
  trigger: simulated emergency or power-risk event
  devices: opted-in test records only
  actions:
    - create emergency memory window event
    - notify participant
    - receive yes/no decision
    - checkpoint approved metadata or folder scope
    - emit proof log
    - show after-action receipt
  disabled_in_v1:
    - live responder integration
    - automatic crypto transfer
    - account movement
    - private-key access
    - platform bypass
```

## System flow

```text
incident or power-risk signal
        |
        v
zone / participant match
        |
        v
consent and policy check
        |
        v
Emergency Memory Window opens
        |
        v
participant yes/no or safe preconfigured policy
        |
        v
approved checkpoint action
        |
        v
proof event and receipt
        |
        v
window expires
```

## Required tables or registry fields

```yaml
device_registry_fields:
  - Device ID
  - Participant / Owner
  - Consent Confirmed
  - Device Class
  - Emergency Memory Window Enabled
  - Preconfigured Safe Policy
  - Approved Backup Scope
  - Asset Action Allowed
  - Asset Action Mode
  - Last Heartbeat
  - Last Checkpoint
  - Emergency Contact
  - Sentinel Decision
  - Proof Log Ref
```

## Public website positioning

SkyGrid Emergency Memory Window helps opted-in households and organizations preserve important device state before outages or emergency power-down events. It can notify owners, request approved checkpoints, preserve configured data, and create proof logs. Financial assets and credentials remain user-controlled and are never moved automatically.

## Implementation status

```yaml
implementation_status:
  framework: documented
  protobuf_extension: pending
  device_registry_fields: pending
  simulated_event_form: pending
  b12_service_copy: ready
  live_responder_integration: future_local_policy_phase
```
