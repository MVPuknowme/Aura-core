# Speak: professional review and abuse-prevention boundary

Founder-directed requirements, October 1, 2026. Applies to SKYGRID-controlled Speak
deployments and comparable assistive-tool integrations. Abuse prohibitions apply
across device types, operating systems, apps, AI services, and contractors.

## Current containment

Speak activation is denied unconditionally in this change. A click, local approval
flag, DOM dataset, or custom event cannot enable speech output, recognition, or
calibration. Stop and OFF remain available even when browser termination APIs
throw. This is intentional containment while an approval system is absent.

No person is approved by this change. It is not an operating-system/network
firewall, a medical certification, or an authorization service. It cannot control
unrelated apps, modified source, browser extensions, or other people's devices.

## Requirements before introducing a grant path

1. Medical representation: verify the identity and relevant professional license
   of a qualified reviewer; record a signed assessment of the intended use,
   risks, restrictions, monitoring needs, and review period. A title or checkbox
   alone is insufficient. Assess the actual capabilities rather than assuming
   disability implies inability to consent.
2. Legal representation: verify a qualified legal professional and document
   review of consent, authority, privacy, accessibility, recourse, and conflicts.
   The affected person must be able to approve their advocate. Neither medical
   nor legal representatives acquire device-control or signing authority merely
   by reviewing the use.
3. User consent: obtain accessible, informed, specific, revocable consent.
   Record lawful representative authority only where applicable; never assume
   a family member or provider may consent on the person's behalf. Never use
   professional sign-off to override a refusal or revoked consent.
4. Scoped grant: bind the user, authenticated operator, app build, device/session,
   allowed capabilities, purpose, policy version, both signed reviews, consent
   record, expiry, and revocation status to a verifiable authorization receipt.
   A receipt is not proof that an action was performed.
5. Trusted enforcement: verify authorization at every relevant trusted execution
   boundary. Never accept unsigned browser flags or self-asserted role labels.
   Enforce least privilege, authenticated reviewers, integrity, expiry,
   revocation, and replay protection. Review changes to capability or intended
   use before reissuing approval.
6. Fail closed: missing, expired, ambiguous, revoked, or unverifiable approval
   denies activation. Loss of permission must terminate ongoing activity and
   reject late callbacks. No automatic grant, caregiver override, or background
   restart is permitted.
7. User control: Stop/OFF/revoke must remain accessible and cannot require a
   payment, professional approval, or a functioning network. Provide support
   and a safe transition for existing users; do not silently strand someone who
   relies on assistive communication.
8. Privacy: retain minimum necessary review metadata in access-controlled
   records; keep diagnoses, transcripts, credentials, and full legal/medical
   reports out of public blockchains and operational telemetry. Disclose actual
   audio processors before consent; browser recognition may use remote services.

## Abuse policy and accountability

No deployment may intentionally intimidate, manipulate, harass, psychologically
abuse, coerce debt payment, or deprive a person of housing or essential survival
needs. Professional review cannot authorize these acts. Apply confidential
reporting, evidence preservation, impartial review, anti-retaliation safeguards,
and the business plan's financial-redress process. Do not assert any particular
incident or perpetrator is established without evidence.

For external tools, obtain written provider obligations and appropriate platform
controls; do not claim SKYGRID can enforce a universal device firewall. Report
coverage and gaps honestly. These are company requirements, not a claim that
all accessibility tools legally require doctors and lawyers.

## Release verification

Run `node --test tests/speak-review-lock.test.mjs`. The tests exercise actual app
handlers with fake browser APIs, including forged enable signals and throwing
termination APIs. They do not establish real-device behavior, regulatory
approval, or successful operation of a future authorization backend.

Before merging/deploying, review the intentional loss of activation, notify
affected users, and arrange accessible support or continuity alternatives.
Before permitting use, implement the trusted grant/revocation service and test
scope mismatches, stale/replayed approvals, role spoofing, offline transitions,
and ongoing-session cancellation on supported devices.

## Regulatory context

FDA oversight of software depends on actual functions and intended use; this
professional-review policy is not FDA clearance. HIPAA applicability depends on
the entities and data involved, not the policy label. Professional counsel must
evaluate the intended deployment.

- [FDA software-function guidance](https://www.fda.gov/medical-devices/digital-health-center-excellence/device-software-functions-including-mobile-medical-applications)
- [HHS minimum-necessary guidance](https://www.hhs.gov/hipaa/for-professionals/privacy/guidance/minimum-necessary-requirement/index.html)
