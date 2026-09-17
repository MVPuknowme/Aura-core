# Speak Native Self-Connection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone native SwiftUI self-connection surface for Speak with user-triggered allowlisted BLE sensor discovery, read-only HealthKit reference access, explicit self-session confirmation, and a fail-closed experimental inference/communication gate.

**Architecture:** Keep platform-neutral sensor models, parsers, state transitions, and inference gating in a Swift package that can be tested without Apple frameworks. Add a thin iOS application layer for SwiftUI, CoreBluetooth, and HealthKit. BLE Heart Rate Service is the initial restricted physiology profile; experimental neural profiles require explicit documented service/characteristic definitions and may not be inferred from heart-rate data.

**Tech Stack:** Swift 6, Swift Package Manager, XCTest, SwiftUI, CoreBluetooth, HealthKit, XcodeGen, iOS/iPadOS 17+

**Spec:** `docs/superpowers/specs/2026-09-16-speak-native-self-connection-design.md`

## Global Constraints

- Speak remains standalone proprietary software owned by Michael Vincent Patrick; no Aura-Core/SKYGRID product identity is inherited.
- Native source lives under `apps/speak/ios/` and uses the product name `Speak` only.
- iOS/iPadOS deployment target is 17.0 or newer.
- BLE scanning starts only from an explicit **CONNECT TO ME** user action.
- Discovery is allowlisted by configured service UUID; initial physiology profile is Heart Rate Service `180D` / characteristic `2A37`.
- BLE/physiology does not prove human identity and does not directly measure thought content.
- HealthKit access is read-only and independent from BLE/session confirmation.
- Experimental Input defaults OFF; physiology-only profiles cannot satisfy a neural-input gate.
- Measurement, derived/inferred candidate, and user-confirmed communication remain distinct states.
- AWS IoT/cloud health upload is disabled for this phase.
- No raw user health data, BLE identifiers, credentials, or private participant datasets are committed.
- Physical-device connection remains unverified until run on an authorized iPhone/iPad with a supported sensor.

---

### Task 1: Portable Core Package and Heart-Rate Parser

**Files:**
- Create: `apps/speak/ios/Package.swift`
- Create: `apps/speak/ios/Sources/SpeakCore/SensorProfile.swift`
- Create: `apps/speak/ios/Sources/SpeakCore/SensorEnvelope.swift`
- Create: `apps/speak/ios/Tests/SpeakCoreTests/SensorProfileTests.swift`

**Interfaces:**
- Produces: `SensorKind`, `SensorProfile`, `SensorEnvelope`, `HeartRateMeasurementParser.decode(_:) throws -> SensorEnvelope`
- Initial profile: `SensorProfile.heartRate`

- [ ] **Step 1: Write parser tests first**

```swift
func testHeartRateProfileUsesAllowlistedServiceAndCharacteristic() {
    XCTAssertEqual(SensorProfile.heartRate.serviceUUID, "180D")
    XCTAssertEqual(SensorProfile.heartRate.measurementCharacteristicUUID, "2A37")
    XCTAssertEqual(SensorProfile.heartRate.kind, .physiologyReference)
}

func testHeartRateParserDecodes8BitMeasurement() throws {
    let envelope = try HeartRateMeasurementParser.decode(Data([0x00, 72]))
    XCTAssertEqual(envelope.numericValue, 72)
    XCTAssertEqual(envelope.unit, "bpm")
    XCTAssertEqual(envelope.kind, .physiologyReference)
}

func testHeartRateParserRejectsMalformedMeasurement() {
    XCTAssertThrowsError(try HeartRateMeasurementParser.decode(Data([0x01, 0x48])))
}
```

- [ ] **Step 2: Run tests and verify RED**

Run from `apps/speak/ios/`: `swift test --filter SensorProfileTests`
Expected: FAIL because `SensorProfile`, `SensorEnvelope`, and parser are not defined.

- [ ] **Step 3: Implement the minimal profile/envelope/parser**

Parser supports Bluetooth Heart Rate Measurement flags for 8-bit and 16-bit BPM, rejects truncated frames, labels every built-in heart-rate sample `.physiologyReference`, and never produces `.experimentalNeural`.

