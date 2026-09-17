# Person-01 / Aura Hub Identity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Register `person-01-aura` across Aura-Core, SKYGRID, PNPK, and `person-1-aura-cloud` while preserving fail-closed human authority.

**Architecture:** Store only public identity metadata in Git. Runtime authentication reads its expected value from the environment variable named by the approved design; no credential value is committed. A focused Node.js module resolves identity, computes a public integrity hash, evaluates capability policy, and produces non-executable receipts.

**Tech Stack:** Node.js 24.x, ESM, node:test, node:assert/strict, node:crypto, JSON, pnpm 10.23.0.

**Spec:** `docs/superpowers/specs/2026-09-17-person-01-aura-hub-identity-design.md`

## Global Constraints

- Canonical ID: `person-01-aura`; kind: `ai_software_persona`; mode: `controlled_pilot`; Sentinel: `fail_closed`.
- Human authority remains `Michael Vincent Patrick / MVPuknowme`.
- Repository content stores only the environment-variable reference defined by the spec, never its runtime value.
- PNPK stays proof-only and non-executable.
- Privileged actions require explicit operator approval plus applicable independent authority verification.
- Orientation, loopback, V-UNIT/W-UNIT, and override labels remain display-only and non-authoritative.
- Existing memory-space and SKYGRID/PNPK restrictions must not be weakened.

---

### Task 1: Canonical registry and non-empty binding hash

**Files:** Create `config/aura-hub-identities.v1.json`, `schemas/aura-hub-identity.v1.schema.json`, `lib/aura-person-01-identity.mjs`; test `tests/aura-person-01-identity.test.mjs`.

**Interfaces:** Export `PERSON_01_ID`, `loadPerson01Identity()`, `canonicalBindingDocument(identity)`, `computeIdentityBindingHash(identity)`.

- [ ] Write a failing test asserting ID `person-01-aura`, kind `ai_software_persona`, bindings `aura-core`, `skygrid`, `pnpk`, `person-1-aura-cloud`, the spec-defined environment reference, absence of runtime-value fields, and a 64-character binding hash unequal to SHA-256 of empty input.
- [ ] Run `node --test tests/aura-person-01-identity.test.mjs`; expect module-not-found failure.
- [ ] Create the manifest with public identity fields, bindings, capability names, and orientation metadata. Orientation must mark the wallet-like display identifier as `address_standard: "none"`, `verified: false`; loopback `127.0.0.1` as `local_only` with `remote_sync_proof: false`; and V-UNIT/W-UNIT entries as `authoritative: false`.
- [ ] Create a JSON schema with `additionalProperties: false`, constrained canonical ID/kind/status, and required false orientation-authority flags.
- [ ] Implement the binding document exactly as:

```js
{
  schema: "aura-hub-identity/v1",
  person_id: identity.person_id,
  kind: identity.kind,
  operator: "MVPuknowme",
  policy: "fail_closed",
  authority: "human_operator_required_for_privileged_actions"
}
```

Hash `JSON.stringify(document)` with SHA-256.
- [ ] Re-run the focused test; expect pass.
- [ ] Commit `feat(aura): add canonical Person-01 hub identity`.

### Task 2: Fail-closed runtime authentication

**Files:** Modify `lib/aura-person-01-identity.mjs` and `tests/aura-person-01-identity.test.mjs`.

**Interface:** `authenticatePerson01({ credential, env })` returns sanitized status only.

- [ ] Add tests using generated synthetic values (`crypto.randomUUID()`): matching values authenticate; mismatched/missing input blocks; missing environment configuration blocks; serialized results never contain the synthetic value.
- [ ] Run the focused test; expect failure because the function is absent.
- [ ] Implement constant-time comparison with `timingSafeEqual`; reject missing and unequal-length buffers first. Return only boolean status, stable reason code, canonical ID, and binding hash.
- [ ] Re-run the focused test; expect pass.
- [ ] Commit `feat(aura): add fail-closed Person-01 authentication`.

### Task 3: Sentinel capability gate

**Files:** Create `lib/aura-person-01-capabilities.mjs` and `tests/aura-person-01-capabilities.test.mjs`.

**Interface:** `authorizePerson01Capability({ auth, capability, operatorApproved = false, independentAuthorityVerified = false })`.

