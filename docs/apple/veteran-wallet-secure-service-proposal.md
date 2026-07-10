# Veteran Status Wallet Service — secure service proposal

## Executive summary

Veteran Status Wallet Service is proposed as a privacy-preserving Apple Wallet service that lets an eligible veteran carry a minimal, verified status pass while keeping sensitive veteran, military, medical, benefit, and claim data out of the Wallet payload.

This proposal rebuilds the earlier PassKit pilot as a more secure and separate service: biometric-gated local display, minimal signed Wallet pass issuance, opaque QR verification, certificate custody controls, and server-side revocation/update readiness.

This service is conceptually and operationally separate from the SKYGRID Emergency Data On-Ramp and SKYGRID network console. SKYGRID remains for emergency/network functions; this Wallet service is an identity/status-pass workflow.

This is not an official VA, DoD, military, state, or federal identity credential unless an authorized issuer approves and provisions that credential flow.

## Product positioning

**Service name:** Veteran Status Wallet Service

**Service type:** Secure PassKit issuer and iOS companion flow for veteran-status verification.

**Concept boundary:** Standalone Wallet status-pass service. Not part of the SKYGRID network console, mesh routing console, emergency on-ramp dashboard, validator tooling, or network operations interface.

**Core promise:** prove only what needs to be proven, reveal only after local biometric unlock, and keep sensitive source records out of Apple Wallet.

**Best meeting phrase:** We are not asking Apple to treat this as an approved government ID today. We are asking whether this standalone PassKit architecture, including local biometric display gating, is the right privacy-preserving foundation for an authorized veteran-status pass workflow.

## What changed from the earlier proposal

The service is now more secure and more clearly separated in six important ways:

1. **Separate product boundary:** The Wallet service is not branded as or routed through the SKYGRID network console.
2. **Biometric-gated display:** Veteran Status details are blurred by default in the iOS app and are only unblurred after Face ID or Touch ID succeeds.
3. **Biometric-gated pass fetch:** The app authenticates locally before fetching the signed `.pkpass` from the issuer service.
4. **No biometric custody:** iOS performs the biometric check locally; the app receives only success or failure and never receives or stores raw biometric material.
5. **Foreground re-lock:** When the app leaves active state, it locks details again, clears the prepared pass, and closes the add-pass sheet.
6. **Accessibility-safe lock state:** Locked Veteran Status fields are hidden from the accessibility tree so screen readers do not expose protected details before unlock.

## Separation of concepts

Do not present this as a SKYGRID console feature.

| Concept | Scope | Interface |
| --- | --- | --- |
| SKYGRID Emergency Data On-Ramp | emergency, outage, responder, system-health, continuity, routing, proof-of-intake | network console / operations dashboard |
| Veteran Status Wallet Service | veteran-status verification, PassKit issuance, biometric local display, opaque QR verification | iOS app + Wallet issuer service |

This separation should remain visible in naming, docs, routes, Apple presentation language, certificate identifiers, and UI copy.

## Security architecture

```text
Veteran / iPhone
  |
  | 1. App launches with details blurred
  | 2. Face ID / Touch ID succeeds locally through LocalAuthentication
  v
Veteran Wallet iOS client
  |
  | 3. Fetch signed .pkpass after biometric unlock
  v
Veteran Status Pass Issuer API
  |
  | 4. Verify eligibility through authorized provider
  | 5. Generate minimal signed pass
  | 6. Store token mapping server-side
  v
Apple Wallet
  |
  | 7. Holds minimal status pass only
  v
Verifier
  |
  | 8. Scans opaque QR URL/token
  v
Veteran Status Verification API
  |
  | 9. Returns valid/invalid status only
```

## iOS local security controls

The iOS app should enforce these controls before any details are visible:

- Card preview starts blurred and redacted.
- Locked fields are inaccessible to taps and accessibility output.
- Face ID or Touch ID must succeed before display.
- Face ID or Touch ID must succeed before pass fetch.
- If authentication fails or is cancelled, details remain blurred.
- When the app backgrounds, the view locks and clears the prepared pass.
- `NSFaceIDUsageDescription` explains the local unlock purpose.

Important boundary: the service should not claim to blur content inside Apple Wallet itself. Once a pass is added to Wallet, the pass must already be data-minimized because Wallet display behavior is controlled by Apple Wallet. The secure design is therefore: blur in the companion app, issue only minimal fields to Wallet, and rely on Apple Wallet/device protections after issuance.

## Wallet pass data policy

The Wallet pass may contain only:

- Display name, after authenticated enrollment.
- Verified veteran-status label.
- Branch or service summary only if authorized and necessary.
- Issuer name.
- Expiration or revalidation date.
- Opaque verification token or URL.

The Wallet pass, barcode, QR code, serial number, logs, screenshots, fixtures, and demo data must not contain:

- DoD ID number.
- SSN.
- Date of birth.
- Disability rating.
- DD-214 content.
- Claim data.
- Medical data.
- Benefit data.
- VA account tokens.
- Raw identity-document images.
- Raw biometric data or biometric templates.

