# IP and provenance schedule

Snapshot date: 2026-08-29

This schedule is an engineering evidence inventory, not a legal opinion. “Original repository” means GitHub does not mark the repository as a fork; it does not by itself prove complete ownership of every dependency or contribution.

| Component | Source / evidence | Current provenance state | Required diligence |
|---|---|---|---|
| Aura-Core / SKYGRID implementation | `MVPuknowme/Aura-core` | Repository is not marked as a fork; no root `LICENSE` was found | Select and document a license only after owner/legal review; preserve contribution history; add SBOM and third-party notices |
| Speak | Implemented within Aura-Core; PR #168 | Attributable repository history exists; standalone ownership and license are not separately asserted | Map files and dependencies to Aura-Core policy; retain the non-mind-reading product boundary |
| PNPK implementation | Schemas, validators, runners, policies, and proof artifacts in Aura-Core | Attributable history exists; cross-repository ownership boundaries are not consolidated | Map every implementation/specification file to its repository, author, license, and dependency |
| PNPK specification | `MVPuknowme/pnpk-spec` | Previously recorded as an original repository with no clearly asserted license | Re-verify repository metadata; choose a specification license; document patent/trademark posture if applicable |
| Phoenix | `MVPuknowme/phoenix-v1` | Fork-based asset | Record upstream URL and license; generate a fork-base-to-HEAD delta; value only attributable changes |
| Solana Playground | `MVPuknowme/solana-playground` | Fork-based asset; prior metadata reported Apache-2.0 | Re-verify current license and notices; inventory only the PNPK and other attributable deltas |
| Validators and deployment infrastructure | Aura-Core workflows/configuration plus related repositories | Configuration and tests exist; ownership is not consolidated into one schedule | Inventory every repository, IaC module, hosted account, secret owner, runtime dependency, and operating agreement |
| Domains and hosted services | Vercel, Cloudflare, DNS, and related provider accounts | Technical references exist; ownership and payment records are outside Git | Store registrar/DNS/account receipts and access roster in the private diligence room |
| Wallet-linked features and tokens | Read-only routes, wallet routing, and tracked on-chain artifacts | Code and on-chain existence do not prove token authorship, ownership of all rights, or economic value | Keep signing authority, token provenance, contracts, and valuation evidence separate |

## Fork-delta record

For every forked repository, record:

- upstream repository and immutable base commit;
- upstream and local license/notice files;
- commits and files attributable to the project;
- third-party dependencies and generated code;
- tests that cover the attributable delta;
- any copied documentation, media, models, data, or trademarks;
- restrictions on distribution, sublicensing, patents, and network use.

## Contribution ownership record

Keep signed evidence for:

- founder assignments to the legal entity;
- employee and contractor invention assignments;
- external contributor license or assignment terms;
- code generated with third-party services when their terms matter;
- imported assets, models, datasets, icons, fonts, and documentation.

## Decision log

Do not add a root license merely to make the repository look complete. Record the owner, counsel/reviewer, decision date, selected license, affected repositories, and treatment of prior public copies. Until that decision is made, report the license as unresolved.
