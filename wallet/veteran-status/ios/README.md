# iOS PassKit demo app

Copy `VeteranWalletApp/` into a new Xcode iOS app target.

Recommended target settings:

- iOS 16+ for this sample.
- SwiftUI lifecycle.
- Wallet capability enabled.
- Entitlements file based on `VeteranWalletApp.entitlements`.
- Physical iPhone for Wallet add-pass testing.

Update `WalletPassService.swift` before testing:

```swift
var passBaseURL: URL = URL(string: "https://your-pass-server.example")!
```

The endpoint must return a properly signed `.pkpass` with content type:

```text
application/vnd.apple.pkpass
```

Simulator is useful for UI layout, but final Wallet behavior should be tested on a real iPhone.
