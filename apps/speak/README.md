# Speak

**Speak is a standalone proprietary program owned by Michael Vincent Patrick (MVP).**

Speak is being developed as an assistive communication program, including controlled research toward thought-to-speech communication for people who cannot reliably produce conventional speech. Its current repository location is a development/hosting location only; it does not make Speak a subsidiary, component, product line, or property of Aura-Core, SKYGRID, the repository host, or another project or entity.

Copyright © 2026 Michael Vincent Patrick. All rights reserved. See `PROPRIETARY-LICENSE.md`. Repository or source access does not itself grant a license to use, copy, modify, distribute, commercialize, deploy, train on, or sublicense the original Speak materials. Third-party dependencies retain their respective licenses.

## Current implemented interfaces

The browser interface provides text-to-speech, browser speech-to-text, explicit command control, and calibration. It has no application-level device discovery and does not treat the `Thought Command` label as thought detection.

A native iPhone/iPad source target now lives at `apps/speak/ios/`. It provides the approved **SELF CONNECTION** flow for user-triggered, allowlisted BLE sensor discovery; read-only HealthKit reference availability; explicit self-session confirmation; and a fail-closed experimental-input gate.

The initial BLE profile is the Bluetooth SIG Heart Rate Service (`180D`) and Heart Rate Measurement characteristic (`2A37`). Heart-rate samples are physiology/reference data only. They do not enable the experimental neural path and are not treated as identity proof or direct thought measurement. Experimental devices require an explicit documented `SensorProfile`; wildcard experimental discovery is not permitted.

The native design specification is `docs/superpowers/specs/2026-09-16-speak-native-self-connection-design.md`. Native build/device instructions are in `ios/README.md`; verification status is in `ios/VERIFICATION.md`.

## Thought Command today

The currently implemented **Thought Command** browser control is an explicit command mode. It does not by itself detect or infer thoughts.

- **OFF:** ACTION speaks the text box.
- **ON:** ACTION interprets an explicit typed/transcribed command.
- Allowed local commands: `speak`, `speak <text>`, `listen`, `stop`, `pause`, `resume`, `clear`, `copy`.
- Other commands are rejected locally.

The assisted neural-input path is experimental and must not be represented as operational until validated with an authorized acquisition device and controlled participant data.

## Experimental assisted neural-input boundary

`authorized sensor -> documented acquisition adapter -> BLE/local transport -> native collector -> DSP/decoder -> confidence gate -> user confirmation -> Speak output`

- Bluetooth/BLE is a transport for documented sensor samples; it is not itself treated as a neural sensor.
- A configurable 0.8–4.0 Hz DSP band may be evaluated only when scientifically appropriate for the attached sensor/channel; it is not a Bluetooth carrier or pairing frequency.
- Ethernet/Wi-Fi may provide an authorized local network path, but ordinary network traffic is not neurological data.
- Experimental candidates are never automatically represented as the participant's words and require explicit user confirmation before external communication in this phase.
- AWS IoT/cloud health upload is disabled for the current native self-connection phase.

## Calibration Read

Calibration is a known-target speech-recognition control, separate from neurological inference, witness confidence, or attribution confidence. Pure scoring logic lives in `calibration.mjs` and is covered by `calibration.test.mjs`.

## Standalone Speak dev container

Speak has its own development container at `.devcontainer/speak/devcontainer.json` with Node.js 22, Python 3.12, private port 8080 forwarding, and experimental/AWS flags OFF by default. The dedicated Speak container contains no AWS long-lived credentials.

The Linux container cannot access an iPhone/iPad Bluetooth radio. Physical sensor discovery and HealthKit authorization are native-device responsibilities and require user gestures on the target Apple device.

## Run browser interface locally

```powershell
node .\apps\speak\dev-server.mjs
```

Then open `http://localhost:8080`.

## Safety and privacy boundary

Speak is designed for assistive communication, not generalized surveillance. Experimental sensor acquisition requires explicit participant/device authorization. It must not scan or ingest unrelated nearby devices or treat ordinary RF/network traffic as human communication. Government/public-authority privileged access remains fail closed and subject to separate lawful-authority and tamper-evident receipt requirements.

## Files

- `PROPRIETARY-LICENSE.md` — MVP ownership and proprietary-control notice.
- `index.html`, `styles.css`, `app.js` — browser speech and command interface.
- `calibration.mjs`, `calibration-ui.mjs`, `calibration.test.mjs` — browser calibration core/UI/tests.
- `dev-server.mjs` — dependency-free static dev server and `/health` endpoint.
- `requirements.txt` — pinned Speak Python dependencies.
- `ios/` — standalone native SwiftUI/CoreBluetooth/HealthKit source target and portable tested core.
