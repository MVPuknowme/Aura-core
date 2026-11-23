# License of Survivorship — SaaS proof of concept

Prepared for **Michael Vincent Patrick — MVPuknowme** / **SKYGRID-protocol**.

This standalone demonstration explores continuity of a SaaS service through an outage and separately evaluates a proposed successor after incapacity or death. It records a founder attribution supplied by the owner, not independent verification of identity or ownership.

## Run
Download this folder and open `index.html` in a modern browser. The page includes its policy evaluator and requires no dependencies. Form state is memory-only and resets on reload. Exports create local files; no form data is submitted.

Run the same policy cases with Node:
```sh
node examples/survivorship/policy.test.cjs
```

The policy source is embedded verbatim in index.html. After modifying policy.cjs, synchronize the embedded function and run the parity check in policy.test.cjs.

## Included
- `index.html`: interactive continuity lab, license reader, draft lease-offer generator and unsigned receipt export.
- `policy.cjs`: pure simulation evaluator with no external effects.
- `policy.test.cjs`: decision and scope regression cases, plus HTML/source parity check.
- `LICENSE-DRAFT.md`: unsigned proposed SaaS continuity and succession rider.
- `LEASE-OFFERS-DRAFT.md`: three proposed offer types, outreach copy and order checklist.
- `verification.json`: actual checks and their limits.
- `ROLLOUT.md`: branch inventory and rollout boundaries.

## What is and is not proved
23 policy cases were executed successfully in the available JavaScript V8 tool runtime. They cover expiry, revocation, missing authority, disputed requests, duplicate reviewers, cross-tenant input and scoped outage/succession routing. Node CLI, browser rendering, hosted deployment and real integrations were not tested: the local execution service did not return command output during preparation.

All outputs include simulation mode and `execution_authorized: false`. Inputs labeled as evidence or approval are user-controlled mock values. They are not identity verification, estate administration or production security. A person can edit browser code and simulate any state.

This is not an executed license, statutory online tool, legal opinion, will, trust, source escrow, insurance policy or transfer of ownership. No payments, wallets, production failover, device access, Bluetooth discovery or private-data export is implemented.

## PNPK relationship
The receipt schema is `skygrid.survivorship.receipt.v0.1`, not `aura.pnpk` and not a validated PNPK runtime-policy package. Existing Aura-Core PNPK validators have not validated it. A future adapter should preserve receipt-only operation, scoped authority, expiry/revocation, content capture off, and instrumented-boundary-only claims. P0 selects a permissible route using configured location and policy; it holds when prerequisites are absent.

## Production requirements
A real service needs authentication, independent authority review, separate representative accounts, tenant isolation, server-side checks at every protected operation, revocation, encrypted evidence intake, durable signed audits, trusted time, tested backups and funded support. Complete the asset schedule and legal review. The current license and existing valid third-party/legacy rights remain unchanged.

No lease offers were sent and no prospect or price was invented.
