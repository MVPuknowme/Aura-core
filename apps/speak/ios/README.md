# Speak Native iOS/iPadOS

This directory contains the standalone native Speak self-connection source target. Speak remains a proprietary program owned by Michael Vincent Patrick (MVP); repository placement does not change that ownership or make Speak part of Aura-Core/SKYGRID.

## Structure

- `Sources/SpeakCore/` — platform-neutral tested sensor models, Heart Rate parser, state reducer, inference gate, and metadata receipt chain.
- `Tests/SpeakCoreTests/` — XCTest coverage runnable with Swift Package Manager without Apple frameworks.
- `Speak/` — SwiftUI, CoreBluetooth, and HealthKit adapters.
- `project.yml` — XcodeGen manifest for the iOS/iPadOS 17+ app target.

## Portable core tests

On macOS or another Swift 6 environment:

```powershell
Set-Location .\apps\speak\ios
swift test
```

## Generate the Xcode project

Install XcodeGen on the Mac used for Apple-platform development, then:

```powershell
Set-Location .\apps\speak\ios
xcodegen generate
open .\Speak.xcodeproj
```

Select a valid development team/signing profile for bundle identifier `com.mvpuknowme.speak`, then build the `Speak` iOS target.

## Device acceptance

Use an authorized iPhone/iPad. A physical Bluetooth Heart Rate Service peripheral is required to verify the initial BLE reference profile. Apple Watch/Apple Health reference availability is requested through HealthKit rather than assumed to appear as a generic BLE Heart Rate peripheral.

Expected sequence:

1. Launch: state is **Disconnected** and no BLE discovery has been requested.
2. Tap **CONNECT TO ME**: iOS Bluetooth authorization/state becomes active and Speak scans only configured service UUIDs.
3. Choose a displayed supported sensor: Speak connects only after this selection.
4. Heart Rate Service samples are labeled physiological reference data; they do not enable Experimental Input.
5. Optionally request read-only Health access; HealthKit authorization is independent from BLE.
6. Explicitly confirm the current sensor session before the state becomes **Session confirmed**.
7. Experimental Input remains OFF for the built-in physiology-only Heart Rate profile.
8. Disconnecting/revoking permission/session fails closed and clears eligibility/pending candidate state.
9. No inferred candidate is spoken or sent without an explicit final user confirmation.

## Experimental sensor profiles

Do not add wildcard scanning. A future experimental profile must document its service UUID, characteristic UUID, measured channel, units, frame format, sample rate, and decoder version. The 0.8–4.0 Hz range, where scientifically appropriate, is downstream DSP configuration and never a Bluetooth frequency or evidence of direct thought measurement.

## Verification status

See `VERIFICATION.md`. Portable logic can be verified outside Xcode; CoreBluetooth/HealthKit compilation and actual connection acceptance require a Mac/Xcode and physical authorized device respectively.
