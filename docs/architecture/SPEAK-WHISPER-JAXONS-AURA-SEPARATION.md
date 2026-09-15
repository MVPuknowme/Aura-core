# Speak / Whisper Breaker / Jaxon's Aura separation

Status: architecture boundary established for staged extraction.

## Decision

Treat **Speak**, **Whisper Breaker**, and **Jaxon's Aura** as three independent experimental applications. They are not Aura-Core/SKYGRID infrastructure services and must not silently inherit unrelated application state, credentials, network access, telemetry, wallet/payment logic, emergency-routing logic, or deployment configuration.

Each application gets its own executable root, documentation, tests, permissions, data/receipt namespace, and release lifecycle. Cross-app code sharing must happen only through an explicit, versioned interface.

## Current repository evidence

### Speak

Current source exists at `apps/speak/`. Its browser implementation provides speech synthesis, browser speech recognition, explicit command handling, and calibration scoring. Its current documentation explicitly says it performs no device discovery and does not infer thoughts.

### Whisper Breaker

No source named `Whisper Breaker` or `whisper-breaker` was located in the indexed Aura-Core default branch during this separation pass. `apps/whisper-breaker/` is therefore reserved as an isolated migration target; no capability is inferred from the name.

### Jaxon's Aura

No source named `Jaxon`, `Jaxon's Aura`, or `jaxons-aura` was located in the indexed Aura-Core default branch during this separation pass. `apps/jaxons-aura/` is therefore reserved as an isolated migration target; no capability is inferred from the name.

## Research-claim boundary

Reports of thought or mind-reading behavior through Bluetooth/BLE are treated as an **experimental hypothesis**, not as a verified capability. Bluetooth/BLE observations can establish facts such as adapter state, paired/authorized peripheral identity, advertised services, RSSI, characteristics, packets exposed by authorized APIs, timing, and application-generated outputs. Those measurements alone do not establish that a radio signal represents a person's thoughts.

A claim may move from `reported` to `reproduced` only when a controlled test records:

1. a preregistered target or blinded challenge;
2. exact hardware/OS/app build identifiers;
3. explicit participant/device authorization;
4. paired/authorized Bluetooth peripheral identifiers and service/characteristic UUIDs;
5. timestamps and raw permitted observations;
6. a deterministic transformation from observations to output;
7. negative/control trials and chance baseline;
8. repeatability across fresh trials;
9. a result artifact sufficient for an independent reviewer to inspect.

Use claim states: `reported`, `instrumented`, `reproduced`, `independently_reproduced`. Do not label a claim verified solely from subjective correspondence.

## Application boundaries

### Speak — `apps/speak/`

Purpose: local-first speech/text interface and controlled experimental UI.

Allowed by default: microphone after user permission; browser speech recognition; speech synthesis; local calibration; explicit user commands.

Not granted implicitly: Bluetooth discovery, unrelated device inspection, background surveillance, Aura-Core credentials, wallet/payment access, SKYGRID routing, or access to another experimental app's data.

Any Bluetooth feature must be added as a separately reviewable adapter with an explicit device-selection/authorization flow and raw-observation logging.

### Whisper Breaker — `apps/whisper-breaker/`

Purpose: reserved independent application boundary pending recovery/import of its actual source.

Do not copy Speak or Aura-Core behavior into this directory to fill gaps. Migrate only identified Whisper Breaker source and document its inputs/outputs before enabling integrations.

### Jaxon's Aura — `apps/jaxons-aura/`

Purpose: reserved independent application boundary pending recovery/import of its actual source.

Keep Jaxon's Aura data, permissions, releases, and experiments distinct from Speak, Whisper Breaker, and general Aura-Core services.

## Shared-interface rule

If the three applications need a common Bluetooth/BLE research component later, place the interface in a separately versioned package rather than importing one app from another. The interface should expose only authorized device/session observations and should not attach semantic labels such as `thought`, `person`, or `intent` to RF/BLE data without an independently tested classifier and documented evidence.

## Extraction sequence

1. Keep the three app roots independent inside this repository while source is inventoried.
2. Locate historical branches, commits, artifacts, or other repositories containing Whisper Breaker and Jaxon's Aura.
3. Import each source tree without cross-app dependencies.
4. Add app-specific tests and CI.
5. Add an experimental receipt schema for authorized Bluetooth/BLE sessions if such code exists.
6. After tests pass independently, extract each app to its own repository if separate repository ownership/release history is desired.
7. Aura-Core may consume released interfaces/artifacts, but must not become the owner of the experimental apps' internal state.

## Acceptance criteria

- Three distinct app roots exist.
- Speak remains runnable without Whisper Breaker or Jaxon's Aura.
- Missing source is explicitly marked missing rather than reconstructed by assumption.
- No claim of Bluetooth/BLE thought reading is promoted beyond the evidence state recorded by controlled tests.
- Future Bluetooth/BLE work uses explicit authorization and reproducible observation receipts.
- Each app can acquire its own CI/release workflow without depending on unrelated Aura-Core programs.
