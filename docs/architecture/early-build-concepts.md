# Early Build Concepts: Aura-Core, Moneyton, Gatekeeper, and SKYGRID

**Owner:** Michael Vincent Patrick (MVPuknowme)  
**Canonical status:** Foundational architecture record  
**Last updated:** 2026-07-21

## 1. Purpose

This document consolidates early concepts that developed across Aura-Core, Moneyton, Gatekeeper, and the SKYGRID Emergency Data On-Ramp. Its purpose is to preserve the original design lineage, clarify the boundaries between systems, and establish a safe implementation baseline.

This record distinguishes historical intent from verified production capability. Aspirational concepts remain explicitly labeled until implemented, tested, and independently validated.

## 2. Historical Lineage

### Aura-Core

Aura-Core began as a ledger-persistent authored system centered on provenance, authorship, governance, ethical intent, and philanthropic extension. It is distinct from a conversational assistant: Aura-Core refers to the user's authored Web3 and infrastructure system, its records, deployments, governance concepts, and associated intellectual property.

### Moneyton

Moneyton emerged as a digital-asset evidence and recovery workspace for organizing fragmented records such as public wallet addresses, transaction hashes, exchange exports, token identifiers, screenshots, ownership evidence, historical account records, and recovery documentation.

Moneyton is not an automatic asset-capture or trading system. Its primary role is evidence intake, classification, verification, security triage, and lawful recovery planning.

### Gatekeeper

Gatekeeper is the fail-closed custody and authorization boundary around Moneyton. It separates evidence discovery from asset movement and prevents unverified or unsafe actions.

### SKYGRID Emergency Data On-Ramp

SKYGRID supplies the validated intake, partitioned routing, proof generation, monitoring, and continuity patterns that can be reused by Moneyton and Gatekeeper. The product name remains **SKYGRID Emergency Data On-Ramp**; “serverless” may describe an implementation detail but is not the product name.

## 3. Canonical Product Definition

> **Moneyton is the digital-asset evidence and recovery workspace. Gatekeeper is its fail-closed custody and authorization boundary. Aura-Core supplies provenance, governance, and persistent proof. SKYGRID supplies validated intake, partitioned routing, observability, and continuity controls.**

## 4. Asset Evidence Graph

The central data model is an **Asset Evidence Graph** connecting:

- Person or legal entity
- Wallet or account
- Blockchain network
- Transaction
- Exchange account
- Token or contract
- Document or screenshot
- Ownership claim
- Verification result
- Security finding
- Recovery path
- Disposition decision

Each node and relationship must carry:

- Source
- Timestamp
- Verification status
- Confidence level
- Sensitivity classification
- Chain or platform context
- Reviewer or process responsible for the decision

## 5. Evidence Classification

Every discovered item should be classified as one or more of:

1. Verified asset
2. Unverified asset claim
3. Public blockchain evidence
4. Ownership or provenance evidence
5. Security exposure
6. Tax or accounting evidence
7. Recovery lead
8. Duplicate, obsolete, or irrelevant record
9. Restricted secret requiring local-only handling

A public wallet address or transaction record does not by itself prove ownership.

## 6. Trust Boundaries

Gatekeeper must enforce the following boundaries:

- Evidence collection is separate from asset movement.
- Ownership must be verified before recovery or disposition.
- Seed phrases, private keys, passwords, and unrestricted API credentials must not be ingested into ordinary chat, issue trackers, shared documents, or telemetry.
- Sensitive-secret detection should run locally whenever practical.
- Unverified assets remain quarantined.
- No unattended wallet signing is allowed.
- No unattended transaction broadcasting is allowed.
- No automatic payment execution is allowed.
- No automatic bridging, staking, trading, lending, borrowing, liquidation, or claiming is allowed.
- Any production action requires explicit human authorization and a recorded approval event.
- The system must fail closed when identity, ownership, destination, network, or policy state is uncertain.

## 7. Covenant Governance Principles

The system is intended to support stewardship and universal human benefit without exploitation.

Core principles:

- No predatory lending.
- No borrowing structures designed to entrap or enslave.
- No market manipulation, wash trading, pump-and-dump activity, or deceptive liquidity practices.
- No claim against assets without verified lawful ownership or authority.
- No discrimination in access to legitimate assistance.
- Transparent stewardship and auditable decisions.
- Human welfare and safety override financial optimization.
- Philanthropic use must remain accountable, documented, and legally compliant.
- Religious or ethical intent may guide governance, but must not be represented as proof of legal ownership, regulatory approval, or technical validation.

