# iOS presentation pack — Veteran Status Wallet pass

## One-line positioning

A privacy-preserving PassKit pilot that lets an eligible veteran add a minimal **Verified Veteran** status card to Apple Wallet without exposing sensitive military, medical, benefit, or claim data.

## Meeting objective

Get Apple/iOS developer feedback on the PassKit direction, Wallet pass type, certificate setup, issuer labeling, UX handoff, and the boundary between a normal signed Wallet pass and any future authorized government-backed identity credential.

## What to show first

1. Open PR #131 and show the folder map.
2. Show the iOS flow in `wallet/veteran-status/ios/VeteranWalletApp/`.
3. Show the pass server in `wallet/veteran-status/server/server.mjs`.
4. Show that the QR code contains only an opaque verification URL.
5. Show the data minimization rule in `wallet/veteran-status/README.md`.
6. Show the certificate lane note: Pass Type ID certificate, not ALD.

## 5-minute demo script

### Minute 0–1: framing

"This is a developer pilot for a Veteran Status pass in Apple Wallet. It is not presented as an official VA or DoD credential. The purpose is to validate whether a signed PassKit card can safely carry minimal veteran-status proof for low-risk contexts."

### Minute 1–2: iOS client

"The SwiftUI client checks Wallet availability, fetches a signed `.pkpass` from the issuer backend, parses it with PassKit, and opens Apple's native add-pass sheet through `PKAddPassesViewController`."

### Minute 2–3: backend issuer

"The backend signs the pass using the Apple Wallet Pass Type ID certificate lane. It does not use ALD certificates. The pass server requires a pass certificate, private key, and WWDR certificate from local environment paths."

### Minute 3–4: privacy and verification

"The pass carries display name, verified-veteran status, service summary if authorized, issuer, expiration, and an opaque QR verification token. No DoD ID, disability rating, SSN, DOB, DD-214 content, claim data, medical data, benefit data, or VA account data goes into the pass or QR code."

### Minute 4–5: ask

"We are asking Apple/iOS developers to validate the PassKit architecture, review issuer labeling, confirm the right Wallet pass style, and identify what would be required to move from a pilot pass to a formally authorized issuer workflow."

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
5. Tap **Add Veteran Status to Apple Wallet**.
6. Present the native Apple add-pass sheet.

## Do not claim

- Do not claim this is an official VA ID.
- Do not claim this is an official DoD credential.
- Do not claim it replaces state/federal identity documents.
- Do not claim Apple has approved the credential.
- Do not show real veteran card screenshots or real IDs during the technical review.

## Safe claims

- It is a PassKit pilot.
- It is privacy-preserving by design.
- It uses Wallet's signed `.pkpass` package format.
- It uses the Pass Type ID certificate lane.
- It avoids sensitive veteran data in the pass and barcode payload.
- It can support future authorized issuer verification, revocation, and update services.

## Questions for Apple/iOS developers

1. Is `generic` the right pass style for this early status-card concept?
2. Should the visible status wording be changed from "Verified Veteran" to a safer phrase for review?
3. What issuer labeling would prevent confusion with official VA/DoD credentials?
4. What pass update and revocation web-service endpoints should be implemented before pilot testing?
5. What App Store review concerns would Apple expect around veteran status, eligibility proof, and identity language?
6. What would be required if an authorized government or VA-adjacent issuer participates later?

## Technical red flags to resolve before a real pilot

- No real eligibility provider integrated yet.
- Verification endpoint is a stub until server-side token records exist.
- Placeholder art must be replaced with authorized production assets.
- Official government marks must not be used without written authorization.
- The pass server needs production key management, rate limits, audit logs, and revocation support.
- iOS needs a real app target, provisioning profile, and TestFlight plan.

## Handoff phrase

"We are not asking Apple to treat this as an approved government ID today. We are asking whether this PassKit architecture is the right privacy-preserving foundation for an authorized veteran-status pass workflow."