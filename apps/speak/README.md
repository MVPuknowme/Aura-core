# Speak

Speak™ is a local-first browser speech interface inside Aura-core.

## Authorship and claimed mark notice

Speak™ is maintained in `MVPuknowme/Aura-core` as an MVPuknowme software proof of concept. Repository provenance for the implementation includes merged PR #164 and its associated commit history.

The `™` symbol is used as notice of a claimed mark; this README does not assert federal trademark registration or use the `®` symbol. See [`docs/ip/AUTHORSHIP_AND_MARKS_PROOF_OF_CONCEPT.md`](../../docs/ip/AUTHORSHIP_AND_MARKS_PROOF_OF_CONCEPT.md) and [`docs/ip/authorship-manifest.json`](../../docs/ip/authorship-manifest.json) for the dated evidence record.

## Current rebuild

- Text-to-speech using the browser `speechSynthesis` API.
- Speech-to-text using `SpeechRecognition` or `webkitSpeechRecognition` when available.
- Large iOS-friendly **ACTION** button.
- **Thought Command** ON/OFF control, OFF by default.
- One-shot **Calibration Read** with a known target phrase and 1–5 read-confidence result.
- Responsive mobile-first Aura styling.
- No application-level network calls, analytics, background listening, or device discovery.

## Action + Thought Command

“Thought Command” is the UI label for an explicit command mode. It does not detect or infer thoughts.

- **OFF:** ACTION speaks the text box.
- **ON:** ACTION interprets an explicit typed/transcribed command.
- Allowed local commands: `speak`, `speak <text>`, `listen`, `stop`, `pause`, `resume`, `clear`, `copy`.
- Other commands are rejected locally.

## Calibration Read

Calibration is a known-target speech-recognition control, separate from witness or attribution confidence.

1. Press **ATTEMPT READ**.
2. The browser displays/selects a known calibration phrase and starts a one-shot microphone read after the user gesture.
3. Say the displayed phrase exactly once.
4. The app compares the transcript with the target using normalized edit similarity.
5. When the browser provides its own recognition confidence, it contributes 20% of the composite; target/transcript similarity contributes 80%. If browser confidence is unavailable, similarity alone is used.
6. Composite thresholds map to read confidence: `5 >= 0.92`, `4 >= 0.78`, `3 >= 0.60`, `2 >= 0.40`, otherwise `1`.

This score measures transcription calibration only. It is not evidence of hidden-thought detection, source identity, intent, or attribution.

Pure scoring logic lives in `calibration.mjs` and is covered by `calibration.test.mjs`. `.github/workflows/speak-calibration-ci.yml` runs those tests and verifies the dev server `/health` endpoint.

## iPhone / iPad dev container

The branch includes `.devcontainer/devcontainer.json` for GitHub Codespaces and other Dev Container clients.

1. Create or rebuild a Codespace from `agent/rebuild-speak`.
2. The container automatically starts `node apps/speak/dev-server.mjs`.
3. Port `8080` is forwarded privately as **Aura Speak**.
4. Open the forwarded HTTPS preview in Safari on iPhone/iPad.
5. `/health` returns JSON with `"ok": true`.
6. Press **ATTEMPT READ** and allow microphone access when iOS prompts.

> iOS does not run the Linux dev container locally. Codespaces hosts it remotely; Safari connects to the forwarded HTTPS port.

## Run locally

```powershell
node .\apps\speak\dev-server.mjs
```

Then open `http://localhost:8080`.

## Safety boundary

Speak is an assistive voice/text interface. It does not attempt to infer thoughts, identify nearby people, bypass device security, inspect unrelated Bluetooth/Wi-Fi devices, or treat RF/network signals as human communication.

## Files

- `index.html` — application shell and controls.
- `styles.css` — mobile-first styling.
- `app.js` — speech synthesis, main recognition, Action button, and command allowlist.
- `calibration.mjs` — deterministic calibration scoring core.
- `calibration-ui.mjs` — isolated one-shot browser calibration recognizer.
- `calibration.test.mjs` — Node tests for normalization/scoring.
- `dev-server.mjs` — dependency-free static dev server and `/health` endpoint.
- `.devcontainer/devcontainer.json` — Codespaces/dev-container configuration.
