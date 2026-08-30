# Diligence evidence index

Snapshot date: 2026-08-29

This directory is a public, redacted index for technical and commercial diligence. It does not contain personal account balances, wallet secrets, customer personal data, API credentials, contracts, invoices, or bank records. Those materials belong in a permissioned diligence room.

## Evidence rules

- Source code, tests, CI runs, documentation, and deployments are product evidence; they are not revenue.
- An offer, issue, forecast, pipeline record, or unsigned proposal is not booked revenue.
- Cost basis is not enterprise value.
- Forked upstream code is not proprietary IP. Only attributable modifications may be represented as owned work.
- A READY preview is not production availability. Production evidence requires the intended domain, a successful response, an identified commit, and a timestamped receipt.
- Missing or unpriced evidence stays unknown; it is never converted to a confirmed zero.

## Current verified repository facts

| Item | Verified state | Evidence or follow-up |
|---|---|---|
| Aura-Core repository | Public; default branch is `MVPuknowme` | GitHub repository metadata |
| Code ownership | `@MVPuknowme` is the default CODEOWNER | `.github/CODEOWNERS`; branch protection must be checked separately |
| Root software license | Not found | Owner/legal decision required before adding a license |
| Windows runtime change | PR #177 is open and mergeable | Two workflow files; CI outcome must be checked before merge |
| Guarded Etherscan reads | PR #175 remains draft and currently not mergeable | Live protected-environment smoke evidence is still missing |
| Vercel production health | Blocked | See `VERCEL-CANONICAL-PROJECT-RUNBOOK.md` |
| Commercial proof | No revenue should be inferred from repository artifacts | See `COMMERCIAL-EVIDENCE.md` |

## Diligence packet structure

1. **Public technical index** — this directory, architecture docs, security boundaries, test commands, and CI links.
2. **Private IP file** — contributor assignments, employment/contractor agreements, upstream notices, trademark records, and domain ownership.
3. **Private commercial file** — signed orders, invoices, settlement receipts, customer acceptance, renewals, churn, and support obligations.
4. **Private finance file** — bank-confirmed revenue, complete infrastructure ledger, tax records, liabilities, and reconciliations.
5. **Operations file** — production deployment receipts, incident log, backups, access reviews, dependency inventory, and SBOM.

## Release gates

- [ ] One canonical production project and domain
- [ ] Current default commit deployed and identified in the health receipt
- [ ] Root license decision documented
- [ ] Fork/delta inventory completed
- [ ] Contributor and domain ownership evidence placed in the private room
- [ ] SBOM and third-party notices generated
- [ ] Security policy, disclosure path, and dependency scanning confirmed
- [ ] First customer evidence progresses from acceptance through settlement without skipping stages
- [ ] Infrastructure costs reconciled from provider statements

This index deliberately avoids valuation claims. Valuation belongs in a dated memo that keeps verified financial value, documented cost basis, and assumption-based enterprise value separate.
