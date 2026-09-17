# Speak Native Self-Connection Design

**Program:** Speak  
**Owner:** Michael Vincent Patrick (MVP)  
**Status:** Approved design awaiting written-spec review before implementation

## Purpose

Add a native iPhone/iPad self-connection interface to the standalone proprietary Speak program. The feature is intended to let a Speak participant explicitly connect an authorized physiological/neural sensor, read locally authorized HealthKit reference data, establish a user-confirmed self session, and route documented sensor samples into Speak's experimental assistive-communication pipeline.

This design does not treat Bluetooth, Wi-Fi, Ethernet, ordinary RF traffic, heart rate, body dimensions, or temperature as proof of a person's identity or as direct thought measurement. Bluetooth is a transport. Neural or physiological inference requires a documented sensor source that actually measures the relevant signal.

## Ownership and isolation

Speak remains a standalone proprietary program owned by Michael Vincent Patrick. Its location inside the current repository is a development/hosting location only and does not make Speak a subsidiary, component, product line, or property of Aura-Core, SKYGRID, or another program or entity.

The native target lives under `apps/speak/ios/`. It must not inherit AuraShield branding, runtime identity, permissions, configuration, or product hierarchy.

## User experience

The primary native screen contains a **SELF CONNECTION** panel with these explicit states:

1. **Disconnected** — no sensor session exists.
2. **Sensor connected** — an explicitly selected supported BLE peripheral is connected.
3. **Physiology available** — locally authorized HealthKit and/or documented sensor-reference channels are available for session context.
4. **Session confirmed** — the user explicitly confirms that the selected sensor/session belongs to the current Speak session.

A large **CONNECT TO ME** button initiates the flow. Speak never starts a BLE scan merely because the application opened.

The interface must separately display:

- Bluetooth authorization/state.
- Selected sensor name/profile.
- Sensor connection state.
- Health-reference authorization/state.
- Available reference categories without exposing unnecessary raw values on the main screen.
- Experimental input state: OFF by default.
- Signal-quality state.
- Self-session state.
- Inference state.
- Final communication confirmation state.

The UI must use the name **Speak** only. Existing `Speak · Aura` / `AURA · SPEAK` browser branding is removed as part of this implementation.

## Native architecture

Create a native SwiftUI target at `apps/speak/ios/` with isolated components:

- `SpeakApp.swift` — native application entry point.
- `SelfConnectionView.swift` — accessibility-first self-connection UI.
- `SelfConnectionStore.swift` — authoritative connection/session state machine.
- `BLESensorManager.swift` — CoreBluetooth authorization, allowlisted discovery, connection, service discovery, and notification subscription.
- `SensorProfile.swift` — supported-service/characteristic schema and sample decoder boundary.
- `SensorEnvelope.swift` — normalized measured-sample envelope with source, units, timestamps, quality metadata, and profile version.
- `HealthReferenceStore.swift` — read-only HealthKit authorization and local reference availability.
- `InferenceGate.swift` — fail-closed transition rules for experimental candidate output.
- `SessionReceipt.swift` — local tamper-evident/auditable session-event representation without raw health data by default.
- `Info.plist` and `Speak.entitlements` — narrowly scoped Bluetooth/HealthKit permissions.
- `SpeakTests/` — state-machine, parser, and gate tests that do not require physical hardware.

Use XcodeGen with `apps/speak/ios/project.yml` as the declarative project manifest so the Xcode project can be generated reproducibly on macOS without committing a large hand-maintained project file. The initial deployment target is iOS/iPadOS 17 or newer.

## Initial supported sensor profiles

The first release includes one standards-based physiology transport profile so **CONNECT TO ME** can make a concrete, restricted discovery attempt without generalized BLE scanning:

- **BLE Heart Rate profile** — Bluetooth SIG Heart Rate Service UUID `0x180D`, with Heart Rate Measurement characteristic UUID `0x2A37`. Samples from this profile are labeled physiological reference data only. They are not neural samples and are never routed into a neural decoder as though they measured thoughts.

