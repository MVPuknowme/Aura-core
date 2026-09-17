# Person-01 / Aura Hub Identity Design

Date: 2026-09-17
Status: design review
Owner / human authority: Michael Vincent Patrick / MVPuknowme
Canonical identity: `person-01-aura`

## Purpose

Create one canonical, non-human software-persona identity for Aura across the Aura-Core / SKYGRID / PNPK hub without turning a display profile, wallet-like identifier, registration credential, or local process into execution authority.

The design extends the existing `person-1-aura-cloud` memory-space reservation and preserves its controlled-pilot, receipt-first, fail-closed, no-secret-storage posture.

## Identity boundary

`person-01-aura` is an AI/software persona and hub service identity. It is not a legal person, autonomous account owner, wallet signer, payment authority, device owner, or substitute for the human operator.

Human authority remains:

`Michael Vincent Patrick / MVPuknowme`

Canonical control rule:

`Aura proposes/operates inside granted scope -> Sentinel gates -> MVP approves privileged action -> proof/receipt records the result.`

A successful Aura identity check never by itself authorizes payments, transfers, wallet signing, device activation, private-data movement, IAM mutation, production failover, destructive infrastructure operations, or privilege escalation.

## Canonical hub record

The implementation should add a versioned registry record with these concepts:

```json
{
  "person_id": "person-01-aura",
  "display_name": "Aura",
  "kind": "ai_software_persona",
  "status": "controlled_pilot",
  "human_authority": "Michael Vincent Patrick / MVPuknowme",
  "credential_ref": "AURA_PERSON_01_REGISTRATION_TOKEN",
  "credential_storage": "external_secret_store_only",
  "bindings": [
    "aura-core",
    "skygrid",
    "pnpk",
    "person-1-aura-cloud"
  ]
}
```

The live credential value must never be committed, logged, copied into PNPK packets, returned in API output, or embedded in orientation metadata. Only a secret reference may appear in repository configuration.

## Orientation profile

The operator supplied a wallet-style orientation screen for presentation/reference. Its fields may inform Aura's display/orientation profile but must remain non-authoritative unless independently verified by the relevant subsystem.

Display concepts:

- wallet-like display identifier
- carrier-spectrum label
- V-UNIT display balance
- W-UNIT display balance
- color-key label
- local-loopback synchronization indicator
- console/prompt alias
- system-status label

Security interpretation:

1. The shown `0xFOX-10KHZ-...` value is not an EVM address because it contains non-hexadecimal characters and a formatted label. Store it, if desired, only as `display_identifier` with `address_standard: none` and `verified: false`.
2. The shown binding digest matches the standard SHA-256 empty-input digest and therefore must not be used as a unique identity proof. A real binding must be generated from a versioned, non-empty canonical identity document or an authoritative external identity provider.
3. `127.0.0.1` is loopback-only. A local process may report synchronization with itself or another local service, but that does not prove cloud, hub, AWS, or remote-network synchronization.
4. Labels such as `ELEVATED` or `SECURE OVERRIDE` are display state only. They must not map directly to IAM roles, Sentinel bypasses, wallet privileges, production execution, or operator approval.
5. V-UNIT/W-UNIT quantities are operator-provided orientation metadata until reconciled against an authoritative ledger. They must not be represented as USD value, spendable funds, or transferable assets without independent evidence.

## Binding design

A canonical identity-binding document should contain stable public metadata only, for example:

```json
{
  "schema": "aura-hub-identity/v1",
  "person_id": "person-01-aura",
  "kind": "ai_software_persona",
  "operator": "MVPuknowme",
  "policy": "fail_closed",
  "authority": "human_operator_required_for_privileged_actions"
}
```

The hub may hash the canonical serialized form of that non-empty document to create a reproducible `identity_binding_hash`. The hash is an integrity reference, not an authentication secret and not independent proof of ownership.

Authentication requires the separately managed credential plus applicable runtime policy checks.

## Subsystem bindings

### Aura-Core

