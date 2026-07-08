# Apple developer meeting outline — Veteran Status Wallet pass

## 1. Opening

We are proposing a privacy-preserving PassKit status pass that lets eligible veterans carry a minimal **Verified Veteran** card in Apple Wallet.

## 2. Boundary

This is not presented as an official VA/DoD/government ID unless an authorized issuer approves the issuance flow. The pilot is a signed Wallet pass with minimal status data and an opaque verification token.

## 3. Demo path

- Open the iOS SwiftUI app.
- Tap **Add Veteran Status to Apple Wallet**.
- App downloads a signed `.pkpass` from the pass server.
- App presents `PKAddPassesViewController`.
- Wallet stores the pass.
- QR verification resolves to a minimal valid/invalid status result.

## 4. Security controls

- No DoD ID number.
- No disability rating.
- No SSN, claim data, medical data, or DD-214 contents.
- No raw identity data in the QR code.
- No official seals or government marks without authorization.
- Private keys and certificates are never committed.

## 5. Apple asks

- Validate PassKit implementation direction.
- Confirm preferred pass style and review concerns.
- Confirm expectations for veteran-status wording and issuer labeling.
- Discuss requirements if this graduates from pilot status pass to an authorized government-backed credential.

## 6. Link to full presentation pack

Use `docs/apple/veteran-wallet-ios-presentation-pack.md` for the full script, demo order, safe claims, stop conditions, and Apple/iOS review questions.
