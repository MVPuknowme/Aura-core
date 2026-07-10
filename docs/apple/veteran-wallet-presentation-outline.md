# Apple developer meeting outline — Veteran Status Wallet pass

## 1. Opening

We are proposing a standalone, privacy-preserving PassKit status pass that lets eligible veterans carry a minimal **Verified Veteran** card in Apple Wallet.

## 2. Boundary

This is not a SKYGRID network-console feature and should not be presented inside the SKYGRID Emergency Data On-Ramp interface. The pilot is a signed Wallet pass service with minimal status data, local biometric display gating, and an opaque verification token.

It is not presented as an official government ID unless an authorized issuer approves the issuance flow.

## 3. Demo path

- Open the iOS SwiftUI app.
- Confirm Veteran Status details are blurred by default.
- Unlock details with Face ID or Touch ID.
- Tap **Add Veteran Status to Apple Wallet**.
- App downloads a signed `.pkpass` from the standalone Wallet pass server.
- App presents `PKAddPassesViewController`.
- Wallet stores the pass.
- QR verification resolves to a minimal valid/invalid status result.

## 4. Security controls

- Details are blurred until local biometric authentication succeeds.
- No raw biometric data is received or stored by the app.
- Sensitive source-record data is excluded from the pass and QR payload.
- No raw identity data in the QR code.
- No official seals or government marks without authorization.
- Private keys and certificates are never committed.
- Pass Type Identifier and issuer labels stay separate from SKYGRID network identifiers.

## 5. Apple asks

- Validate PassKit implementation direction.
- Validate whether biometric gating should happen before display, before pass fetch, or both.
- Confirm preferred pass style and review concerns.
- Confirm expectations for veteran-status wording and issuer labeling.
- Confirm the separation between this Wallet service and the SKYGRID network console.
- Discuss requirements if this graduates from pilot status pass to an authorized issuer credential flow.

## 6. Link to full presentation pack

Use `docs/apple/veteran-wallet-ios-presentation-pack.md` for the full script, demo order, safe claims, stop conditions, and Apple/iOS review questions.
