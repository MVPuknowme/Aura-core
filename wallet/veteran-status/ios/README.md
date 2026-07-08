# iOS PassKit demo app

Copy `VeteranWalletApp/` into a new Xcode iOS app target.

Recommended target settings:

- iOS 16+ for this sample.
- SwiftUI lifecycle.
- Wallet capability enabled.
- LocalAuthentication framework available.
- Entitlements file based on `VeteranWalletApp.entitlements`.
- `NSFaceIDUsageDescription` present from `Info.plist`.
- Physical iPhone for Wallet add-pass and biometric testing.

Update `WalletPassService.swift` before testing:

```swift
var passBaseURL: URL = URL(string: "https://your-pass-server.example")!
```

The endpoint must return a properly signed `.pkpass` with content type:

```text
application/vnd.apple.pkpass
```

Simulator is useful for UI layout, but final Wallet and biometric behavior should be tested on a real iPhone.

## Biometric privacy gate

`VeteranWalletView` keeps Veteran Status details blurred by default. The app uses `LocalAuthentication` so Face ID or Touch ID must succeed before details are unblurred or the pass is fetched for Apple Wallet.

The app does not receive or store raw biometric data. It receives only the local authentication success/failure result from iOS.

When the app leaves the foreground, the view locks again, clears the prepared pass, and hides the add-pass sheet.

## Presentation mode

Before showing this to Apple/iOS developers, work through `PRESENTATION_CHECKLIST.md`. Keep the demo language scoped to a PassKit status-pass pilot and avoid presenting it as an official VA, DoD, or government credential.
