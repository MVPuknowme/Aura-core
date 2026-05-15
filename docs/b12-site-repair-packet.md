# Aura Sky / SKYGRID B12 Site Repair Packet

Operator: Michael Vincent Patrick / MVPuknowme
Target URL: http://aura-sky.skygridprotocol.b12io.com/
Prepared: 2026-05-14
Status: Repair instructions and B12-ready replacement content

## Current Failure

The target URL is not serving reliably. External fetch attempts reported a gateway failure, which means the request is failing at the hosting/domain-routing layer before page content can be validated.

Treat this as a routing/publish problem first, then a content/button QA pass second.

## Immediate Hosting Fix

1. In B12, open the SKYGRID / Aura Sky site dashboard.
2. Confirm the site is published, not just saved as a draft.
3. Confirm the active live site URL is one of these:
   - https://skygrid-gs3e.b12sites.com/
   - https://aura-sky-skygrid-protocol-staging.b12sites.com/
   - any current B12-provided live URL shown inside the B12 dashboard.
4. Do not promote `aura-sky.skygridprotocol.b12io.com` unless B12 confirms that subdomain is mapped and published.
5. If using a custom domain, point DNS to the exact B12-provided hostname and wait for SSL provisioning to complete.
6. Keep the GitHub health fallback active:
   - https://raw.githubusercontent.com/MVPuknowme/Aura-core/MVPuknowme/public/health.json

## Homepage Hero Replacement

Title:
SKYGRID

Subtitle:
Backup-ready decentralized infrastructure powered by Aura-Core™.

Body:
SKYGRID helps communities, device owners, builders, and partners prepare for internet, ISP, grid, and power failures by creating resilient edge routes, public-safe status checks, proof links, and pilot onboarding paths.

Primary CTA:
Start a Pilot -> #pilot-intake

Secondary CTA:
Check Status -> https://raw.githubusercontent.com/MVPuknowme/Aura-core/MVPuknowme/public/health.json

Tertiary CTA:
View Proof Trail -> https://github.com/MVPuknowme/Aura-core

## Required Sections

### 1. What SKYGRID Does

SKYGRID is a pilot infrastructure layer for practical backup connectivity, AI-assisted routing, Web3 readiness, local device participation, and proof-based deployment tracking.

Focus areas:
- Backup connectivity during ISP, grid, or power failure
- Web3 and Layer 2 routes made easier for mainstream users
- Local edge/device-owner participation
- Public-safe status and proof trails
- Solar, backup power, LoRa, satellite, coaxial, AC/DC, and local network options where feasible

### 2. Lease Your Node

Title:
Lease Your Node. Get Paid to Provide Compute Space.

Body:
Device owners, homeowners, and community partners can register interest in hosting future SKYGRID node capacity. Pilot participation may include status checks, local availability testing, uptime validation, and safe proof logging.

CTA:
Register Node Interest -> #pilot-intake

Safety note:
This is pilot/demo onboarding only. No production revenue, uptime, or payout guarantee should be displayed until contracts, monitoring, and payment rails are verified.

### 3. Status and Proof

Title:
System Status & Proof Trail

Body:
SKYGRID uses public-safe proof links and health checks to show what is live, what is still in pilot mode, and what needs review before production use.

Buttons:
- Check Status -> https://raw.githubusercontent.com/MVPuknowme/Aura-core/MVPuknowme/public/health.json
- View GitHub Proof -> https://github.com/MVPuknowme/Aura-core
- Website Functionality Map -> https://github.com/MVPuknowme/Aura-core/blob/MVPuknowme/docs/website-functionality-map.md

### 4. Pilot Intake

Title:
Start a SKYGRID Pilot

Suggested fields:
- Name
- Email
- Phone, optional
- City / State
- Lead Type
- Solar / Backup Setup
- Device Type
- Token / Network Interest
- Consent Confirmed
- Notes

Consent checkbox:
I agree to be contacted about SKYGRID / Aura-Core pilot testing.

Confirmation message:
Thank you — your SKYGRID pilot request was received. We will review the safest and simplest path for testing, proof links, and follow-up.

### 5. Feedback

Title:
Help Us Improve Reliability

Body:
Spend 3 to 5 minutes reviewing the site. Tell us what is clear, what feels confusing, and which buttons worked or failed.

CTA:
Give Feedback -> #feedback

## Button QA Checklist

- [ ] Start a Pilot routes to #pilot-intake or an intake form.
- [ ] Register Node Interest routes to #pilot-intake.
- [ ] Check Status opens the GitHub raw health JSON.
- [ ] View Proof Trail opens the GitHub repository.
- [ ] Give Feedback routes to #feedback or a form.
- [ ] Contact button uses a working form or mailto fallback.
- [ ] Mobile menu works on iPhone and iPad.
- [ ] No button points to the broken `aura-sky.skygridprotocol.b12io.com` URL until routing is repaired.

## Public-Safe Disclaimer

SKYGRID / Aura-Core is in pilot/demo validation. Public status indicators, proof links, and intake forms are intended for testing and partnership discovery only. Do not submit private keys, seed phrases, account passwords, or confidential financial data through public forms.

## B12 Builder Paste Prompt

Repair the SKYGRID / Aura-Core website. Use a clean futuristic layout with dark navy, cyan, violet, and soft white contrast. Make the page easy to understand on iPhone and iPad.

Replace broken or vague sections with:
- SKYGRID hero: Backup-ready decentralized infrastructure powered by Aura-Core™
- Explain backup connectivity for ISP/grid/power failures
- Add Lease Your Node section: get paid to provide compute space, but label as pilot/demo only until contracts and monitoring are verified
- Add Status and Proof section with GitHub health JSON and proof trail links
- Add Pilot Intake form with consent language
- Add Feedback form
- Wire every visible button to a working route or safe fallback
- Remove claims of production uptime or guaranteed revenue until verified
- Do not point any CTA to aura-sky.skygridprotocol.b12io.com until B12 confirms the domain is mapped and serving correctly

Use these routes:
Start a Pilot -> #pilot-intake
Register Node Interest -> #pilot-intake
Check Status -> https://raw.githubusercontent.com/MVPuknowme/Aura-core/MVPuknowme/public/health.json
View Proof Trail -> https://github.com/MVPuknowme/Aura-core
Website Functionality Map -> https://github.com/MVPuknowme/Aura-core/blob/MVPuknowme/docs/website-functionality-map.md
Give Feedback -> #feedback