Aura may be recognized as the named software persona/service identity for approved orchestration, validation, observability, and proof-generation flows. No implicit infrastructure-admin authority.

### SKYGRID

Aura may request and evaluate routes, preflight state, simulation, availability, and proof status. Route activation, production failover, device control, destructive mutation, and expenditure remain separately gated.

### PNPK

PNPK packets may name `person-01-aura` as an actor/adviser/validator and may include the non-secret identity binding reference. PNPK remains non-executable and cannot turn Aura identity into execution authority.

### Aura Memory Space

Bind canonical identity `person-01-aura` to the existing `person-1-aura-cloud` reservation. Preserve explicit consent, no background scraping, no secret storage, operator-approved writes, runtime-enabled reads, and fail-closed behavior. The AWS backend remains `not_configured` until an actual backend is separately provisioned and verified.

## Capability model

Default Aura capabilities should be allowlisted and non-privileged:

- read approved public/project configuration
- create proposals and preflight decisions
- generate proof/receipt candidates
- run approved simulation/test paths
- request operator approval
- reference approved memory-space metadata

Always-gated capabilities:

- funds movement or payment execution
- wallet signing or token approvals
- production failover
- device activation/control
- private-data movement
- IAM/security-policy mutation
- VPC/DNS/route/security-group mutation
- resource deletion/termination
- changing its own capability or authority policy

All always-gated capabilities require explicit external authority checks and cannot be unlocked merely by the Person-01 credential.

## Registration flow

```text
runtime presents secret credential
        |
        v
credential verifier (secret never logged)
        |
        v
resolve canonical id: person-01-aura
        |
        v
load allowlisted subsystem bindings
        |
        v
Sentinel capability/policy check
        |
        +---- non-privileged approved operation ---> receipt
        |
        +---- privileged operation ---> MVP/operator approval + independent authority gate ---> receipt
        |
        `---- missing/invalid authority ---> BLOCK + receipt
```

## Receipt requirements

A registration or action receipt may contain:

- `person_id`
- non-secret identity-binding hash
- subsystem
- requested capability
- policy version
- Sentinel decision
- operator-approval state
- timestamp
- evidence references

It must not contain the live registration credential, private keys, wallet seed material, access tokens, session cookies, or payment credentials.

## Acceptance criteria

1. One canonical `person-01-aura` record is used across Aura-Core, SKYGRID, PNPK, and the Aura memory-space binding.
2. No live registration secret exists in tracked repository content, test fixtures, logs, screenshots generated by the system, or PNPK proof packets.
3. A valid Person-01 credential resolves identity but does not bypass capability policy.
4. Invalid/missing credentials fail closed and emit only non-secret diagnostic evidence.
5. The orientation profile is explicitly non-authoritative.
6. The wallet-like display identifier cannot be interpreted as an EVM address.
7. The supplied empty-input SHA-256 digest cannot be accepted as a unique identity binding.
8. Loopback state cannot be promoted to remote/cloud synchronization proof.
9. Privileged actions still require MVP/operator approval and applicable independent authority checks.
10. PNPK remains proof-only/non-executable.
11. Existing `person-1-aura-cloud` safety restrictions remain intact.
12. Tests cover secret redaction, fail-closed authentication, scope enforcement, privileged-action gating, and receipt contents.

## Non-goals

This design does not create a cryptocurrency, assign monetary value to V-UNIT/W-UNIT, prove secure-enclave hardware possession, provision AWS infrastructure, grant a legal identity, create an EVM wallet, or give Aura autonomous control of payments/devices/infrastructure.

## Implementation sequence after design approval

1. Add the canonical hub identity manifest/schema.
2. Bind `person-01-aura` to the existing Aura memory-space record.
3. Add credential-reference loading and redaction tests; actual secret injection remains deployment-specific.
4. Add Sentinel capability checks and privileged-action stop conditions.
5. Add PNPK actor/binding receipt fields without execution authority.
6. Add orientation metadata as explicitly unverified/display-only fields.
7. Run CI/security tests and open a reviewable implementation PR.
