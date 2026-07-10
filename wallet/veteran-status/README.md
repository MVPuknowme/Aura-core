# Apple Wallet Veteran Status PassKit pilot

This folder contains a developer-presentable iOS + backend implementation for a privacy-preserving **Veteran Status** pass in Apple Wallet.

It is intentionally framed as a standalone PassKit status pass. It is **not** part of the SKYGRID Emergency Data On-Ramp, SKYGRID network console, mesh routing console, validator tooling, or network operations interface. It is also **not** an official VA, DoD, military, or government identity credential unless an authorized issuer approves and provisions that credential flow.

## What this builds

- SwiftUI iOS screen with an **Add Veteran Status to Apple Wallet** action.
- Biometric-gated blur so Veteran Status details remain hidden until Face ID or Touch ID succeeds.
- PassKit integration through `PKPass` and `PKAddPassesViewController`.
- Standalone Node pass server that generates a signed `.pkpass` using Apple Wallet Pass Type ID credentials.
- Opaque QR verification URL, not raw personal data.
- Presentation docs for Apple developer review.

## Separation of concepts

| Concept | Scope | Interface |
| --- | --- | --- |
| SKYGRID Emergency Data On-Ramp | emergency, outage, responder, system-health, continuity, routing, proof-of-intake | network console / operations dashboard |
| Veteran Status Wallet Service | veteran-status verification, PassKit issuance, biometric local display, opaque QR verification | iOS app + Wallet issuer service |

Keep naming, UI copy, certificates, docs, and Apple presentation language separate.

## Presentation path

Use these files when preparing for an Apple/iOS developer review:

- `docs/apple/veteran-wallet-secure-service-proposal.md` — rebuilt secure service proposal and separation of concepts.
- `docs/apple/veteran-wallet-ios-presentation-pack.md` — meeting positioning, 5-minute script, demo order, safe claims, and Apple questions.
- `docs/apple/veteran-wallet-passkit-brief.md` — architecture and privacy brief.
- `docs/apple/veteran-wallet-presentation-outline.md` — short meeting outline.
- `wallet/veteran-status/ios/PRESENTATION_CHECKLIST.md` — iOS/device/server checklist before showing the demo.

For the meeting, keep the language precise: this is a **standalone PassKit veteran-status pilot**, not an approved government ID and not a SKYGRID console feature. The specific ask is for feedback on Wallet architecture, issuer wording, pass style, biometric local-display gating, privacy posture, revocation/update expectations, and the authorization path for any future official issuer flow.

## Data minimization rule

The Wallet pass may display only low-risk status fields after biometric unlock:

- Display name, after authenticated enrollment.
- Verified Veteran status.
- Branch/service summary, only when authorized.
- Issuer name.
- Expiration/revalidation date.
- Opaque verification token or URL.

Do **not** place sensitive source-record data, benefit data, medical data, account data, government identifiers, raw document images, or biometric material in the pass, barcode, serial number, logs, screenshots, or demo fixtures.

## Biometric local-display gate

The iOS client keeps Veteran Status details blurred by default. It uses iOS `LocalAuthentication` so Face ID or Touch ID must succeed before details are unblurred or before the app fetches the signed Wallet pass.

The app does not receive or store raw biometric data; iOS returns only local authentication success or failure.

When the app leaves the foreground, the view locks again, clears any prepared pass, and hides the add-pass sheet.

## iOS quick start

1. Open Xcode.
2. Create a new iOS app project named `VeteranWalletApp`.
3. Add the Wallet capability.
4. Make sure `NSFaceIDUsageDescription` is present in the target `Info.plist`.
5. Copy files from `ios/VeteranWalletApp/` into the Xcode app target.
6. In `WalletPassService.swift`, replace `passBaseURL` with your standalone Wallet pass issuer HTTPS host.
7. Run on a physical iPhone for Wallet add-pass and biometric testing.

The iOS app calls after biometric unlock:

```text
GET /api/wallet/veteran-pass
Accept: application/vnd.apple.pkpass
Authorization: Bearer <authenticated-session-token>
```

## Server quick start

```bash
cd wallet/veteran-status/server
cp .env.example .env
npm install
npm run preflight
npm run dev
```

Health check:

```bash
curl -i http://localhost:8787/health
```

Pass download after certificate configuration:

```bash
curl -o veteran-status.pkpass http://localhost:8787/api/wallet/veteran-pass
```

## Apple certificate lane

Use the Apple Wallet **Pass Type ID certificate** lane with a non-SKYGRID identifier for this separate Wallet service:

```bash
mkdir -p wallet/veteran-status/server/certs
cd wallet/veteran-status/server/certs

openssl genrsa -out pass.key 2048
openssl req -new \
  -key pass.key \
  -out veteran-pass.certSigningRequest \
  -subj "/emailAddress=YOUR_APPLE_DEVELOPER_EMAIL, CN=Veteran Status Wallet Pass, C=US"
```

Then in Apple Developer:

1. Register a Pass Type Identifier, for example `pass.net.mvpuknowme.veteranstatus`, or another non-SKYGRID identifier controlled by the Apple Developer account.
2. Create a Pass Type ID Certificate using `veteran-pass.certSigningRequest`.
3. Download Apple’s `pass.cer` and the Apple WWDR intermediate certificate.
4. Convert them to PEM:

```bash
openssl x509 -inform DER -in pass.cer -out pass.pem
openssl x509 -inform DER -in AppleWWDRCAG4.cer -out wwdr.pem
chmod 600 pass.key
```

Do **not** use ALD / App License Delivery encryption or signing certificates for this PassKit pass.

## Production hardening checklist

- Use HTTPS only.
- Require authenticated enrollment before pass issuance.
- Verify veteran status through an authorized identity/eligibility provider.
- Require local biometric unlock before showing status details or fetching a personalized pass.
- Issue short-lived pass download sessions.
- Store token-to-status mapping server-side.
- Add revocation/update support through the Apple Wallet web service endpoints.
- Add consent and issuance audit logs.
- Replace placeholder art with authorized brand assets.
- Keep official government seals/marks out unless authorized.
- Keep all certificates, keys, `.p12`, `.pem`, and `.env` files out of Git.
