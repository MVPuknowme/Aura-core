# PNPk — Patrick Newman Postman Kafka

`.pnpk` is a SKYGRID Auto-Drill payload format.

PNPk means:

- Patrick
- Newman
- Postman
- Kafka

## Purpose

PNPk payloads protect extracted data while preserving routing, validation, audit, and replay metadata for SKYGRID Emergency Data On-Ramp workflows.

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
