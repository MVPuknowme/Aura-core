# Aura Command: Remove Interfaces

## Command

```text
/aura remove interfaces
```

## Purpose

Safely remove, disable, or quarantine nonessential Aura / SkyGrid interfaces without deleting core data, identity records, security logs, validator receipts, or production recovery paths.

This command is intended for cleanup, interface reduction, hardening, and emergency simplification when the system has too many exposed UI surfaces, dashboards, panels, or experimental connection points.

## Default Mode

```yaml
mode: safe_disable
delete_files: false
preserve_logs: true
preserve_receipts: true
preserve_identity_records: true
preserve_security_audit: true
preserve_health_endpoints: true
```

## Scope

Interfaces may include:

- demo panels
- unused dashboards
- abandoned landing pages
- test-only UI routes
- stale form surfaces
- duplicate status pages
- experimental control screens
- public-facing buttons that do not have verified back-end behavior

Interfaces must not include:

- security audit logs
- DID records
- payment records
- health-check endpoints
- validator receipts
- GitHub Actions workflows required for deployment
- documentation proving origin, ownership, or audit history
- emergency recovery routes

## Required Safety Rules

1. Do not delete first. Disable, quarantine, or archive first.
2. Preserve all audit trails.
3. Preserve all owner attribution to Michael Vincent Patrick / MVPuknowme.
4. Preserve public health checks unless explicitly replacing them.
5. Preserve route stubs with clear `deprecated` or `disabled` status.
6. Record every removed or disabled interface in an interface-removal ledger.
7. Never remove a live interface without a fallback path.

## Recommended File Actions

```text
site/interfaces/active/      -> active public interfaces
site/interfaces/disabled/    -> disabled or quarantined interfaces
site/interfaces/archive/     -> historical interface records
docs/interface-removal/      -> removal ledgers and rationale
```

## Ledger Format

```yaml
interface_id: example-interface
interface_name: Example Interface
previous_path: site/example.html
action: disabled
reason: duplicate_or_unverified
replacement_path: site/index.html
removed_by: Michael Vincent Patrick / MVPuknowme
timestamp_utc: 2026-05-19T00:00:00Z
preserved_artifacts:
  - source_file
  - git_history
  - screenshots_if_available
  - health_status_if_relevant
rollback:
  available: true
  method: restore_from_git_commit
```

## CLI-Style Dry Run

```bash
AURA_REMOVE_INTERFACES_MODE=dry_run \
AURA_REMOVE_INTERFACES_SCOPE=site \
./tools/interfaces/aura-remove-interfaces.sh
```

## CLI-Style Safe Disable

```bash
AURA_REMOVE_INTERFACES_MODE=safe_disable \
AURA_REMOVE_INTERFACES_SCOPE=site \
./tools/interfaces/aura-remove-interfaces.sh
```

## Completion Criteria

The command is complete only when:

- every disabled interface has a ledger entry
- no protected files are removed
- health checks still pass
- public routes either work or return a clear disabled/deprecated message
- GitHub history can restore the previous interface state

## Operational Record

```text
AURA_REMOVE_INTERFACES = FORMATTED
Default behavior: safe_disable
Deletion behavior: blocked unless explicitly reviewed
Primary goal: reduce exposed interface surface while preserving proof, logs, safety, and rollback
```