- [ ] **Step 4: Run tests and verify GREEN**

Run: `swift test --filter SensorProfileTests`
Expected: all parser/profile tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/speak/ios/Package.swift apps/speak/ios/Sources/SpeakCore apps/speak/ios/Tests/SpeakCoreTests/SensorProfileTests.swift
git commit -m "feat(speak): add portable sensor profile core"
```

### Task 2: Fail-Closed Self-Session State Machine and Inference Gate

**Files:**
- Create: `apps/speak/ios/Sources/SpeakCore/SelfConnectionState.swift`
- Create: `apps/speak/ios/Sources/SpeakCore/InferenceGate.swift`
- Create: `apps/speak/ios/Sources/SpeakCore/SessionReceipt.swift`
- Create: `apps/speak/ios/Tests/SpeakCoreTests/SelfConnectionStateTests.swift`
- Create: `apps/speak/ios/Tests/SpeakCoreTests/InferenceGateTests.swift`

**Interfaces:**
- Produces: `SelfConnectionState`, `ConnectionEvent`, `SelfConnectionReducer.reduce(state:event:)`, `InferenceGateDecision`, `InferenceGate.evaluate(_:)`, `SessionReceiptEvent`

- [ ] **Step 1: Write failing state/gate tests**

```swift
func testConnectedPhysiologyDoesNotConfirmIdentity() {
    var state = SelfConnectionState.initial
    state = SelfConnectionReducer.reduce(state: state, event: .sensorConnected(.heartRate))
    XCTAssertTrue(state.sensorConnected)
    XCTAssertFalse(state.sessionConfirmed)
    XCTAssertFalse(state.experimentalInputEnabled)
}

func testExperimentalInputRequiresExperimentalProfileAndConfirmation() {
    let context = InferenceGate.Context(sensorKind: .physiologyReference,
                                        sampleFresh: true,
                                        signalQuality: .good,
                                        sessionConfirmed: true,
                                        experimentalInputEnabled: true,
                                        confidence: 0.99)
    XCTAssertEqual(InferenceGate.evaluate(context), .blocked(.experimentalSensorRequired))
}

func testDisconnectRevokesPendingCandidate() {
    var state = SelfConnectionState.initial
    state.pendingCandidate = "candidate"
    state = SelfConnectionReducer.reduce(state: state, event: .sensorDisconnected)
    XCTAssertNil(state.pendingCandidate)
    XCTAssertFalse(state.sessionConfirmed)
    XCTAssertFalse(state.experimentalInputEnabled)
}
```

- [ ] **Step 2: Run and verify RED**

Run: `swift test --filter SelfConnectionStateTests && swift test --filter InferenceGateTests`
Expected: FAIL because reducer/gate types do not exist.

- [ ] **Step 3: Implement minimal reducer and gate**

Gate order is deterministic: disabled -> no/unsupported experimental sensor -> stale sample -> insufficient signal -> unconfirmed session -> insufficient confidence -> `candidateRequiresUserConfirmation`. No gate returns externally-sendable output.

- [ ] **Step 4: Run and verify GREEN**

Run: `swift test`
Expected: all portable tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/speak/ios/Sources/SpeakCore apps/speak/ios/Tests/SpeakCoreTests
git commit -m "feat(speak): add fail-closed self-session gate"
```

### Task 3: iOS BLE and HealthKit Adapters

**Files:**
- Create: `apps/speak/ios/Speak/BLESensorManager.swift`
- Create: `apps/speak/ios/Speak/HealthReferenceStore.swift`
- Create: `apps/speak/ios/Speak/SelfConnectionStore.swift`

**Interfaces:**
- `BLESensorManager.startUserInitiatedScan()` scans only service UUIDs from configured `SensorProfile`s.
- `BLESensorManager.stopScan()` halts discovery.
- `HealthReferenceStore.requestReadAuthorization()` requests read-only heart rate, HRV, height, body mass and body temperature only when corresponding HealthKit types are available.
- `SelfConnectionStore` maps adapter callbacks into the portable reducer; it does not invent session confirmation or sensor identity.

