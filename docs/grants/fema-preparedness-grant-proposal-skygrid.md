# FEMA Preparedness Grant Proposal Draft - SkyGrid Emergency Memory Window

## Working title

SkyGrid Emergency Memory Window: Opt-In Digital Continuity, Device Preservation, and Community Failover Preparedness Pilot

## Applicant strategy

SkyGrid / Aura-Core should not be positioned as the sole direct FEMA applicant unless a specific FEMA program allows that applicant type. The strongest structure is:

```yaml
primary_applicant:
  - city or county emergency management office
  - fire district
  - tribal government
  - public safety agency
  - state administrative agency or eligible pass-through partner

skygrid_role:
  - technology partner
  - pilot vendor
  - implementation partner
  - subrecipient only if the funding program permits
```

## Executive summary

The applicant seeks FEMA preparedness or mitigation grant funding to pilot SkyGrid Emergency Memory Window, a consent-first emergency continuity framework that helps opted-in households, small businesses, responder-adjacent facilities, and community infrastructure hosts preserve approved device state before or during outage-risk, fire-risk, evacuation, or emergency power-down windows.

The pilot will register opted-in devices, define approved preservation scopes, simulate local emergency preservation windows, send owner alerts, capture device heartbeat/status, checkpoint approved data or metadata, and generate after-action proof receipts for recovery and evaluation.

SkyGrid does not provide unrestricted access to personal devices. It does not move funds automatically, extract private keys, access seed phrases, bypass device security, or guarantee emergency outcomes. The project operates under participant consent, local policy review, minimum-necessary data principles, Sentinel fail-closed controls, and proof logging.

## Problem statement

Fire, wildfire, power shutoff, evacuation, and infrastructure disruption events can create short windows where homes, small businesses, and local infrastructure hosts may lose power or connectivity before critical digital records and device states are preserved. Devices may include computers, game consoles, home servers, NAS systems, local nodes, and backup infrastructure.

Local emergency systems increasingly need tools that improve preparedness without creating new privacy, cybersecurity, or operational risks. SkyGrid addresses a narrow practical gap: how to notify opted-in participants, preserve approved device state, and provide recovery proof during local disruption windows while leaving ownership and control with the participant.

## Proposed solution

SkyGrid Emergency Memory Window provides a pilot framework with five core functions:

```yaml
core_functions:
  alert_and_request:
    description: Notify opted-in participants when a preservation window is triggered by a simulated or verified local risk event.
  device_status:
    description: Record device class, last heartbeat, connectivity status, battery band, and backup status.
  approved_checkpoint:
    description: Save only participant-approved folders, records, metadata, or device-state references.
  proof_logging:
    description: Record request, approval, denial, checkpoint, expiration, and receipt events.
  recovery_reporting:
    description: Provide participant and agency-facing summaries for after-action review.
```

## Pilot scope

```yaml
pilot_scope:
  duration: 12 months
  households: 25-100 opted-in participants
  small_businesses_or_community_sites: 5-10
  device_count: 50-250
  drill_events: 4-8 simulated local emergency memory windows
  live_response_integration: future phase only after local policy approval
```

## Eligible-program positioning

The project may fit best under a local government, emergency management, fire district, or tribal application where the grant objective includes preparedness, resilience, community continuity, alerting, emergency technology, critical infrastructure protection, or responder/public safety support.

Potential alignment categories:

```yaml
alignment:
  preparedness:
    - emergency planning
    - public education and outreach
    - continuity support
    - technology-enabled preparedness exercises
  mitigation_resilience:
    - outage readiness
    - continuity during wildfire or power-risk events
    - community resilience hub support
  fire_service_support:
    - responder-adjacent technology
    - fire-risk readiness
    - local evacuation and recovery support
```

## Scope of work

### Phase 1 - Planning and policy alignment

```yaml
timeline: months 1-2
tasks:
  - select eligible public-sector lead applicant
  - define local use cases and pilot geography
  - review privacy, public records, consent, and cybersecurity requirements
  - define participant-approved data scopes
  - finalize no-access and no-transfer boundaries
```

### Phase 2 - Device Registry and onboarding

```yaml
timeline: months 2-4
tasks:
  - create opt-in Device Registry
  - onboard pilot participants
  - classify device types
  - configure approved preservation scope
  - set emergency memory window preference
  - create participant education material
```

### Phase 3 - Emergency Memory Window drills

```yaml
timeline: months 4-9
tasks:
  - run simulated fire-risk and outage-risk scenarios
  - send yes/no preservation prompts
  - capture heartbeat and status events
  - run approved checkpoint actions
  - create proof receipts
  - review results with local partners
```

### Phase 4 - Evaluation and reporting

```yaml
timeline: months 9-12
tasks:
  - measure alert delivery and response rates
  - measure checkpoint completion
  - measure proof log completeness
  - evaluate participant satisfaction
  - produce final grant report and expansion plan
```

## Deliverables

```yaml
deliverables:
  - local policy and consent framework
  - pilot Device Registry
  - Emergency Memory Window intake form
  - participant education packet
  - simulated responder/power-risk workflow
  - proof log dashboard
  - drill reports
  - after-action report
  - replication guide for other jurisdictions
```

## Metrics

```yaml
metrics:
  participants_onboarded: 25-100
  devices_registered: 50-250
  drill_events_completed: 4-8
  participant_prompt_delivery_rate: target_90_percent_or_higher
  yes_no_decision_capture_rate: tracked
  approved_checkpoint_success_rate: tracked
  proof_receipt_generation_rate: target_100_percent
  unauthorized_data_access_events: target_zero
  private_key_or_credential_access: not_allowed
```

## Budget framework

Recommended 12-month pilot request: $475,000.

```yaml
budget:
  project_management_and_local_policy_alignment: 55000
  device_registry_and_consent_workflow: 65000
  emergency_memory_window_platform_configuration: 95000
  proof_logging_and_dashboard: 50000
  participant_outreach_and_training: 45000
  pilot_drills_and_after_action_evaluation: 60000
  privacy_security_and_compliance_review: 55000
  technical_integration_and_reporting: 50000
```

## Compliance and guardrails

```yaml
compliance:
  consent_required: true
  default_action: deny_or_fail_closed
  minimum_necessary_data: true
  time_limited_windows: true
  after_action_receipts: true
  no_private_key_access: true
  no_seed_phrase_access: true
  no_automatic_fund_movement: true
  no_device_security_bypass: true
  no_unrestricted_responder_access: true
```

## Procurement posture

The public-sector applicant should procure SkyGrid as a pilot technology partner only after confirming local procurement rules, grant allowability, match requirements, cybersecurity requirements, and records retention requirements.

## Local partner targets

```yaml
partner_targets:
  - county emergency management office
  - fire protection district
  - city resilience office
  - tribal emergency management office
  - public library or community resilience hub
  - rural broadband or utility coordination partner
```

## Immediate next steps

1. Upload the FEMA Preparedness Grants Manual PDF into ChatGPT for exact language extraction.
2. Identify the target FEMA program and eligible applicant.
3. Select one Oregon or Washington pilot jurisdiction.
4. Create a one-page letter of interest for the public-sector lead.
5. Convert this draft into the required grant narrative format.
6. Prepare budget justification and capability statement.

## Manual review checklist

When the PDF is available, extract and verify:

```yaml
manual_items_to_extract:
  - eligible applicants
  - eligible activities
  - unallowable costs
  - cost share or match
  - performance period
  - application submission method
  - environmental or historic preservation requirements
  - procurement standards
  - reporting requirements
  - cybersecurity or privacy clauses
  - equipment and technology allowability
```
