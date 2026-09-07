# Aura Presence v0 in the AuraShield target

Aura Presence v0 is the smallest usable native Aura check-in screen for MVP-81. It is hosted in the existing `AuraShield` iOS target so it can be opened and demonstrated without creating another application target.

## Screen behavior

- Opens as `Ready` on an iPhone-sized viewport.
- **Come see me** opens the editable check-in field and changes the state to `Listening`.
- **Send check-in** validates a local message, changes the state to `Responding`, and shows an on-device response.
- An unavailable session enters `Offline`, preserves the draft, disables submission, and states that nothing was sent.
- Check-ins are limited to 280 characters.

The screen explicitly describes Aura as a digital support presence. It does not imply physical presence or impersonate a real person.

## Safety boundary

Aura Presence v0 has no network client, backend integration, cloud persistence, analytics, payment, wallet, settlement, signing, emergency dispatch, or production-routing behavior. The check-in exists only in the in-memory view state and disappears when the app closes.

The pre-existing `AuraShieldNumberStore.swift` and Call Directory extension scaffold remain in the repository, but the MVP-81 root screen does not invoke them.

## Generate and run the iOS project

Requirements: Xcode 16 or newer and XcodeGen.

```bash
cd ios/AuraShield
xcodegen generate
open AuraShield.xcodeproj
```

Choose an iPhone simulator and run the `AuraShield` scheme. The app display name is **Aura**.

Use the `Offline` SwiftUI preview in `ContentView.swift` to review the fail-closed presentation without adding a fake production connectivity control.

## Test the state model

The pure state model is also exposed as a local Swift package so it can be tested without building the UI:

```bash
swift test --package-path ios/AuraShield
```

GitHub Actions runs the model tests and simulator build for every pull request that changes the AuraShield target.
