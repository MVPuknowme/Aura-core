# Aura-Core Codex Agent Policy

## Review Standard

All pull requests must be reviewed for:

- architecture
- correctness
- security
- performance
- compatibility
- tests
- docs
- deployment safety
- rollback safety
- CI/CD integrity
- dependency stability

## Severity Definitions

### CRITICAL
Merge blocking.
Security risks, secret leaks, destructive behavior, broken deployments, unsafe permissions.

### HIGH
Serious maintainability or reliability concern.

### MEDIUM
Improvement strongly recommended.

### LOW
Cosmetic or optional improvements.

## Repository Expectations

- Prefer deterministic infrastructure.
- Prefer pinned versions.
- Prefer least-privilege permissions.
- Prefer isolated deployment steps.
- Prefer auditable automation.
- Prefer reversible deployments.
- Prefer reproducible builds.

## GitHub Actions Policy

All workflows should:

- use minimal permissions
- avoid unnecessary write access
- avoid pull_request_target unless required
- validate external input
- avoid untrusted shell interpolation
- avoid secret exposure in logs
- use concurrency protection where appropriate
- upload artifacts for auditability

## Merge Gate

Any finding marked:

CRITICAL:

must fail the gate.