## Backend service controls

The issuer service should be treated as a high-trust signing and verification system.

Recommended controls:

- Store pass signing keys outside the repo.
- Use a non-SKYGRID Apple Pass Type Identifier for this Wallet service.
- Use Apple Wallet Pass Type ID certificates only; do not use ALD certificates.
- Use AWS KMS or an equivalent HSM-backed custody layer for encryption where available.
- Use Secrets Manager or equivalent secret storage for certificate paths, passphrases, and issuer configuration.
- Use CloudTrail or equivalent audit logging for administrative access and secret reads.
- Keep `.key`, `.pem`, `.p12`, `.cer`, `.certSigningRequest`, and `.env` files out of Git.
- Require authenticated enrollment before pass issuance.
- Issue short-lived pass download sessions.
- Rate-limit pass issuance and verification endpoints.
- Store token-to-status mappings server-side.
- Support revocation and pass updates before real pilot issuance.
- Keep verification responses minimal: valid/invalid, status label, issuer, expiration, and no sensitive profile data.

## Verification model

The QR code should carry only an opaque verification URL, for example:

```text
https://issuer.example/verify/veteran-status/{opaque_token}
```

A verifier response should be intentionally small:

```json
{
  "valid": true,
  "status": "verified_veteran",
  "issuer": "Veteran Status Wallet Pilot",
  "expires": "2027-01-01T00:00:00Z",
  "sensitive_profile_fields_returned": false
}
```

The verifier should never receive DoD ID, SSN, disability rating, DD-214 content, claim records, medical records, VA account data, or raw biometric material.

## Authorized issuer path

There are two service tiers:

### Tier 1 — Pilot status pass

A signed Apple Wallet pass issued by the standalone Veteran Status Wallet Pilot service for review, architecture validation, and partner discussion. It is explicitly not an official government credential.

### Tier 2 — Authorized issuer flow

A production path in which an approved issuer or authorized verification partner validates veteran status, governs branding/language, approves issuance rules, and defines revocation/update requirements.

## Apple/iOS review ask

Ask Apple/iOS developers to review:

1. Whether `generic` is the right pass style for the status-card pilot.
2. Whether biometric gating should be required before display, before pass fetch, or both.
3. Whether the wording “Verified Veteran” should be changed to reduce confusion with official ID credentials.
4. How issuer labeling should be displayed to avoid implying VA/DoD/government issuance.
5. What Wallet web-service update and revocation endpoints should be implemented before pilot testing.
6. What App Store privacy disclosures are required for veteran-status, eligibility proof, and local biometric unlock.
7. What technical and contractual requirements would apply if an authorized government or VA-adjacent issuer joins later.

## Implementation phases

### Phase 0 — Presentation-ready security pilot

- Keep PR as draft until physical-device testing is complete.
- Demonstrate blurred details before biometric unlock.
- Demonstrate Face ID / Touch ID unlock.
- Demonstrate signed `.pkpass` fetch after unlock.
- Demonstrate opaque QR verification route.
- Present docs and boundaries to Apple/iOS developers.

### Phase 1 — Xcode app container

- Move the Swift files into a real Xcode project.
- Configure Wallet capability and entitlements.
- Confirm `NSFaceIDUsageDescription` in the app target.
- Test Face ID and Touch ID devices.
- Add UI tests or manual QA scripts for locked/unlocked states.

### Phase 2 — Hardened issuer service

- Move pass signing to a managed service boundary.
- Add key custody, audit logs, and rate limiting.
- Add authenticated enrollment.
- Add token database and revocation.
- Add pass update endpoints.
- Add structured security logging.

### Phase 3 — Authorized verification integration

- Integrate approved eligibility verification.
- Add consent capture.
- Add issuer policy rules.
- Add legal/compliance review.
- Add production incident response plan.

## Demo success criteria

Before any Apple/iOS presentation, confirm:

- The presenter says this is standalone and separate from SKYGRID network functions.
- Details are blurred on launch.
- Details are not exposed through accessibility before unlock.
- Face ID or Touch ID is required before details show.
- Pass fetch is blocked until biometric unlock succeeds.
- Backgrounding the app re-locks the view and clears prepared pass data.
- Signed `.pkpass` returns `application/vnd.apple.pkpass`.
- QR contains only an opaque verification URL.
- No official government marks are used without authorization.
- No real veteran ID screenshots are shown.
- No sensitive fields appear in logs, pass JSON, QR payload, fixtures, or docs.

## Proposal conclusion

The rebuilt service is stronger because it treats veteran-status proof as a minimal, privacy-preserving claim rather than an identity-data container. The app gates local display with Face ID or Touch ID, the backend signs only minimal Wallet passes, the QR code exposes only an opaque verification token, and the production path is explicitly reserved for an authorized issuer model. This service stays separate from the SKYGRID Emergency Data On-Ramp and SKYGRID network console.
