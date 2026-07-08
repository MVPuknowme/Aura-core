# iOS presentation checklist

Use this checklist before showing the Veteran Status Wallet pass to Apple/iOS developers.

## Required presentation posture

- Present this as a **standalone PassKit pilot**, not as a SKYGRID console feature.
- Say "Veteran Status pass" or "verified-status pass," not "VA ID" or "DoD ID."
- Use demo identity data only.
- Do not display screenshots of real veteran IDs or real government cards.
- Keep the QR/barcode payload to an opaque token or verification URL.
- Explain that biometrics are handled locally by iOS; the app never receives or stores raw Face ID / Touch ID data.

## Concept separation check

- Do not open or present the SKYGRID Emergency Data On-Ramp console for this demo.
- Do not describe the Wallet service as a network function, validator function, emergency on-ramp, or mesh-routing feature.
- Confirm issuer labels say `Veteran Status Wallet Pilot` or another non-SKYGRID issuer name.
- Confirm the Pass Type Identifier is non-SKYGRID, for example `pass.net.mvpuknowme.veteranstatus` or another controlled identifier.

## iOS setup

- Xcode installed.
- New iOS SwiftUI app target created.
- Files from `wallet/veteran-status/ios/VeteranWalletApp/` copied into the app target.
- Wallet capability enabled.
- LocalAuthentication framework available.
- Entitlements include the Pass Type Identifier.
- `Info.plist` includes `NSFaceIDUsageDescription`.
- `WalletPassService.swift` points to an HTTPS standalone Wallet pass server, not localhost and not a SKYGRID network-console route.
- Run on a physical iPhone for Wallet and biometric behavior.

## Biometric privacy gate test

- Launch the app and confirm card details are blurred by default.
- Confirm the app asks for Face ID or Touch ID before showing Veteran Status fields.
- Confirm tapping **Unlock Before Adding to Wallet** authenticates before fetching the pass.
- Send the app to the background and reopen it; details should be locked again.
- Confirm no sensitive details appear in screenshots, previews, logs, or QR/barcode payloads before biometric unlock.

## Backend setup

- `wallet/veteran-status/server/.env` created from `.env.example`.
- `PASS_TYPE_IDENTIFIER` begins with `pass.` and does not use SKYGRID naming.
- `TEAM_IDENTIFIER` is set to the Apple Developer Team ID.
- `PUBLIC_BASE_URL` uses HTTPS for phone testing.
- `PASS_CERT_PATH`, `PASS_KEY_PATH`, and `WWDR_CERT_PATH` point to local files.
- Real certs/keys are not committed.
- `npm run preflight` passes.
- `/health` returns 200.
- `/api/wallet/veteran-pass` returns `application/vnd.apple.pkpass` once certs are configured.

## Demo runbook

```bash
cd wallet/veteran-status/server
npm install
npm run preflight
npm run dev
```

Then test:

```bash
curl -i http://localhost:8787/health
curl -i http://localhost:8787/api/wallet/veteran-pass
```

For iPhone testing, expose the pass server through a trusted HTTPS tunnel and update `passBaseURL` in `WalletPassService.swift`.

## Stop conditions

Do not continue the demo if:

- The demo is being described as a SKYGRID network-console function.
- Veteran Status details are visible before biometric authentication.
- The pass contains real sensitive data.
- The QR/barcode contains raw personal data.
- The pass uses official VA/DoD/government marks without authorization.
- The pass server is using ALD certificates instead of the Apple Wallet Pass Type ID certificate.
- The add-pass sheet does not appear on a physical iPhone.

## Apple review questions to have ready

- Is this pass style appropriate for a veteran-status card?
- What language prevents confusion with official identity credentials?
- What update/revocation endpoints should be implemented before pilot issuance?
- What App Store privacy disclosures and review risks should be addressed?
- What authorization path is required for any future government-backed credential flow?
- Should the biometric blur/unlock gate be required before every pass display, every pass fetch, or both?
- Does the separation from SKYGRID network-console functions look clear enough for review?
