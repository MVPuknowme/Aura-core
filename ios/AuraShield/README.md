# Aura Shield iOS Review Scaffold

Aura Shield is a Swift/iOS starter module for managing a local list of unwanted contact sources and wiring that list into Apple's supported Call Directory flow.

## Scope

- SwiftUI starter app
- Shared App Group storage scaffold
- Call Directory Extension scaffold
- Local-only storage by default
- No cloud sync and no automatic outbound responses

## Xcode setup

1. Create or open an iOS app target named `AuraShield`.
2. Add these source files to the app target:
   - `AuraShieldApp.swift`
   - `ContentView.swift`
   - `AuraShieldNumberStore.swift`
3. Add a Call Directory Extension target named `AuraShieldCallDirectoryExtension`.
4. Add `AuraShieldCallDirectoryExtension/CallDirectoryHandler.swift` to the extension target.
5. Add App Groups capability to both targets:
   - `group.net.skygrid.aurashield`
6. Enable the extension on device:
   - Settings -> Phone -> Call Blocking & Identification -> Aura Shield

## Review notes

This PR intentionally keeps the extension handler as a scaffold. The next review step is to add the final CallKit load/reload implementation once the Xcode bundle identifiers and entitlements are confirmed.

Suggested bundle identifiers:

- App: `net.skygrid.AuraShield`
- Extension: `net.skygrid.AuraShield.CallDirectory`
