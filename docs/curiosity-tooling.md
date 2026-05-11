# Curiosity Tooling

Curiosity Tooling is the MVPuknowme / Aura-Core operating pattern for turning questions into traceable work artifacts.

## Purpose

The goal is to reduce time spent guessing and increase time spent verifying, documenting, reviewing, and deploying.

This document was created after reviewing the external `did:aura` / AURA Open Protocol overlap and the need to keep MVPuknowme-owned work clearly separated from third-party systems unless ownership or control is verified by evidence.

## Operator Identity

- Operator: Michael Vincent Patrick
- GitHub identity: MVPuknowme
- Project namespaces: Aura-Core, SKYGRID, WARDEN, Sun-Pay, related MVPuknowme infrastructure

## Boundary Rule

External systems using similar words, including `AURA`, `did:aura`, or agent-network terminology, are treated as third-party systems unless one or more of the following proves otherwise:

1. A commit exists in an MVPuknowme-controlled repository.
2. A domain is controlled by MVPuknowme.
3. A contract or wallet is verifiably controlled by MVPuknowme.
4. A signed release, deployment log, or timestamped artifact connects the system to MVPuknowme.
5. A written agreement or public statement establishes the relationship.

## Workflow

```text
Question -> Inspect -> Create Artifact -> Verify -> Review -> Push/Deploy
```

### 1. Question

Capture the operator request or curiosity trigger.

Examples:

- "Is this external AURA protocol related to us?"
- "Can this agent identity be verified?"
- "Can GitHub Actions run this check for us?"

### 2. Inspect

Use connected tools to gather facts. Prefer direct repository, issue, PR, action log, deployment, wallet, dashboard, or API evidence.

### 3. Create Artifact

Create one of:

- GitHub issue
- Documentation file
- Draft PR
- Workflow file
- API test collection
- Dashboard note
- Deployment log

### 4. Verify

Confirm the artifact exists and record the proof link.

### 5. Review

Choose the review route:

- Human review by Michael Vincent Patrick
- Codex review
- GitHub Actions validation
- Manual security review
- External legal/IP review when needed

### 6. Push/Deploy

Only after review is accepted. No unsupported claims, no secret exposure, no unauthorized routing, no wallet signing without explicit instruction.

## Current Review Targets

- Issue #66: Identity boundary and proof trail
- Issue #65: ASG Postman control layer into SkyGrid site
- Issue #64: DC to Northern California bridge latency runner
- Issue #63: Bridge message broadcast artifact
- Issue #62: Bridge ping return script

## Tooling Stack

| Layer | Tool | Use |
| --- | --- | --- |
| Task intake | GitHub Issues | Define work and acceptance criteria |
| Work artifact | GitHub docs/branches/PRs | Make changes traceable |
| Automated checks | GitHub Actions | Run build, lint, health, latency, and deployment checks |
| API control | Postman | Test health, routes, auth boundaries, and API behavior |
| Runtime | Cloudflare / Vercel / AWS | Host and measure infrastructure |
| Analytics | Dune / Airtable | Track structured metrics and evidence |
| Review | Codex / human / actions | Decide whether work is ready |

## Completion Standard

A task is complete when it has:

- A named artifact
- A proof link
- A status
- A reviewer path
- Clear next action

## Status

Created as the first Curiosity Tooling artifact for Aura-Core.

Next operator phrase:

```text
push to review
```

When Michael says that, route this artifact to review using the best available path: Codex-style review if enabled, GitHub Actions if validation files are present, or human review through a draft PR/comment path.
