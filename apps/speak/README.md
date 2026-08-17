# Speak

Speak is a local-first browser speech interface inside Aura-core.

## Current rebuild

- Text-to-speech using the browser `speechSynthesis` API.
- Selectable system voices and adjustable speaking rate.
- Pause, resume, and stop controls.
- Speech-to-text using `SpeechRecognition` or `webkitSpeechRecognition` when the browser exposes it.
- Microphone capture begins only after an explicit button press.
- Transcript copy and clear controls.
- Large iOS-friendly **Action** button.
- **Thought Command** ON/OFF control, OFF by default.
- Responsive mobile-first UI using the Aura dark-blue/orange visual direction.
- No application-level network calls, analytics, background listening, or device discovery.

## Action + Thought Command

“Thought Command” is the UI label for an explicit command mode. It does not detect or infer thoughts.

- **OFF:** pressing **ACTION** speaks the contents of the text box.
- **ON:** pressing **ACTION** interprets an explicit command from the text box, or from the browser transcript when the text box is empty.
- Supported local commands: `speak`, `speak <text>`, `listen`, `stop`, `pause`, `resume`, `clear`, and `copy`.
- Commands outside this allowlist are rejected and are not forwarded to the network, shell, operating system, Bluetooth, Wi-Fi, or nearby devices.

The mode must be turned on by the user. It does not enable background listening.

## iPhone / iPad dev container

The branch includes `.devcontainer/devcontainer.json` for GitHub Codespaces and other Dev Container clients.

1. Create or rebuild a Codespace from the `agent/rebuild-speak` branch.
2. The container automatically starts `node apps/speak/dev-server.mjs`.
3. Port `8080` is automatically forwarded as a private port labeled **Aura Speak**.
4. The preview is configured to open automatically. On iPhone/iPad, you can also open the forwarded port from the Codespaces **Ports** panel in Safari.
5. Open `/health` on the forwarded URL to confirm the dev server is running; it returns JSON with `"ok": true`.

The application itself remains static and the dev server has no external service dependencies.

> iOS does not run this Linux dev container locally. The container runs remotely in Codespaces; Safari on iOS connects to its forwarded HTTPS port. This secure origin is also preferable for microphone APIs.

## Run locally

From the repository root, use the included Node development server:

```powershell
node .\apps\speak\dev-server.mjs
```

Then open `http://localhost:8080`.

> Microphone APIs usually require a secure context (`https://`) outside localhost. Browser and OS support varies. iOS/Safari may expose different speech-recognition behavior than Chromium browsers.

## Safety boundary

Speak is an assistive voice/text interface. It does not attempt to infer thoughts, identify nearby people, bypass device security, inspect unrelated Bluetooth/Wi-Fi devices, or treat RF/network signals as human communication.

## Files

- `index.html` — application shell and accessible controls.
- `styles.css` — mobile-first Aura styling.
- `app.js` — speech synthesis, recognition, Action button, command allowlist, transcript, and control logic.
- `dev-server.mjs` — dependency-free static dev server and `/health` endpoint.
- `.devcontainer/devcontainer.json` — remote Codespaces/dev-container configuration with private port forwarding.
