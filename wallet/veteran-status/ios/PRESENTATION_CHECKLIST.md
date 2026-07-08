# iOS presentation checklist

Use this checklist before showing the Veteran Status Wallet pass to Apple/iOS developers.

## Required presentation posture

- Present this as a **PassKit pilot**, not as an official government ID.
- Say "Veteran Status pass" or "verified-status pass," not "VA ID" or "DoD ID."
- Use demo identity data only.
- Do not display screenshots of real veteran IDs or real government cards.
- Keep the QR/barcode payload to an opaque token or verification URL.

## iOS setup

- Xcode installed.
- New iOS SwiftUI app target created.
- Files from `wallet/veteran-status/ios/VeteranWalletApp/` copied into the app target.
- Wallet capability enabled.
- Entitlements include the Pass Type Identifier.
- `WalletPassService.swift` points to an HTTPS pass server, not localhost.
- Run on a physical iPhone for Wallet behavior.

## Backend setup

- `wallet/veteran-status/server/.env` created from `.env.example`.
- `PASS_TYPE_IDENTIFIER` begins with `pass.`.
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
