# Veteran Status in Apple Wallet — developer presentation brief

## Executive summary

This implementation demonstrates a privacy-preserving way to let a verified veteran add a **Veteran Status** card to Apple Wallet using PassKit. The pass is designed as a minimal status credential for a pilot or authorized issuer workflow, not as a replacement for a VA, DoD, state, or federal identity document.

## Why this matters

Veterans often need to prove service status in low-risk contexts such as discounts, community access, event entry, or support-program enrollment. A Wallet pass can reduce friction while avoiding exposure of sensitive information.

## Proposed flow

1. User authenticates in an iOS app.
2. Backend verifies veteran status through an authorized eligibility provider.
3. Backend creates a signed `.pkpass` with an Apple Wallet Pass Type ID certificate.
4. iOS presents `PKAddPassesViewController` so the user can add the pass to Wallet.
5. The QR code contains only an opaque verification URL.
6. The verification endpoint returns minimal status metadata and never exposes sensitive profile details.

## Privacy position

The pass intentionally excludes:

- DoD ID number.
- Disability rating.
- SSN.
- Date of birth.
- DD-214 content.
- Claim data.
- Medical or benefit data.
- Raw VA account details.

The QR/barcode payload is an opaque token or URL. Server-side records map that token to the current verification state.

## Apple Wallet implementation notes

- iOS uses `PKPass(data:)` to parse signed pass data.
- iOS uses `PKAddPassesViewController` to display Apple’s native add-pass sheet.
- Backend signs the `.pkpass` package with an Apple Wallet Pass Type ID certificate.
- ALD / App License Delivery certificates are not used.
- The pass uses `sharingProhibited: true` as a defense-in-depth setting; server-side revocation remains required.

## Presentation readiness additions

- Use `docs/apple/veteran-wallet-ios-presentation-pack.md` for the five-minute script, safe claims, and Apple/iOS review questions.
- Use `wallet/veteran-status/ios/PRESENTATION_CHECKLIST.md` before showing the iPhone demo.
- Run `npm run preflight` in `wallet/veteran-status/server` before starting the pass signer.

## Production requirements before release

- Authorized issuer approval and legal review.
- Verified enrollment provider and consent records.
- Pass update/revocation web service.
- Key management and certificate rotation plan.
- App Store privacy disclosures.
- Accessibility review.
- Security review for token generation, storage, and verification responses.

## Files added in this repo

- `wallet/veteran-status/ios/VeteranWalletApp/` — SwiftUI + PassKit app files.
- `wallet/veteran-status/server/` — standalone Node pass-signing server.
- `wallet/veteran-status/README.md` — build/run instructions and certificate steps.
- `docs/apple/veteran-wallet-passkit-brief.md` — this Apple developer presentation brief.
- `docs/apple/veteran-wallet-ios-presentation-pack.md` — presentation script and meeting pack.