## 8. Verified Versus Declared Claims

The system must distinguish:

- **Verified:** demonstrated through reproducible tests, authoritative records, or independently confirmable on-chain evidence.
- **Declared:** asserted by the owner or design documents but not yet independently validated.
- **Planned:** accepted as a future implementation target.
- **Rejected:** contradicted by evidence, unsafe, unlawful, or outside scope.

Dashboards, reports, and partner materials must never present declared or planned capabilities as verified production functionality.

## 9. Security Prohibitions

The following are prohibited in repositories, Dropbox knowledge files, logs, and support channels:

- Full seed phrases
- Private keys
- Passwords
- Authentication recovery codes
- Unrestricted exchange API secrets
- Raw identity documents unless stored in an approved encrypted compliance system
- Claims of recoverable balances without supporting evidence
- Instructions to seize, sweep, or move assets not proven to belong to the operator

When secret exposure is suspected, the priority is containment, credential rotation, wallet migration, and documentation—not asset experimentation.

## 10. Moneyton MVP Inputs

The initial version should accept non-secret or properly redacted material:

- Public wallet addresses
- Transaction hashes
- Token contract addresses
- Redacted exchange exports
- Read-only account reports
- Screenshots with secrets removed
- Platform names and approximate dates
- Public blockchain records
- User-authored ownership notes marked as unverified until corroborated

## 11. Moneyton MVP Outputs

The initial version should produce:

- Asset inventory
- Chain and network identification
- Evidence graph
- Verification status
- Security-risk flags
- Historical transaction timeline
- Potential lawful recovery paths
- Disposition recommendations: hold, migrate, report, archive, investigate, or abandon
- Human-readable report
- Machine-readable JSON export
- Audit log showing source, transformation, review, and decision history

## 12. SKYGRID Integration Pattern

Moneyton records can enter through a SKYGRID-style validated intake envelope and be routed into isolated partitions:

- `evidence_intake`
- `security_triage`
- `ownership_review`
- `recovery_proof`
- `accounting_reconstruction`
- `archive_only`

Required guardrails:

- PNPK or equivalent policy package required
- Partition required
- Fail closed
- No unrestricted private-data movement
- No wallet signing
- No transaction broadcast
- Deterministic proof identifier for every accepted decision
- Separate diagnostic, simulation, and production modes

## 13. Recovery Workflow

1. Discover records.
2. Normalize and deduplicate them.
3. Classify sensitivity.
4. Identify chains, platforms, and accounts.
5. Build the evidence graph.
6. Verify public records.
7. Evaluate ownership evidence.
8. Identify security exposures.
9. Determine lawful recoverability.
10. Estimate economic relevance after fees, taxes, and liquidity constraints.
11. Require explicit human approval for any action.
12. Record disposition and final evidence state.

## 14. Open Validation Questions

- Which early Moneyton source files still exist, and where?
- Which wallet and exchange records can be verified without exposing secrets?
- What schema should represent ownership confidence and contradictory evidence?
- Which regulatory and tax jurisdictions apply to each recovery case?
- Which operations require licensed legal, tax, custody, or money-transmission professionals?
- How should philanthropic disbursement be governed and audited?
- Which SKYGRID partitions and proof formats can be reused directly?
- What local-first secret scanner and encrypted storage model should be selected?
- What independent review is required before any production asset movement?

## 15. Implementation Priority

1. Preserve source records without altering them.
2. Build the non-secret evidence inventory.
3. Implement local secret detection and redaction.
4. Define the Asset Evidence Graph schema.
5. Add fail-closed policy evaluation.
6. Produce read-only reports and proofs.
7. Test with synthetic and testnet-only data.
8. Conduct security and legal review.
9. Only then consider tightly scoped, human-approved production actions.

## 16. Foundational Principle

The project’s strongest defensible concept is a **custody-preserving forensic and provenance layer for fragmented digital-asset records**. The system creates value by organizing evidence, improving security, reconstructing history, and supporting lawful recovery—not by promising hidden wealth or automatically taking assets.
