# Veteran Status in Apple Wallet — developer presentation brief

## Executive summary

This implementation demonstrates a privacy-preserving way to let a verified veteran add a **Veteran Status** card to Apple Wallet using PassKit. The pass is designed as a minimal status credential for a pilot or authorized issuer workflow, not as a replacement for a government identity document.

This is a standalone Wallet status-pass service. It is separate from the SKYGRID Emergency Data On-Ramp, SKYGRID network console, mesh routing console, validator tooling, and network operations interface.

## Why this matters

Veterans often need to prove service status in low-risk contexts such as discounts, community access, event entry, or support-program enrollment. A Wallet pass can reduce friction while avoiding exposure of sensitive information.

## Proposed flow

1. User authenticates in an iOS app.
2. iOS keeps Veteran Status details blurred until Face ID or Touch ID succeeds through LocalAuthentication.
3. Backend verifies veteran status through an authorized eligibility provider.
4. Backend creates a signed `.pkpass` with an Apple Wallet Pass Type ID certificate.
5. iOS presents `PKAddPassesViewController` so the user can add the pass to Wallet.
6. The QR code contains only an opaque verification URL.
7. The verification endpoint returns minimal status metadata and never exposes sensitive profile details.

## Privacy position

The Wallet pass is a minimal status claim, not an identity-data container. It should exclude sensitive source-record data, benefit data, medical data, account data, government identifiers, raw document images, and biometric material.

The QR/barcode payload is an opaque token or URL. Server-side records map that token to the current verification state.

The iOS client does not receive or store raw biometric material. Face ID / Touch ID is used only as a local unlock gate before details are unblurred or before the pass is fetched.

## Apple Wallet implementation notes

- iOS uses `PKPass(data:)` to parse signed pass data.
- iOS uses `PKAddPassesViewController` to display Apple’s native add-pass sheet.
- iOS uses `LocalAuthentication` to keep status details blurred until biometric unlock succeeds.
- Backend signs the `.pkpass` package with an Apple Wallet Pass Type ID certificate.
- ALD / App License Delivery certificates are not used.
- The pass uses `sharingProhibited: true` as a defense-in-depth setting; server-side revocation remains required.
- Pass Type Identifier and organization naming should remain separate from SKYGRID network-console identifiers.

## Presentation readiness additions

- Use `docs/apple/veteran-wallet-secure-service-proposal.md` for the secure standalone service proposal.
- Use `docs/apple/veteran-wallet-ios-presentation-pack.md` for the five-minute script, safe claims, and Apple/iOS review questions.
- Use `wallet/veteran-status/ios/PRESENTATION_CHECKLIST.md` before showing the iPhone demo.
- Confirm `NSFaceIDUsageDescription` is in the iOS target `Info.plist`.
- Run `npm run preflight` in `wallet/veteran-status/server` before starting the pass signer.

## Production requirements before release

- Authorized issuer approval and legal review.
- Verified enrollment provider and consent records.
- Pass update/revocation web service.
- Key management and certificate rotation plan.
- App Store privacy disclosures.
- Accessibility review.
- Security review for token generation, storage, verification responses, and biometric lock/reset behavior.

## Files added in this repo

- `wallet/veteran-status/ios/VeteranWalletApp/` — SwiftUI + PassKit app files.
- `wallet/veteran-status/server/` — standalone Node pass-signing server.
- `wallet/veteran-status/README.md` — build/run instructions and certificate steps.
- `docs/apple/veteran-wallet-passkit-brief.md` — this Apple developer presentation brief.
- `docs/apple/veteran-wallet-secure-service-proposal.md` — secure standalone service proposal.
- `docs/apple/veteran-wallet-ios-presentation-pack.md` — presentation script and meeting pack.
