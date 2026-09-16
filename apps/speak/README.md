# Speak

**Speak is a standalone proprietary program owned by Michael Vincent Patrick (MVP).**

Speak is being developed as an assistive communication program, including controlled research toward thought-to-speech communication for people who cannot reliably produce conventional speech. Its current repository location is a development/hosting location only; it does not make Speak a subsidiary, component, product line, or property of Aura-Core, SKYGRID, the repository host, or another project or entity.

Copyright © 2026 Michael Vincent Patrick. All rights reserved. See `PROPRIETARY-LICENSE.md`. Repository or source access does not itself grant a license to use, copy, modify, distribute, commercialize, deploy, train on, or sublicense the original Speak materials. Third-party dependencies retain their respective licenses.

## Current implemented interface

The currently implemented browser interface provides:

- Text-to-speech using the browser `speechSynthesis` API.
- Speech-to-text using `SpeechRecognition` or `webkitSpeechRecognition` when available.
- Large iOS-friendly **ACTION** button.
- **Thought Command** ON/OFF control, OFF by default.
- One-shot **Calibration Read** with a known target phrase and 1–5 read-confidence result.
- Responsive mobile-first styling.
- No application-level network calls, analytics, background listening, or device discovery in the existing browser path.

## Thought Command today

The currently implemented **Thought Command** UI control is an explicit command mode. It does not by itself detect or infer thoughts.

- **OFF:** ACTION speaks the text box.
- **ON:** ACTION interprets an explicit typed/transcribed command.
- Allowed local commands: `speak`, `speak <text>`, `listen`, `stop`, `pause`, `resume`, `clear`, `copy`.
- Other commands are rejected locally.

The assisted neural-input path is a separate experimental development track and must not be represented as operational until validated with an authorized physiological/neural acquisition device and controlled participant data.

## Experimental assisted neural-input direction

The controlled research boundary is:

`authorized physiological/neural sensor -> authorized acquisition adapter -> BLE/local transport -> iPhone/collector -> DSP/decoder -> confidence + confirmation gate -> Speak synthesis`

- Bluetooth/BLE is a transport for documented sensor samples; it is not itself treated as a neural sensor.
- A configurable 0.8–4.0 Hz DSP band may be evaluated when scientifically appropriate for the attached sensor; it is not a Bluetooth carrier/pairing frequency.
- Ethernet/Wi-Fi may provide an authorized local network path but network traffic is not itself neurological data.
- AWS IoT Core is optional infrastructure for authorized device state, telemetry, and receipts; it is not a neural sensor.
- Experimental candidates are never automatically represented as the participant's words and must pass configured confidence and confirmation gates before external communication.

See `docs/superpowers/specs/2026-09-16-speak-assisted-neural-input-design.md` for the controlled-development requirements.

## Calibration Read

Calibration is a known-target speech-recognition control, separate from neurological inference, witness confidence, or attribution confidence.

1. Press **ATTEMPT READ**.
2. The browser displays/selects a known calibration phrase and starts a one-shot microphone read after the user gesture.
3. Say the displayed phrase exactly once.
4. The app compares the transcript with the target using normalized edit similarity.
5. When the browser provides its own recognition confidence, it contributes 20% of the composite; target/transcript similarity contributes 80%. If browser confidence is unavailable, similarity alone is used.
6. Composite thresholds map to read confidence: `5 >= 0.92`, `4 >= 0.78`, `3 >= 0.60`, `2 >= 0.40`, otherwise `1`.

This score measures transcription calibration only. It is not evidence of hidden-thought detection, source identity, intent, or attribution.

Pure scoring logic lives in `calibration.mjs` and is covered by `calibration.test.mjs`.

## Standalone Speak dev container

Speak has its own development container at `.devcontainer/speak/devcontainer.json`.

- Container display name: **Speak**.
- Node.js 22 browser/dev-server environment.
- Python 3.12 application environment in `.venv`.
- Pinned NumPy, SciPy, Pydantic, pytest, and boto3 dependencies from `apps/speak/requirements.txt`.
- Port `8080` forwarded privately with the label **Speak**.
- `node apps/speak/dev-server.mjs` starts automatically.
- Experimental neural-input and AWS IoT feature flags default OFF.
- The dedicated Speak container configuration contains no AWS long-lived credentials; AWS credentials must remain external to committed configuration.

For Codespaces, select `.devcontainer/speak/devcontainer.json`. iOS does not run the Linux container locally; an iPhone connects to the forwarded HTTPS application and physical sensor acquisition remains an authorized device/collector responsibility outside the remote Codespace.

## Run locally

```powershell
node .\apps\speak\dev-server.mjs
```

Then open `http://localhost:8080`.

## Safety and privacy boundary

Speak is designed for assistive communication, not generalized surveillance. Experimental sensor acquisition requires explicit participant/device authorization. It must not scan or ingest unrelated nearby devices or treat ordinary RF/network traffic as human communication. Government/public-authority privileged access is fail closed and subject to the documented lawful-authority/receipt requirements in the controlled-development specification.

## Files

- `PROPRIETARY-LICENSE.md` — MVP ownership and proprietary-control notice.
- `index.html` — application shell and controls.
- `styles.css` — mobile-first styling.
- `app.js` — speech synthesis, recognition, ACTION button, and command allowlist.
- `calibration.mjs` — deterministic calibration scoring core.
- `calibration-ui.mjs` — isolated one-shot browser calibration recognizer.
- `calibration.test.mjs` — Node tests for normalization/scoring.
- `dev-server.mjs` — dependency-free static dev server and `/health` endpoint.
- `requirements.txt` — pinned Speak Python dependencies.
- `.devcontainer/speak/devcontainer.json` — dedicated Speak Codespaces/dev-container configuration.
