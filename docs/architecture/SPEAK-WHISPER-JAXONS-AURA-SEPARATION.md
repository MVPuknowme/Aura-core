# Speak / Whisper Breaker / Jaxon's Aura separation

Status: architecture boundary established for staged extraction.

## Decision

Treat **Speak**, **Whisper Breaker**, and **Jaxon's Aura** as three independent applications. They are not Aura-Core/SKYGRID infrastructure services and must not silently inherit unrelated application state, credentials, network access, telemetry, wallet/payment logic, emergency-routing logic, or deployment configuration.

Each application gets its own executable root, documentation, tests, permissions, data/receipt namespace, and release lifecycle. Cross-app code sharing must happen only through an explicit, versioned interface.

## Product definitions

### Speak — baseline

`apps/speak/` is the baseline speech/text/control application. Current source provides browser speech synthesis, browser speech recognition, explicit command handling, and known-target calibration scoring. Current code does not implement Bluetooth device discovery or establish thought inference.

### Whisper Breaker — LRAD experimental inversion of Speak

Whisper Breaker is defined as a distinct **experimental inversion/counterpart of Speak using LRAD-related acoustic instrumentation**, with mind-reading described as the project's research objective/claim rather than an already verified LRAD capability.

LRAD/acoustic instrumentation and Bluetooth/BLE instrumentation are separate transports and must not be conflated. If a test uses both, the receipt must identify which observation came from the acoustic path and which came from an authorized Bluetooth/BLE device/API.

No source named `Whisper Breaker` or `whisper-breaker` was located in the indexed Aura-Core default branch during this separation pass. `apps/whisper-breaker/` is the isolated migration target for the original source.

### Jaxon's Aura — neurodivergent translation + Azure assistants

Jaxon's Aura is defined as a distinct **Speak-derived communication/translation application for neurodivergent communication**, incorporating cooperative assistants/services hosted through Microsoft Azure.

The translation layer should be user-controlled and preference-driven. It must not diagnose a person, infer a medical condition from behavior, or silently rewrite meaning. Preserve the source utterance/text alongside translated/mediated output so users can inspect what changed.

Azure integration belongs behind an app-local adapter with explicit configuration, scoped credentials, consent for any content sent to cloud services, and clear local-vs-cloud status. Jaxon's Aura must not inherit general Aura-Core/SKYGRID credentials.

No source named `Jaxon`, `Jaxon's Aura`, or `jaxons-aura` was located in the indexed Aura-Core default branch during this separation pass. `apps/jaxons-aura/` is the isolated migration target for the original source.

## Research-claim boundary

Reports of thought or mind-reading behavior through LRAD/acoustic or Bluetooth/BLE paths are treated as an **experimental hypothesis**, not as a verified capability. Authorized instrumentation can establish measurable facts such as audio samples/features, adapter state, selected peripheral identity, advertised services, RSSI, characteristics, packets exposed by authorized APIs, timing, and application-generated outputs. Those observations alone do not establish that a signal represents a person's thoughts.

A claim may move from `reported` to `reproduced` only when a controlled test records:

1. a preregistered target or blinded challenge;
2. exact hardware/OS/app build identifiers;
3. explicit participant/device authorization;
4. exact input path: microphone/acoustic/LRAD, Bluetooth/BLE, or another documented sensor;
5. for Bluetooth/BLE, selected peripheral identifiers and service/characteristic UUIDs available through authorized APIs;
6. timestamps and raw permitted observations;
7. a deterministic or version-pinned transformation from observations to output;
8. negative/control trials and chance baseline;
9. repeatability across fresh trials;
10. a result artifact sufficient for an independent reviewer to inspect.

Use claim states: `reported`, `instrumented`, `reproduced`, `independently_reproduced`. Do not label a claim verified solely from subjective correspondence.

## Application boundaries

### Speak — `apps/speak/`

Purpose: local-first speech/text interface and controlled experimental UI.

Allowed by default: microphone after user permission; browser speech recognition; speech synthesis; local calibration; explicit user commands.

Not granted implicitly: Bluetooth discovery, unrelated device inspection, background surveillance, Aura-Core credentials, wallet/payment access, SKYGRID routing, or access to another experimental app's data.

Any Bluetooth feature must be added as a separately reviewable adapter with an explicit device-selection/authorization flow and raw-observation logging.

### Whisper Breaker — `apps/whisper-breaker/`

Purpose: independent LRAD/acoustic experimental counterpart to Speak.

Required boundary: acoustic/LRAD acquisition, any authorized Bluetooth/BLE acquisition, feature extraction, inference/interpretation, and rendered output must remain separable in logs and tests. No unrelated-device inspection or bypass of device security.

Do not copy implementation into this directory as a substitute for original Whisper Breaker source. Recover and migrate the identified source, then document its actual inputs and outputs.

### Jaxon's Aura — `apps/jaxons-aura/`

Purpose: independent Speak-derived neurodivergent communication translation/mediation with cooperative Azure assistants.

Required boundary: preserve original input; identify transformations; let the user enable/disable mediation; identify when Azure/cloud processing is active; keep Azure credentials scoped to this app; maintain direct mode that does not require sibling apps.

Do not reconstruct its implementation from assumptions. Recover and migrate the identified original source.

## Shared-interface rule

Shared code must live behind explicit versioned interfaces rather than one app importing another app's internals. Candidate interfaces are speech I/O, authorized BLE observation receipts, acoustic experiment receipts, and translation envelopes.

A shared instrumentation interface must expose observations without attaching semantic labels such as `thought`, `person`, or `intent` unless a versioned classifier has separate controlled evidence supporting that interpretation.

## Extraction sequence

1. Keep the three app roots independent inside this repository while source is inventoried.
2. Locate historical branches, commits, artifacts, or other repositories containing Whisper Breaker and Jaxon's Aura.
3. Import each source tree without cross-app dependencies.
4. Add app-specific tests and CI.
5. For Whisper Breaker, add an experiment receipt schema that distinguishes LRAD/acoustic observations from Bluetooth/BLE observations.
6. For Jaxon's Aura, add a translation envelope containing original input, requested translation profile, transformed output, assistant/provider metadata, and cloud/local processing state.
7. After tests pass independently, extract each app to its own repository if separate repository ownership/release history is desired.
8. Aura-Core may consume released interfaces/artifacts, but must not become the owner of the experimental apps' internal state.

## Acceptance criteria

- Three distinct app roots exist.
- Speak remains runnable without Whisper Breaker or Jaxon's Aura.
- Whisper Breaker is documented as the LRAD experimental inversion/counterpart of Speak without presenting mind reading as established fact before controlled evidence.
- Jaxon's Aura is documented as Speak-derived neurodivergent translation/mediation with scoped cooperative Azure integration.
- Missing source is explicitly marked missing rather than reconstructed by assumption.
- Acoustic/LRAD and Bluetooth/BLE observations remain distinguishable and authorized.
- Each app can acquire its own CI/release workflow without depending on unrelated Aura-Core programs.
