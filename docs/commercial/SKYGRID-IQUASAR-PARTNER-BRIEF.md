# SKYGRID × iQuasar Partner Candidate Brief

## Status

- Partner: **iQuasar, LLC / iQuasar Software**
- SKYGRID state: **candidate**
- Company identity: **public sources confirmed**
- Engagement identity: **pending named-contact verification**
- PNPK authority: **not authorized**
- Production execution: **blocked until explicit approval**
- Private credentials/data: **no access by default**

## Verified public contact path

- Software contact phone: **+1 (703) 936-8827**
- Official company domains accepted for identity verification:
  - `@iquasar.com`
  - `@iquasar.us`
- Company: https://iquasar.com/
- Software services: https://software.iquasar.com/

Do not treat a phone call, text, social account, or personal email alone as partner authorization.

## Why this partner maps to SKYGRID

Publicly described iQuasar capabilities align with several current Aura-Core / SKYGRID needs:

- DevOps and CI/CD
- system and API integration
- cloud integration
- custom software development
- AI integration
- software testing and QA
- software team augmentation
- government-contractor support and cleared recruiting

This is a capability match only. It does not establish a contract, endorsement, security clearance for SKYGRID resources, or production authority.

## Proposed first engagement: SKYGRID Integration Reliability Sprint

### Goal

Produce a small, reviewable integration package that improves deployment reliability without weakening PNPK fail-closed controls.

### Review lanes

1. **CI/CD**
   - GitHub Actions dependency/runtime checks
   - Node 24 / pnpm 10.23.0 consistency
   - frozen-lockfile behavior
   - build artifact and deployment-boundary review

2. **Vercel / Next.js boundary**
   - keep the existing Aura-Core runtime separate from `apps/aura-work-agent`
   - validate a dedicated Next.js Vercel project/root directory
   - verify Web Analytics and Speed Insights only on the intended UI project
   - avoid changing production API runtime ownership as a side effect

3. **Cloud and API integration**
   - AWS / Cloudflare / public-route separation
   - API contract checks
   - fail-closed behavior when environment variables or upstream services are unavailable
   - no production failover activation during the review

4. **QA**
   - reproducible build
   - contract/unit test evidence
   - deployment smoke-test plan
   - issue list ranked by reproducibility and impact

## Required deliverables

- architecture/deployment boundary note
- proposed patch or PR for review
- CI evidence
- deployment smoke-test evidence
- list of secrets/configuration required, by **name only**
- rollback instructions
- unresolved-risk list

## Acceptance gates

The engagement does not advance to production access until all of the following are true:

1. Named iQuasar representative is independently verified through an official company email domain.
2. Scope and statement of work are explicitly approved.
3. Least-privilege access is documented.
4. No secret is committed to Git.
5. PNPK authorization receipt is issued for the approved scope.
6. Owner approval is recorded.
7. CI and required fail-closed tests pass.

## Stop conditions

Immediately stop downstream access or deployment if:

- identity is ambiguous;
- requested access exceeds the approved scope;
- credentials are requested through an unverified channel;
- a change weakens PNPK or synchronous preflight controls;
- a build/test gate fails;
- production execution would occur without owner approval.

## Source references

- https://software.iquasar.com/contact-us/
- https://software.iquasar.com/
- https://software.iquasar.com/system-integration-services/
- https://iquasar.com/news/iquasar-llc-outreach-verification-guidelines-to-ensure-trust-and-transparency/
