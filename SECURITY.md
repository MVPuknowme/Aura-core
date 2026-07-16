# Security Policy

## Purpose

This policy explains how to report security vulnerabilities affecting the **SKYGRID Emergency Data On-Ramp** and related Aura-Core components.

SKYGRID is designed as a controlled, operator-gated, fail-closed continuity system. Security defects may affect intake validation, routing decisions, receipt integrity, authentication, authorization, availability, or submitted data.

This policy does not create a warranty, service-level agreement, regulatory certification, or guarantee of payment.

## Supported Versions

Security fixes are prioritized for:

- The actively maintained default branch
- The latest tagged controlled-pilot release

Older releases, archived prototypes, forks, and third-party modifications are supported only on a best-effort basis.

## Reporting a Vulnerability

Do not open a public GitHub issue for a suspected vulnerability.

Report vulnerabilities privately to:

**mvpuknowme@skygrid-protocol.net**

Email subject:

**[SECURITY] SKYGRID vulnerability report**

Include:

- Affected component, endpoint, release, or commit
- Vulnerability type and expected impact
- Reproduction steps or proof of concept
- Required access, credentials, or network position
- Relevant sanitized logs, requests, responses, or receipt identifiers
- Suggested remediation, when known
- Your preferred contact information

Do not send private keys, seed phrases, passwords, live tokens, patient data, financial data, or unrelated third-party information.

## Emergency Notice

This repository and mailbox are not emergency dispatch channels.

For an active threat to life or property, contact the appropriate local emergency service.

For an active compromise of a SKYGRID-controlled environment, include **ACTIVE INCIDENT** in the email subject and identify:

- The affected environment
- Time first observed, including time zone
- Known indicators of compromise
- Actions already taken
- Whether credentials or sensitive data may be exposed

## Response Targets

These are operational targets, not contractual guarantees:

| Stage | Target |
|---|---|
| Initial acknowledgment | Within 3 business days |
| Preliminary triage | Within 7 business days |
| Severity assessment | Within 10 business days |
| High or critical remediation plan | As soon as practical after validation |

## High-Impact Findings

Examples include:

- Authentication or authorization bypass
- Remote code execution
- Exposure of credentials, private keys, signing secrets, or sensitive data
- Forged, altered, deleted, or replayed decision receipts
- Impersonation of a verified SKYGRID runtime
- Bypass of fail-closed or operator-approval controls
- Unauthorized production failover or emergency dispatch
- Unauthorized wallet signing, transaction broadcasting, or payment execution
- Cross-tenant access
- Durable denial of service
- Compromise of build or artifact provenance

## SKYGRID Security Boundaries

Unless explicitly authorized for a specific deployment:

- Routing decisions remain advisory or operator-gated.
- Production failover is not autonomous.
- Emergency dispatch is not autonomous.
- Wallet signing and transaction broadcasting are prohibited.
- Payment execution is prohibited.
- Private-data movement outside approved routes is prohibited.
- Generic successful health responses do not establish trusted identity.
- Product, runtime, mode, sentinel, route, headers, and version must be validated.
- Decision and intake receipts should be integrity-protected.

A demonstrated bypass of these boundaries is in scope.

## Permitted Research

Good-faith research may include:

- Testing repository code in an isolated environment
- Reviewing validation, authorization, routing, and receipt logic
- Testing documented public endpoints at low request volume
- Reviewing dependencies and infrastructure configuration
- Using synthetic data and accounts you control

## Prohibited Testing

Do not:

- Access or modify another party's data
- Use real patient, financial, emergency, or confidential partner data
- Perform denial-of-service or destructive testing
- Disrupt public-safety, healthcare, financial, telecommunications, cloud, or partner systems
- Conduct phishing, extortion, social engineering, or credential theft
- Deploy malware, ransomware, persistence, or surveillance tooling
- Test systems you do not own or lack permission to assess
- Publicly disclose an unremediated vulnerability prematurely

Stop testing immediately if sensitive data, unintended privileged access, or service disruption occurs.

## Safe Harbor

The project will not pursue legal action solely for good-faith research that follows this policy, avoids privacy violations and disruption, and is reported promptly.

This statement does not authorize testing of third-party systems, excuse unlawful activity, grant access to data, or bind customers, providers, partners, or regulators.

## Secrets

Never commit:

- API or cloud credentials
- Private keys or seed phrases
- Signing or HMAC secrets
- Database or webhook credentials
- Production environment files
- Partner access codes
- Personally identifiable or regulated data

Treat exposed credentials as compromised even when the corresponding commit is later removed.

## Compliance Status

This repository does not independently establish HIPAA, SOC 2, PCI DSS, FedRAMP, StateRAMP, ISO 27001, NIST, CJIS, or other regulatory compliance.

Compliance claims require a defined scope, implemented controls, retained evidence, legal review, and any required independent assessment.

## Contact

Security reports:

**mvpuknowme@skygrid-protocol.net**

Non-security problems may be submitted through the normal GitHub issue process.
