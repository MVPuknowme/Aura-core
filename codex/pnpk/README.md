# PNPk — Patrick Newman Postman Kafka

`.pnpk` is a SKYGRID Auto-Drill payload format.

PNPk means:

- Patrick
- Newman
- Postman
- Kafka

## Purpose

PNPk payloads protect extracted data while preserving routing, validation, audit, and replay metadata for SKYGRID Emergency Data On-Ramp workflows.

## Profiles

Aura-Core currently recognizes three JSON-compatible `.pnpk` profiles. They share the
extension but are not interchangeable:

| Profile | Discriminator | Purpose |
| --- | --- | --- |
| Runtime policy | `pnpk_profile: runtime-policy` | Canonical fail-closed routing, platform, partition, and post-build policy in `bridge/skygrid-emergency-onramp.pnpk`. |
| Transport envelope | `system` plus `payload_type` | Redacted Postman/Kafka/Auto-Drill evidence described by `pnpk.schema.json`. |
| Local proof | `format: aura.pnpk` | Local PowerShell-created checkpoint packages under `artifacts/pnpk/packages/`. |

Code must detect the profile before validation. A file valid for one profile must not be
treated as valid for another.

## Post-build adapter

The runtime-policy profile declares a fixed post-build sequence for Solana Playground
preflight. The `.pnpk` file remains data, not a script. `scripts/run-pnpk-postbuild.mjs`
maps fixed step IDs to repository-owned scripts and rejects embedded commands, arguments,
unknown steps, missing steps, reordering, or non-required steps.

The sequence validates PNPK policy, verifies the Ethernet and Allbridge Core switch
pre-runs, runs Auto-Drill simulations and capacity-lease contract tests, and checks a
Solana `.so` artifact when present. It writes a hash-bound local receipt and fails closed
at the first failed step. Allbridge Core remains unselectable until an HTTPS status
endpoint returns `200` with `{ "ok": true }`. Solana remains preflight-only with no wallet
signing, transaction broadcast, or program deployment.

## Security Rules

Real `.pnpk` payloads must not contain raw secrets, API keys, private keys, certificates, wallet keys, tokens, session values, or unredacted private evidence.

Commit only:

- schema files
- safe demo payloads
- documentation
- test fixtures using dummy data

Store real protected payloads outside Git, preferably encrypted and hashed.

## Intended Fields

- `pnpk_version`
- `system`
- `payload_type`
- `classification`
- `redaction_status`
- `source`
- `postman`
- `kafka`
- `auto_drill`
- `protection`
- `payload`
- `audit`

## SKYGRID Language

This supports SKYGRID Emergency Data On-Ramp. Serverless services are implementation details only.