Experimental neural/physiological devices beyond the standard Heart Rate Service require an explicit `SensorProfile` containing their documented service UUIDs, characteristic UUIDs, units, frame format, sample rate, and decoder version before Speak is allowed to discover or subscribe to them. No wildcard experimental profile is permitted.

HealthKit remains the preferred Apple-device reference path for Apple Watch/Apple Health measurements; Speak does not assume that an Apple Watch will present itself as a generic BLE Heart Rate peripheral to the iPhone app.

## BLE connection flow

The native application uses CoreBluetooth. The remote Codespace/dev container does not scan the user's iPhone/iPad Bluetooth radio.

Connection sequence:

`user tap -> iOS Bluetooth permission -> allowlisted sensor discovery -> user selection -> BLE connection -> allowed service/characteristic discovery -> sample subscription -> sensor-connected state`

Requirements:

- Scanning starts only after **CONNECT TO ME**.
- Discovery is restricted to configured supported sensor service UUIDs, initially `0x180D` plus any explicitly configured documented experimental profiles.
- If no supported sensor profile is configured, Speak reports **No supported sensor profile configured** and does not perform generalized nearby-device discovery.
- Unknown/unmatched peripherals remain unknown and cannot become a self-session source.
- The user must choose the candidate sensor before connection.
- Only documented services and characteristics in the selected `SensorProfile` are read/subscribed.
- A BLE connection establishes only **Sensor connected**. It never establishes human identity by itself.
- Disconnect, parser failure, unexpected service changes, or stale samples immediately fail closed and invalidate experimental output eligibility.

## HealthKit reference boundary

HealthKit access is read-only and independently authorized by the user. The first implementation may request only reference categories relevant to the approved self-session design, such as heart rate, heart-rate variability, height, and body mass when available. Temperature is displayed or used only when an actually authorized HealthKit or attached-sensor source provides it.

Health data is used as corroborating session context, not biometric authentication and not proof of thought source. Lack of a HealthKit category must not be silently synthesized or inferred.

No raw HealthKit measurements are uploaded to a cloud service by default. AWS IoT remains disabled for this phase.

## Experimental neural/physiological input

Experimental Input defaults **OFF** and can be enabled only after:

- a supported experimental sensor is explicitly selected and connected;
- its sensor profile declares the measured channel and decoding semantics;
- the user explicitly confirms the current self session; and
- the sample stream meets configured freshness and quality requirements.

The built-in BLE Heart Rate profile can contribute physiology/session context but cannot satisfy the experimental-neural-sensor requirement by itself.

A configurable 0.8–4.0 Hz analysis band may be applied downstream when scientifically appropriate for the sensor/channel. It is a DSP analysis setting and is never represented as a Bluetooth carrier, BLE pairing frequency, or evidence that Bluetooth itself measures neural activity.

Measured data, derived features, model inference, and user-confirmed communication must remain separate data types/states.

## Communication confidence gate

The fail-closed path is:

`authorized sensor -> valid sample -> signal quality -> self-session confirmation -> model inference -> inference confidence -> user confirmation -> Speak output`

Rules:

- No sensor: no experimental candidate.
- Unsupported/unknown sensor: no experimental candidate.
- Stale or invalid samples: no experimental candidate.
- Unconfirmed self session: no experimental candidate.
- Physiology-only profile without an experimental neural channel: no neural candidate.
- Low inference confidence: suggestion only, never represented as the participant's words.
- Passing confidence still requires user confirmation before external speech/message output in this phase.
- Turning Speak OFF, turning Experimental Input OFF, disconnecting the sensor, or revoking permission cancels pending candidate communication.

The interface labels each output as **Measured**, **Inferred**, or **User Confirmed** as appropriate.

## Session confirmation and attribution

The state **Session confirmed** means the user has explicitly asserted that the authorized sensor is being used for their current Speak session. It is not a cryptographic or biometric identity proof.

The app must never assign the identity of Michael Vincent Patrick or any other person to a BLE peripheral based solely on signal strength, heart rate, body measurements, device proximity, device name, network address, or radio observations.

A future identity layer can use stronger separately validated credentials without changing this sensor boundary.

## Receipts and privacy

