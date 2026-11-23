# SKYGRID — Mobile AI Failover Dispatcher v1

## AuraSky umbrella and ownership

[AuraSky — SKYGRID-protocol](https://aurasky.Skygrid-protocol.net) is the umbrella for Aura-Core, PNPK and Auto-Drill.

**Michael Vincent Patrick — MVPuknowme** declares sole ownership of these software projects and the AuraSky design. Until documented partnership agreements are present, no partner ownership or payment entitlement is assigned. Record future software/licensing and capacity-provider agreements separately.

**Licensing:** exclusive, all-rights-reserved control of new original owner-controlled material. See [LICENSE](LICENSE) and [licensing scope](docs/licensing/exclusive-rights.md). Previously granted MIT/CC0 and third-party permissions remain identified and preserved.

### PNPK + Auto-Drill integration

- **PNPK:** preview supported unsigned EVM transfers and approvals, compare simulated effects with policy, and produce a transaction-bound assessment receipt before user approval.
- **Auto-Drill:** plan region-scoped shared-capacity leases and reconcile actual signed usage, invoices and settlement evidence. Lease availability or a successful simulation does not prove income or payment.
- **Commercial model:** $0 upfront capacity rent; 350 bps / 3.5% SKYGRID and 9,650 bps / 96.5% capacity-owner accounting shares of verified operating revenue. Where Michael Vincent Patrick is both software and capacity owner, both shares are attributable to him; this does not create an external partner payout or double the revenue.
- **Payment status:** missing, stale, contradictory or unverified payment evidence blocks a paid-use assessment. Unpaid/partially paid use remains visible for reconciliation. No automatic bank charge, wallet signature, payout or compute activation is introduced.

See [PNPK integration notes](docs/integrations/pnpk-integration.md), [transaction-preview setup](docs/pnpk-transaction-preflight.md), and [Auto-Drill lease-use integration](docs/integrations/autodrill-lease-use.md). These features are under review in [PR #252](https://github.com/MVPuknowme/Aura-core/pull/252); no claim of live deployment or paid revenue follows from the README.

## What it is

**SKYGRID is a phone-first emergency data on-ramp/off-ramp.**

It watches live network conditions, detects degradation, and helps preserve continuity data through approved fallback paths. When a route weakens, SKYGRID can prompt the user with a clear **YES / NO** decision to move into a safer path.

The system does **not** blindly move data. It follows **PNPK policy**, Aura-Core AI trust decisions, Auto-Drill space checks, leasee device-owner quorum, and fail-closed guardrails.

## Public article

For public-facing readers, start here:

- [SKYGRID Dispatcher Public Demo](https://aurcore.skygrid-protocol.net/articles/skygrid-dispatcher-public-demo)

This article explains the Dispatcher demo in plain language for partners, community readers, infrastructure collaborators, and non-technical visitors.

## What SKYGRID does

SKYGRID helps answer one question:

**When the network is failing, where can this emergency data safely go?**

It combines:

- Live signal checks
- PNPK policy routing
- Aura-Core AI decisioning
- Auto-Drill partitioned space
- Leasee device-owner quorum
- Emergency on/off controls
- Fail-closed security

## v1 capabilities

- Mobile-first dispatcher UI
- Live ping checks against regional endpoints
- Network health scoring: RTT, jitter, packet loss
- Transport tiles for WiFi, Cellular, LoRa mesh, Tor, and Satellite
- Real browser-side signal checks for reachable internet paths
- Simulated LoRa/Tor/Satellite layers for v1
- AI-generated handoff rationale
- YES / NO emergency handoff prompt
- 10-second auto-cancel safety ring
- Incident log with AI summaries
- Scenario panel for outage drills
- `/api/agent/signals` contract for future device/daemon telemetry

## Trust model

SKYGRID routes only when the trust conditions agree:

- PNPK policy approves
- Owner approval is present
- Emergency operator approval is present when required
- Leasee neighbor quorum agrees
- Route is available
- Partitioned save space is available
- Ramp/node path is approved
- Unsafe movement is blocked

If any condition is missing, SKYGRID fails closed.

## Core pages

**`/`**  
Arm dispatcher, view system state, start live signal checks.

**`/dispatch`**  
Active route, transport tiles, signal status, handoff prompt.

**`/incidents`**  
Timeline of degradations, decisions, route changes, and AI summaries.

**`/scenarios`**  
Simulated outage drills for ISP failure, power loss, hurricane/cellular loss, DNS censorship, LoRa, and satellite fallback.

**`/settings`**  
Thresholds, ping targets, transport toggles, and agent endpoint contract.

