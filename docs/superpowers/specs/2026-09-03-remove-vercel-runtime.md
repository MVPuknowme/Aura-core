# Remove Vercel Runtime — Design Specification

## Goal
Remove Vercel as an active, fallback, or selectable runtime for SKYGRID Emergency Data On-Ramp while preserving fail-closed continuity through Cloudflare Worker, AWS Lambda, Postman/local validation, and existing non-Vercel preflight paths.

## Scope
- Remove the `platforms.vercel` runtime/ramp registry from canonical PNPK.
- Remove `vercel` from emergency, diagnostic, Auto-Drill, and capacity-lease allowed-ramp lists.
- Point the AI switch at the non-Vercel runtime registry and update its purpose wording.
- Remove top-level Vercel deployment configuration/build entry points that actively deploy Aura-Core to Vercel.
- Replace Vercel-specific runtime identity strings in active health/runtime responses with provider-neutral SKYGRID runtime identities.
- Preserve historical Vercel documentation, receipts, diligence records, and billing evidence as historical records unless they actively cause deployment/routing.

## Continuity
- `cloudflare_worker` remains the primary public runtime in PNPK.
- `aws_lambda` remains the emergency validation runtime.
- `postman` remains the diagnostic/advisory validation route.
- Local/container validation remains available where already implemented.
- No automatic production failover is introduced by this removal.
- If no approved runtime is healthy, behavior remains fail-closed.

## Safety boundaries
This change does not authorize or alter payment execution, wallet signing, transaction broadcasting, device activation, private-data movement, or production failover. Existing unrelated runtime-policy values are not silently rewritten in this feature.

## Billing boundary
Repository changes cannot pay or cancel a Vercel invoice. Billing/provider cancellation requires a separately authorized provider-side action. Historical provider transactions remain authoritative.

## Verification
A focused policy test must fail before implementation while Vercel remains selectable, then pass only when:
1. canonical PNPK has no `platforms.vercel` entry;
2. no PNPK partition lists `vercel` as an allowed ramp;
3. AI switch no longer selects `platforms.vercel.active_ramp_policy`;
4. Cloudflare Worker and AWS Lambda remain enabled;
5. fail-closed sentinel remains unchanged.