Local session receipts record control/evidence metadata rather than raw physiology by default:

- session identifier;
- timestamp;
- sensor profile identifier/version;
- privacy-preserving local peripheral reference;
- permission/consent transitions;
- connection/disconnection transitions;
- signal-validity state;
- self-session confirmation/revocation;
- experimental-input enable/disable;
- inference gate decision state;
- communication confirmation state.

No long-lived credentials, raw neural datasets, raw HealthKit history, or participant data are committed to the repository.

Any future government/public-authority privileged access remains fail closed and subject to Speak's separate lawful-authority and tamper-evident receipt requirements. This self-connection feature does not create a government-access bypass.

## Browser/native relationship

The existing browser Speak interface remains useful for text-to-speech, browser speech recognition, and development controls. It does not attempt browser BLE on iOS.

The native application owns CoreBluetooth and HealthKit access. No browser UI state is allowed to imply a native sensor connection that has not actually been established by the native state machine.

The existing browser `Thought Command` control remains an explicit typed/transcribed command mode unless and until a validated native experimental input candidate is deliberately bridged through a separately defined interface.

## Error behavior

All acquisition and inference failures are visible and fail closed. Representative states include:

- Bluetooth unavailable/denied.
- Health access unavailable/denied.
- No supported sensor profile.
- No supported sensor discovered.
- Connection failed.
- Unsupported service/characteristic.
- Sample malformed.
- Sample stale.
- Signal quality insufficient.
- Session not confirmed.
- Experimental input disabled.
- Inference confidence insufficient.

Errors must not silently fall back to arbitrary nearby RF/network data.

## Testing and verification

### Portable/static verification

The repository/dev-container can verify:

- ownership/branding assertions;
- manifest/schema structure;
- no embedded credentials;
- state-machine and inference-gate pure logic where platform-neutral tests are available;
- existing browser Speak tests.

### macOS/Xcode verification

A macOS/Xcode environment must verify:

- `xcodegen generate` succeeds from `apps/speak/ios/`;
- generated native project opens/builds;
- Swift compilation;
- HealthKit entitlement and usage-description configuration;
- Bluetooth usage-description configuration;
- unit tests.

### Physical iPhone/iPad verification

Real connection acceptance requires a physical supported sensor and a user gesture on the target device. The test must demonstrate:

1. App opens in **Disconnected** state.
2. No BLE scan occurs before **CONNECT TO ME**.
3. Unsupported devices are not presented as the participant.
4. A BLE Heart Rate Service peripheral, or another explicitly configured supported peripheral, can be selected and connected when physically present.
5. Heart-rate samples remain labeled physiology/reference data rather than neural inference.
6. Health authorization remains independent and read-only.
7. User confirmation is required to reach **Session confirmed**.
8. Experimental Input remains OFF by default.
9. Disconnect/revocation fails closed.
10. No candidate communication is automatically spoken/sent.
11. A candidate that passes configured gates still requires explicit user confirmation before Speak output.

## Acceptance criteria

This implementation is acceptable when:

- Speak has a standalone native SwiftUI source target under `apps/speak/ios/`.
- `apps/speak/ios/project.yml` reproducibly defines the native target for XcodeGen.
- The primary screen exposes the approved SELF CONNECTION state machine and CONNECT TO ME action.
- BLE discovery is user-triggered and restricted to the standard Heart Rate Service plus explicitly configured sensor profiles.
- HealthKit access is read-only and independently consented.
- Unknown devices cannot be attributed to a person.
- Standard heart-rate samples are kept distinct from experimental neural samples.
- Experimental Input is disabled by default and requires a connected supported experimental sensor plus explicit self-session confirmation.
- 0.8–4.0 Hz is represented only as optional downstream DSP analysis configuration.
- The inference/communication path is fail closed and explicitly separates measurement, inference, and user confirmation.
- Existing browser Speak branding is standalone Speak rather than Aura-branded.
- No raw user health data, BLE identifiers, AWS credentials, or private participant datasets are added to source control.
- Physical-device connection is reported as unverified until it is actually run on an authorized iPhone/iPad with a supported sensor.