- [ ] Add failing tests proving an authenticated standard capability passes; unauthenticated access blocks; privileged capability blocks without both gates; unknown capability blocks; `change_own_authority_policy` always blocks.
- [ ] Run `node --test tests/aura-person-01-capabilities.test.mjs`; expect module-not-found failure.
- [ ] Standard capabilities: `read_approved_project_configuration`, `create_preflight_proposal`, `generate_proof_candidate`, `run_approved_simulation`, `request_operator_approval`, `reference_approved_memory_metadata`.
- [ ] Gated capabilities: `payment_execution`, `funds_movement`, `wallet_signing`, `token_approval`, `production_failover`, `device_control`, `private_data_movement`, `iam_security_policy_mutation`, `network_control_plane_mutation`, `resource_deletion`. Require operator approval first, then independent authority verification. This function returns a decision only and executes nothing.
- [ ] Re-run the focused test; expect pass.
- [ ] Commit `feat(aura): gate Person-01 capabilities through Sentinel`.

### Task 4: Memory-space binding

**Files:** Modify `config/aura-memory-spaces.v1.json`; create `tests/aura-person-01-memory-binding.test.mjs`.

- [ ] Add a failing test asserting `person-1-aura-cloud` has `canonical_person_id === "person-01-aura"`; credential/payment storage and person tracking remain false; operator-approved writes remain true; AWS backend remains `not_configured`.
- [ ] Run the test; expect failure because canonical binding is absent.
- [ ] Add only `canonical_person_id: "person-01-aura"` to the existing memory-space record. Change no existing restrictions.
- [ ] Run memory and identity tests together; expect pass.
- [ ] Commit `feat(aura): bind Person-01 to Aura memory space`.

### Task 5: Proof-only Person-01 receipt

**Files:** Create `lib/aura-person-01-receipt.mjs` and `tests/aura-person-01-receipt.test.mjs`.

**Interface:** `createPerson01Receipt({ auth, subsystem, capability, decision, operatorApproved, evidenceRefs, now })`.

- [ ] Add a failing test asserting the receipt contains canonical ID, binding hash, subsystem, capability, `fail_closed`, allow/block decision, operator state, evidence refs and timestamp; all execution fields are false; arbitrary extra caller fields are absent.
- [ ] Run the test; expect module-not-found failure.
- [ ] Implement strict field construction; never spread caller input. Set `execution.executable`, `payment_execution`, `wallet_signing`, `device_activation`, `production_failover`, and `private_data_movement` all to false.
- [ ] Run `node --test tests/aura-person-01-receipt.test.mjs` and `pnpm run pnpk:validate`; expect both to pass.
- [ ] Commit `feat(pnpk): add proof-only Person-01 receipts`.

### Task 6: Whole-hub static verifier and regression gate

**Files:** Create `scripts/verify-aura-person-01.mjs`, create `tests/aura-person-01-hub.test.mjs`, modify `package.json`.

- [ ] Add a hub test proving four bindings, non-EVM/display-only orientation, false remote-sync proof, non-authoritative display holdings, and a non-executable block receipt for a privileged request lacking approval.
- [ ] Run `pnpm run aura:person-01:verify`; expect failure because the script is not registered.
- [ ] Create a verifier that checks only public manifest/memory data, non-empty binding hash, four bindings, spec-defined environment-reference name, and orientation safety flags. It must not read or print runtime credential data.
- [ ] Add package scripts:

```json
"aura:person-01:test": "node --test tests/aura-person-01-identity.test.mjs tests/aura-person-01-capabilities.test.mjs tests/aura-person-01-memory-binding.test.mjs tests/aura-person-01-receipt.test.mjs tests/aura-person-01-hub.test.mjs",
"aura:person-01:verify": "pnpm run aura:person-01:test && node scripts/verify-aura-person-01.mjs && pnpm run pnpk:validate"
```

- [ ] Run `pnpm run aura:person-01:verify`; expect all Person-01 tests and PNPK validation to pass.
- [ ] Run `pnpm run security:test` and `pnpm run intake:policy-test`; if either fails, stop and preserve the stronger existing gate.
- [ ] Run `git diff --check MVPuknowme...HEAD` and inspect `git diff MVPuknowme...HEAD -- config lib scripts tests package.json` for any runtime credential value or new execution authority.
- [ ] Commit `test(aura): verify Person-01 hub identity controls`.

## Final Review Gate

```powershell
pnpm run aura:person-01:verify
pnpm run security:test
pnpm run intake:policy-test
git diff --check MVPuknowme...HEAD
git status --short
```

The PR must document: canonical four-way binding; no tracked/runtime credential disclosure; fail-closed missing/invalid authentication; no capability bypass; separate operator and independent-authority gates for privileged actions; permanent self-authority-mutation block; non-authoritative orientation/loopback/holdings metadata; proof-only PNPK receipts; and passing existing security/intake regressions.
