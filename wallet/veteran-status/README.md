# Apple Wallet Veteran Status PassKit pilot

This folder contains a developer-presentable iOS + backend implementation for a privacy-preserving **Veteran Status** pass in Apple Wallet.

It is intentionally framed as a PassKit status pass. It is **not** an official VA, DoD, military, or government identity credential unless an authorized issuer approves and provisions that credential flow.

## What this builds

- SwiftUI iOS screen with an **Add Veteran Status to Apple Wallet** action.
- PassKit integration through `PKPass` and `PKAddPassesViewController`.
- Standalone Node pass server that generates a signed `.pkpass` using Apple Wallet Pass Type ID credentials.
- Opaque QR verification URL, not raw personal data.
- Presentation docs for Apple developer review.

## Presentation path

Use these files when preparing for an Apple/iOS developer review:

- `docs/apple/veteran-wallet-ios-presentation-pack.md` — meeting positioning, 5-minute script, demo order, safe claims, and Apple questions.
- `docs/apple/veteran-wallet-passkit-brief.md` — architecture and privacy brief.
- `docs/apple/veteran-wallet-presentation-outline.md` — short meeting outline.
- `wallet/veteran-status/ios/PRESENTATION_CHECKLIST.md` — iOS/device/server checklist before showing the demo.

For the meeting, keep the language precise: this is a **PassKit veteran-status pilot**, not an approved VA/DoD/government ID. The specific ask is for feedback on Wallet architecture, issuer wording, pass style, privacy posture, revocation/update expectations, and the authorization path for any future official issuer flow.

## Data minimization rule

The Wallet pass may display only low-risk status fields:

- Display name, after authenticated enrollment.
- Verified Veteran status.
- Branch/service summary, only when authorized.
- Issuer name.
- Expiration/revalidation date.
- Opaque verification token or URL.

Do **not** place these in the pass, barcode, serial number, logs, screenshots, or demo fixtures:

- DoD ID number.
- Disability rating.
- SSN.
- Date of birth.
- DD-214 content.
- VA claim data.
- Medical or benefit details.
- VA account tokens or session contents.

## iOS quick start

1. Open Xcode.
2. Create a new iOS app project named `VeteranWalletApp`.
3. Add the Wallet capability.
4. Copy files from `ios/VeteranWalletApp/` into the Xcode app target.
5. In `WalletPassService.swift`, replace `passBaseURL` with your HTTPS pass server.
6. Run on a physical iPhone for the Wallet add-pass sheet.

The iOS app calls:

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

Use the Apple Wallet **Pass Type ID certificate** lane:

```bash
mkdir -p wallet/veteran-status/server/certs
cd wallet/veteran-status/server/certs

openssl genrsa -out pass.key 2048
openssl req -new \
  -key pass.key \
  -out veteran-pass.certSigningRequest \
  -subj "/emailAddress=YOUR_APPLE_DEVELOPER_EMAIL, CN=SKYGRID Veteran Status Pass, C=US"
```

Then in Apple Developer:

1. Register a Pass Type Identifier, for example `pass.net.skygrid.veteranstatus`.
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
- Issue short-lived pass download sessions.
- Store token-to-status mapping server-side.
- Add revocation/update support through the Apple Wallet web service endpoints.
- Add consent and issuance audit logs.
- Replace placeholder art with authorized brand assets.
- Keep official government seals/marks out unless authorized.
- Keep all certificates, keys, `.p12`, `.pem`, and `.env` files out of Git.
