# Speak Native Self-Connection Verification

**Branch:** `agent/rebuild-speak`  
**Scope:** repository/static and portable tests for the approved native self-connection implementation.

## Verified in the available execution environment

- **Portable Swift core: PASS** — `swift test` executed 13 XCTest cases with 0 failures. Coverage includes allowlisted Heart Rate profile/parser behavior, malformed sample rejection, physiology-only labeling, self-session reducer fail-closed transitions, refusal to enable experimental input from the built-in Heart Rate profile, inference confidence/user-confirmation gating, chained metadata receipts, and a known SHA-256 digest vector.
- **Browser regression tests: PASS** — `node --test apps/speak/*.test.mjs` executed 6 tests with 0 failures, including the standalone Speak `/health` endpoint.
- **Native Swift syntax parse: PASS** — `swiftc -frontend -parse Speak/*.swift` completed successfully. This checks Swift syntax only; it is not an Apple-SDK typecheck/build.
- **Info.plist: PASS** — parsed successfully as a plist.
- **Speak.entitlements: PASS** — parsed successfully as a plist.
- **XcodeGen manifest syntax: PASS** — `project.yml` parsed successfully as YAML.
- **Portable-core Apple-framework isolation: PASS** — no `SwiftUI`, `CoreBluetooth`, or `HealthKit` imports exist under `Sources/SpeakCore`.
- **Credential-pattern scan: PASS** — no AWS access-key pattern, private-key header, or `aws_secret_access_key` pattern was found under `apps/speak/ios` in the verified source mirror.
- **Standalone browser branding: PASS** — legacy `Speak · Aura`, `AURA · SPEAK`, and `Aura calibration` product-facing strings were removed from the verified browser target/test mirror. Browser title/eyebrow are `Speak`/`SPEAK`; calibration target is `Speak calibration one two three`.

## Acceptance-criterion status

- Native SwiftUI source exists under `apps/speak/ios/`: **implemented**.
- Primary UI contains `SELF CONNECTION` and explicit `CONNECT TO ME`: **implemented**.
- BLE discovery is user-triggered: **implemented in source**; `CBCentralManager` is not constructed until the explicit connect action.
- BLE discovery is allowlisted by supported service UUID: **implemented in source**, initially Heart Rate Service `180D`.
- User must select a discovered supported candidate before connection: **implemented in source**.
- Built-in Heart Rate Service measurement `2A37` is physiology/reference only and cannot enable experimental neural input: **implemented and portable-tested**.
- HealthKit authorization is read-only and independently requested: **implemented in source**; no write/share types requested.
- Unknown devices are not promoted to participant identity: **implemented by state/profile boundary**; session confirmation is explicit user assertion rather than biometric identity proof.
- Experimental Input defaults OFF and requires a confirmed experimental sensor profile: **implemented and portable-tested**.
- Measurement, inference, and user-confirmed output remain distinct: **implemented in state/UI/gate boundary**.
- Passing inference confidence still requires final user confirmation: **portable-tested**.
- Disconnect/session revocation fails closed and clears pending/experimental state: **portable-tested**.
- 0.8–4.0 Hz is documented only as optional downstream DSP configuration: **implemented in design/docs; no Bluetooth-frequency interpretation exists in the native source**.
- Browser product-facing branding is standalone Speak: **implemented and verified**.
- Raw HealthKit measurements are not shown on the main self-connection screen or uploaded by this phase: **implemented in source**. Health availability is reduced to category-presence state.
- No AWS IoT/cloud health upload path is enabled in this native phase: **implemented by omission/current architecture**.

## Pending Apple-platform gates

### macOS/Xcode build — PENDING

The available verification environment does not provide `xcodebuild` or `xcodegen`. Therefore the following have **not** been claimed as verified:

1. `xcodegen generate` against the installed Xcode toolchain.
2. Full Swift typecheck/compile against Apple `SwiftUI`, `CoreBluetooth`, and `HealthKit` SDKs.
3. Code-signing/entitlement acceptance for bundle identifier `com.mvpuknowme.speak`.
4. Simulator/device app launch through Xcode.

Run these on the authorized development Mac before release acceptance.

### Physical iPhone/iPad acceptance — PENDING

A remote/container environment cannot access the user's iPhone/iPad Bluetooth radio or authorize HealthKit. Real connection acceptance remains pending until an authorized physical device demonstrates:

1. App launches Disconnected with no user-requested scan yet.
2. `CONNECT TO ME` initiates the supported-sensor discovery path.
3. Unsupported devices are not presented as the participant.
4. A physically present supported Heart Rate Service sensor can be selected and connected.
5. Heart-rate samples remain physiology/reference data only.
6. HealthKit permission is independently requested and read-only.
7. Session confirmation requires an explicit user action.
8. Disconnect/revocation fails closed.
9. No candidate communication is automatically spoken or sent.
10. Any future experimental candidate that passes configured gates still requires explicit user confirmation before Speak output.

Until both pending sections are executed successfully, describe the implementation as **repository-verified / device-unverified**, not as a completed live sensor connection.
