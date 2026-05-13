# SKYGRID Web3 and Mainnet Synchronization

## Purpose

This document defines the synchronization contract between:

- SKYGRID public website front doors,
- Auto Drill route decision logic,
- local validator nodes,
- AWS/DC reserve compute,
- Web3 reference validation systems.

The purpose is coordination and proof generation.

The purpose is not wallet execution or exchange automation.

## Core Principle

```text
Different runtimes, same event schema.
Different code styles, same proof contract.
```

## Architecture Planes

### Plane 1: Website / Public Front Door

Examples:

- B12 staging sites
- Next.js Vercel front door
- optional CloudFront distribution

Responsibilities:

- public onboarding
- architecture explanation
- proof display
- health manifest
- validator waitlist
- pilot access

Forbidden:

- wallet execution
- exchange execution
- private key handling

### Plane 2: Validation Control Plane

Examples:

- Auto Drill
- validator registry
- route scoring
- reserve activation logic

Responsibilities:

- determine validation routes
- determine validator capacity state
- trigger reserve compute when needed
- emit proof events

Forbidden:

- token swaps
- bridge transfers
- wallet movement
- hidden mining

### Plane 3: Execution / Proof Plane

Examples:

- AWS Batch
- ECS/Fargate
- Kafka event streams
- proof artifact storage

Responsibilities:

- run validation workloads
- store proof artifacts
- report health and completion status

Forbidden:

- private key storage
- exchange trades
- custody

## Capacity Logic

```python
if local_validator_count >= minimum_required:
    capacity_mode = "local_first"
else:
    capacity_mode = "dc_skygrid_reserve"
```

## Supported Validation Scope

Allowed:

- route health
- token metadata
- explorer references
- exchange quote references
- uptime proof
- latency proof
- proof artifacts

Not allowed:

- wallet movement
- swaps
- bridge transfers
- staking
- hidden mining
- exchange trade execution

## Shared Event Contract

All systems should emit and consume:

```text
skygrid.validation.event.v1
```

See:

```text
schemas/skygrid.validation.event.v1.json
```

## AWS Reserve Recommendation

Recommended:

- AWS Batch for queued validation jobs
- ECS/Fargate for always-ready reserve validators

Credential recommendation:

- preferred: GitHub OIDC + AWS_ROLE_ARN
- fallback: AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY

## Public Claim Policy

Safe wording:

> SKYGRID is a local-first, cloud-reserve validation architecture using proof-first routing and reserve compute activation when local validator capacity is low.

Avoid unsupported claims such as:

- guaranteed uptime
- fully live national deployment
- automatic exchange execution
- automatic wallet actions
- hidden mining

## Website Failover Recommendation

Optional CloudFront configuration:

- Primary origin: B12/Vercel
- Secondary origin: AWS static mirror
- Health object: `/health.json`
- Failover codes: 429, 500, 502, 503, 504

## Next Verification Steps

1. Refresh `pnpm-lock.yaml`.
2. Verify Vercel deployment passes.
3. Verify `/health.json` is publicly reachable.
4. Run Auto Drill dry-run.
5. Generate first reserve activation proof artifact.
