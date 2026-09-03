# Remove Vercel Runtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove Vercel as an active or fallback SKYGRID runtime while preserving Cloudflare/AWS/Postman/local continuity and fail-closed behavior.

**Architecture:** Canonical PNPK remains the source of allowed runtime/ramp policy. The change removes Vercel from that policy, removes Vercel deployment entry points, and makes active API runtime labels provider-neutral. Historical documentation remains intact. No provider-side billing or cancellation is performed by repository code.

**Tech Stack:** Node.js 24, JSON/PNPK policy, GitHub Actions, Node test runner.

**Spec:** `docs/superpowers/specs/2026-09-03-remove-vercel-runtime.md`

## Global Constraints
- Product name remains `SKYGRID Emergency Data On-Ramp`.
- Preserve `sentinel: fail_closed`.
- Preserve Cloudflare Worker primary and AWS Lambda emergency runtime.
- Do not introduce wallet signing, transaction broadcast, device activation, private-data movement, or production failover.
- Do not claim provider billing cancellation/payment from repository changes.

---

### Task 1: Add failing Vercel-selection policy test

**Files:**
- Create: `tests/skygrid-no-vercel-runtime.test.mjs`
- Create: `.github/workflows/skygrid-no-vercel-runtime.yml`

**Interfaces:**
- Consumes: `bridge/skygrid-emergency-onramp.pnpk`
- Produces: focused CI assertion that Vercel is not selectable and continuity runtimes remain enabled.

- [ ] **Step 1: Write the failing test** that parses canonical PNPK and asserts no `platforms.vercel`, no `vercel` in partition allowed-ramp arrays, non-Vercel AI switch selection, Cloudflare/AWS enabled, and fail-closed sentinel.
- [ ] **Step 2: Add a focused pull-request workflow** running `node --test tests/skygrid-no-vercel-runtime.test.mjs`.
- [ ] **Step 3: Observe RED** on the unchanged policy and confirm the failure is specifically caused by Vercel still being selectable.
- [ ] **Step 4: Commit** the red test and workflow.

### Task 2: Remove Vercel from canonical runtime policy

**Files:**
- Modify: `bridge/skygrid-emergency-onramp.pnpk`

**Interfaces:**
- Consumes: Task 1 test contract.
- Produces: canonical runtime policy containing Cloudflare/AWS/Postman/non-Vercel candidates only.

- [ ] **Step 1: Remove `platforms.vercel`.**
- [ ] **Step 2: Remove `vercel` from emergency, diagnostic, Auto-Drill, and capacity-lease allowed-ramp arrays.**
- [ ] **Step 3: Update AI switch purpose and selected-ramp reference to the non-Vercel registry.**
- [ ] **Step 4: Run the focused test and confirm GREEN.**
- [ ] **Step 5: Commit.**

### Task 3: Remove active Vercel deployment entry points

**Files:**
- Delete: `vercel.json`
- Delete: `scripts/vercel-build.mjs`
- Review/remove active top-level build-script references in `package.json` and `Makefile` only where they invoke Vercel deployment/build behavior.

**Interfaces:**
- Consumes: repository build/deployment entry points.
- Produces: no top-level Aura-Core Vercel deployment path.

- [ ] **Step 1: Add focused assertions to the test for absent top-level Vercel deployment files or commands.**
- [ ] **Step 2: Observe RED.**
- [ ] **Step 3: Delete/update only active deployment entry points; retain historical docs/evidence.**
- [ ] **Step 4: Run focused tests and syntax checks.**
- [ ] **Step 5: Commit.**

### Task 4: Provider-neutral active runtime identity

**Files:**
- Modify active API/runtime files that currently report `vercel-api`, `vercel-aura-core`, or `vercel-static-api-path` as runtime identity.

**Interfaces:**
- Produces: provider-neutral runtime identity such as `skygrid-api` or `skygrid-runtime`, without changing route semantics.

- [ ] **Step 1: Add focused assertions for provider-neutral active runtime identity.**
- [ ] **Step 2: Observe RED.**
- [ ] **Step 3: Replace only runtime identity strings; do not alter authorization or execution guardrails.**
- [ ] **Step 4: Run focused tests and syntax checks.**
- [ ] **Step 5: Commit.**

### Task 5: Verification and PR handoff

**Files:**
- No new production files required.

- [ ] **Step 1: Run focused Vercel-removal tests.**
- [ ] **Step 2: Run syntax checks for modified JavaScript/MJS files.**
- [ ] **Step 3: Compare branch to `MVPuknowme` and confirm no historical billing/evidence files were deleted.**
- [ ] **Step 4: Refresh CI and report failures separately from pre-existing canonical/runtime-policy contradictions.**
- [ ] **Step 5: Keep the PR draft unless explicitly instructed otherwise.**
