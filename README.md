# SKYGRID — Mobile AI Failover Dispatcher v1

## What it is

**SKYGRID is a phone-first emergency data on-ramp/off-ramp.**

It watches live network conditions, detects degradation, and helps preserve continuity data through approved fallback paths. When a route weakens, SKYGRID can prompt the user with a clear **YES / NO** decision to move into a safer path.

The system does **not** blindly move data. It follows **PNPK policy**, Aura-Core AI trust decisions, Auto-Drill space checks, leasee device-owner quorum, and fail-closed guardrails.

## Public article

For public-facing readers, start here:

- [SkyGrid Dispatcher Public Demo](articles/skygrid-dispatcher-public-demo.md)

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

## What v1 does not do

- It does not force OS-level network switching.
- It does not directly control Tor, LoRa, or Satellite hardware.
- It does not move private data without policy.
- It does not sign wallets or broadcast transactions.
- It does not execute payments.
- It does not enable production failover without future signed policy.

## Technical foundation

- TanStack Start
- Mobile-first responsive UI
- Browser-side ping engine
- Rolling 20-sample health windows
- Lovable AI for handoff rationale and post-mortems
- Auto-Drill for partitioned space simulation
- PNPK as the policy traffic layer
- Aura-Core AI as the trust decider inside PNPK law
- Fail-closed routing by default

## One-line summary

**SKYGRID is a PNPK-controlled emergency save/offload network where Aura-Core AI opens routes only when policy, approved space, owner consent, emergency operator approval, and leasee quorum agree.**