- [ ] **Step 1: Keep all Apple-framework logic outside `SpeakCore`**
- [ ] **Step 2: Implement CoreBluetooth manager with no scan in initializer**
- [ ] **Step 3: Restrict `scanForPeripherals` to configured service UUIDs and require explicit user selection before `connect`**
- [ ] **Step 4: Subscribe only to characteristics declared by selected profile; parse Heart Rate via `HeartRateMeasurementParser`**
- [ ] **Step 5: Implement read-only HealthKit authorization and category availability; request no write types**
- [ ] **Step 6: Route disconnect/parser/permission failure to reducer fail-closed events**

Verification on Linux is static only: `SpeakCore` must not import `CoreBluetooth`, `HealthKit`, or `SwiftUI`. Full compile verification is deferred to macOS/Xcode.

### Task 4: SwiftUI Self-Connection UI and Project Manifest

**Files:**
- Create: `apps/speak/ios/Speak/SpeakApp.swift`
- Create: `apps/speak/ios/Speak/SelfConnectionView.swift`
- Create: `apps/speak/ios/Speak/Info.plist`
- Create: `apps/speak/ios/Speak/Speak.entitlements`
- Create: `apps/speak/ios/project.yml`
- Create: `apps/speak/ios/README.md`

**Interfaces:**
- Primary action: `store.connectToMe()` called only by the **CONNECT TO ME** button.
- Candidate selection calls `store.selectSensor(id:)`.
- Session confirmation calls `store.confirmSelfSession()`.
- Experimental toggle calls `store.setExperimentalInputEnabled(_:)` and remains disabled for physiology-only profile.

- [ ] **Step 1: Build `SELF CONNECTION` accessibility-first screen with Disconnected / Sensor connected / Physiology available / Session confirmed states**
- [ ] **Step 2: Display Bluetooth, sensor profile, Health reference, signal quality, session, inference and final confirmation separately**
- [ ] **Step 3: Add explicit candidate-sensor selection; never auto-connect based on name/RSSI**
- [ ] **Step 4: Add HealthKit and Bluetooth usage descriptions and HealthKit entitlement only**
- [ ] **Step 5: Add XcodeGen manifest for `Speak` iOS 17 target plus `SpeakCore` package dependency**
- [ ] **Step 6: Document `xcodegen generate`, Xcode build/test, and physical-device acceptance steps**

### Task 5: Browser Branding Isolation

**Files:**
- Modify: `apps/speak/index.html`
- Modify: `apps/speak/app.js` only if runtime-visible branding exists there
- Modify: `apps/speak/README.md`

- [ ] **Step 1: Search exact browser branding strings `Speak · Aura` and `AURA · SPEAK`**
- [ ] **Step 2: Replace product-facing occurrences with `Speak` without changing unrelated runtime identifiers**
- [ ] **Step 3: Run existing browser tests**

Run from repository root: `node --test apps/speak/*.test.mjs`
Expected: all existing Speak browser tests PASS.

### Task 6: Verification and Handoff

**Files:**
- Create: `apps/speak/ios/VERIFICATION.md`

- [ ] **Step 1: Run `swift test` from `apps/speak/ios/` and capture exact result**
- [ ] **Step 2: Static-scan `SpeakCore` for forbidden Apple framework imports**

Run: `grep -RniE 'import (CoreBluetooth|HealthKit|SwiftUI)' apps/speak/ios/Sources/SpeakCore && exit 1 || true`
Expected: no matches.

- [ ] **Step 3: Static-scan source for embedded AWS/private-key/secret material**

Run: `grep -RniE '(AKIA[0-9A-Z]{16}|BEGIN (RSA|EC|OPENSSH) PRIVATE KEY|aws_secret_access_key)' apps/speak/ios`
Expected: no matches.

- [ ] **Step 4: Record macOS/Xcode verification as pending unless actually executed**
- [ ] **Step 5: Record physical BLE/HealthKit/device acceptance as pending unless actually executed**
- [ ] **Step 6: Review the implementation against every acceptance criterion in the approved spec before opening/refreshing a PR.**
