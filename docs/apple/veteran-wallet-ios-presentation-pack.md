# iOS presentation pack — Veteran Status Wallet pass

## One-line positioning

A standalone, privacy-preserving PassKit pilot that lets an eligible veteran add a minimal **Verified Veteran** status card to Apple Wallet without exposing sensitive source-record data.

## Meeting objective

Get Apple/iOS developer feedback on the PassKit direction, Wallet pass type, certificate setup, issuer labeling, biometric local-display gating, UX handoff, and the boundary between a normal signed Wallet pass and any future authorized government-backed identity credential.

This is intentionally separated from the SKYGRID Emergency Data On-Ramp and SKYGRID network console. SKYGRID remains the emergency/network operations product; this is a standalone Wallet status-pass service.

## What to show first

1. Open PR #132 and show that this is a standalone Wallet-service proposal.
2. Show the rebuilt secure-service proposal in `docs/apple/veteran-wallet-secure-service-proposal.md`.
3. Show the iOS flow in `wallet/veteran-status/ios/VeteranWalletApp/`.
4. Show that card details are blurred until Face ID or Touch ID succeeds.
5. Show the pass server in `wallet/veteran-status/server/server.mjs`.
6. Show that the QR code contains only an opaque verification URL.
7. Show the data minimization rule in `wallet/veteran-status/README.md`.
8. Show the certificate lane note: Pass Type ID certificate, not ALD, with a non-SKYGRID identifier.

## 5-minute demo script

### Minute 0–1: framing

"This is a standalone developer pilot for a Veteran Status pass in Apple Wallet. It is not a SKYGRID network-console feature and it is not presented as an official government credential. The purpose is to validate whether a signed PassKit card can safely carry minimal veteran-status proof for low-risk contexts."

### Minute 1–2: iOS client

"The SwiftUI client keeps Veteran Status details blurred by default. It uses iOS LocalAuthentication so Face ID or Touch ID must succeed before any details are unblurred or before the app fetches the signed `.pkpass` for Apple Wallet. The app never receives or stores raw biometric data."

### Minute 2–3: backend issuer

"The backend is a standalone Wallet pass issuer. It signs the pass using the Apple Wallet Pass Type ID certificate lane and does not use ALD certificates or SKYGRID network-console credentials."

### Minute 3–4: privacy and verification

"The pass carries only minimal status fields and an opaque QR verification token. Sensitive source records do not go into the pass or QR payload."

### Minute 4–5: ask

"We are asking Apple/iOS developers to validate the standalone PassKit architecture, biometric local-display gate, issuer labeling, Wallet pass style, and what would be required to move from a pilot pass to a formally authorized issuer workflow."

## Live demo order

1. Start pass server:

```bash
cd wallet/veteran-status/server
cp .env.example .env
npm install
npm run preflight
npm run dev
```

2. Check server:

```bash
curl -i http://localhost:8787/health
```

3. After certificates are configured, download a pass:

```bash
curl -o veteran-status.pkpass http://localhost:8787/api/wallet/veteran-pass
```

4. Run the SwiftUI app on a physical iPhone with the pass server exposed through an HTTPS tunnel.
5. Confirm details are blurred on launch.
6. Tap **Unlock Details** and complete Face ID or Touch ID.
7. Tap **Add Veteran Status to Apple Wallet**.
8. Present the native Apple add-pass sheet.
9. Background and reopen the app to confirm details lock again.

## Do not claim

- Do not claim this is a SKYGRID network-console feature.
- Do not claim this is an official government ID.
- Do not claim it replaces state/federal identity documents.
- Do not claim Apple has approved the credential.
- Do not show real veteran card screenshots or real IDs during the technical review.
- Do not claim the app stores or transmits biometric material.

## Safe claims

- It is a standalone PassKit pilot.
- It is privacy-preserving by design.
- It uses Wallet's signed `.pkpass` package format.
- It uses the Pass Type ID certificate lane.
- It avoids sensitive veteran data in the pass and barcode payload.
- It uses iOS LocalAuthentication so biometric success is required before details are displayed or the pass is fetched.
- It can support future authorized issuer verification, revocation, and update services.

## Questions for Apple/iOS developers

1. Is `generic` the right pass style for this early status-card concept?
2. Should the visible status wording be changed from "Verified Veteran" to a safer phrase for review?
3. What issuer labeling would prevent confusion with official credentials?
4. What pass update and revocation web-service endpoints should be implemented before pilot testing?
5. What App Store review concerns would Apple expect around veteran status, eligibility proof, biometric local display, and identity language?
6. Should biometric gating be required before every status display, before every pass fetch, or both?
7. What would be required if an authorized issuer participates later?

## Technical red flags to resolve before a real pilot

- No real eligibility provider integrated yet.
- Verification endpoint is a stub until server-side token records exist.
- Placeholder art must be replaced with authorized production assets.
- Official government marks must not be used without written authorization.
- The pass server needs production key management, rate limits, audit logs, and revocation support.
- iOS needs a real app target, provisioning profile, `NSFaceIDUsageDescription`, and TestFlight plan.
- Biometric lock/reset behavior needs physical-device review across Face ID and Touch ID devices.

## Handoff phrase

"We are not asking Apple to treat this as an approved government ID today, and we are not presenting it as part of SKYGRID network operations. We are asking whether this standalone PassKit architecture, including local biometric display gating, is the right privacy-preserving foundation for an authorized veteran-status pass workflow."
