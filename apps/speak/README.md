# Speak

Speak is a browser speech interface inside Aura-core. **This build denies all activation: speech output, microphone recognition, command-driven speech, and calibration remain disabled.**

## Current containment

Speak stays **OFF** on every load and after every activation attempt. Clicking the power toggle leaves it OFF and displays **Medical and legal review required**. ACTION, Thought Command, Speak, Listen, Pause, Resume, and ATTEMPT READ remain disabled; forcing their handlers does not enable speech or recognition.

There is **no grant path or professional-review/consent service in this build**. Medical/legal sign-off or consent cannot be submitted here to unlock it. Local approval flags, DOM datasets, and custom enable events are not authorization and cannot bypass the lock. A future activation path requires verified medical and legal reviews, informed revocable user consent, and trusted grant/revocation enforcement; these are requirements, not implemented capabilities. See the [professional-review boundary](../../docs/speak-professional-review-boundary.md).

Stop and OFF remain available without approval. The application preserves its OFF state even when browser termination APIs throw; this does not prove that a browser successfully terminated an external service. Late callbacks cannot reactivate the controls.

The application makes no application-level network calls, runs no analytics or background listening, and performs no device discovery. Browser speech services may process audio remotely if enabled in a future release; do not assume recognition is local-only.

## Action + Thought Command

“Thought Command” is a UI label for explicit typed/transcribed commands. It does not detect or infer thoughts. Both Thought Command and ACTION are blocked in this build.

The retained implementation includes manual text-to-speech and a command allowlist (`speak`, `speak <text>`, `listen`, `stop`, `pause`, `resume`, `clear`, `copy`), but the ACTION command path is inactive. Use the dedicated Stop controls for termination.

## Calibration Read

**ATTEMPT READ is disabled and cannot start a microphone read.** A displayed target phrase does not indicate an active calibration session. Do not grant microphone access or attempt a live read to verify this release.

The retained pure scoring logic in `calibration.mjs` compares supplied text with a known target using normalized edit similarity. Browser confidence, when supplied, contributes 20% of the composite and similarity contributes 80%; otherwise similarity alone is used. Thresholds map to scores: `5 >= 0.92`, `4 >= 0.78`, `3 >= 0.60`, `2 >= 0.40`, otherwise `1`. These functions can be tested with synthetic text without activating recognition.

This score measures transcription calibration only. It is not evidence of hidden-thought detection, source identity, intent, or attribution.

## iPhone / iPad dev container

The repository includes `.devcontainer/devcontainer.json` for GitHub Codespaces and other Dev Container clients.

1. Create or rebuild a Codespace from a branch containing the deny-all release.
2. The container starts `node apps/speak/dev-server.mjs`.
3. Port `8080` is forwarded privately as **Aura Speak**.
4. Open the forwarded HTTPS preview in Safari on iPhone/iPad.
5. `/health` returns JSON with `"ok": true`; this indicates server health, not activation approval.
6. Confirm Speak remains OFF, activation controls including ATTEMPT READ are disabled, and Stop controls remain available. An attempted power enable must leave Speak OFF with the review-required message. No speech or microphone read should start.

> iOS does not run the Linux dev container locally. Codespaces hosts it remotely; Safari connects to the forwarded HTTPS port.

## Run locally

```powershell
node .\apps\speak\dev-server.mjs
```

Then open `http://localhost:8080` to inspect the blocked UI.

## Smallest safe verification for documentation approval

Review this README against `app.js`, `calibration-ui.mjs`, and the professional-review boundary, then run the existing fake-browser behavior tests:

```powershell
node --test tests/speak-review-lock.test.mjs
```

The four tests verify blocked forced activation, rejected forged dataset/events, available Stop controls, and preserved OFF state when termination APIs throw. They use fake browser APIs and require no microphone access, speech output, professional records, or grant service.

The broader existing Speak CI command is:

```powershell
node --test apps/speak/default-off.test.mjs apps/speak/calibration.test.mjs tests/speak-review-lock.test.mjs
```

`.github/workflows/speak-calibration-ci.yml` runs these tests and checks the dev server `/health` endpoint. Passing tests supports approval of this documentation correction; it does not authorize activation or establish real-device behavior.

## Safety boundary

Speak is an assistive voice/text interface. It does not attempt to infer thoughts, identify nearby people, bypass device security, inspect unrelated Bluetooth/Wi-Fi devices, or treat RF/network signals as human communication. Current containment applies to this application; it does not control unrelated apps or devices.

## Files

- `index.html` — application shell and controls.
- `styles.css` — mobile-first styling.
- `app.js` — deny-all activation guard, retained speech/command implementation, and available Stop controls.
- `calibration.mjs` — deterministic calibration scoring core.
- `calibration-ui.mjs` — independently blocked calibration entry point.
- `default-off.test.mjs` — startup and UI policy tests.
- `calibration.test.mjs` — Node tests for normalization/scoring with synthetic text.
- `../../tests/speak-review-lock.test.mjs` — fake-browser containment and bypass tests.
- `dev-server.mjs` — dependency-free static dev server and `/health` endpoint.
- `.devcontainer/devcontainer.json` — Codespaces/dev-container configuration.
