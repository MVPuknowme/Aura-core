# Speak

Speak is a local-first browser speech interface inside Aura-core.

## Current rebuild

- Text-to-speech using the browser `speechSynthesis` API.
- Selectable system voices and adjustable speaking rate.
- Pause, resume, and stop controls.
- Speech-to-text using `SpeechRecognition` or `webkitSpeechRecognition` when the browser exposes it.
- Microphone capture begins only after an explicit button press.
- Transcript copy and clear controls.
- Responsive mobile-first UI using the Aura dark-blue/orange visual direction.
- No application-level network calls, analytics, background listening, or device discovery.

## Run locally

From the repository root, serve the directory with any static HTTP server. For example in PowerShell:

```powershell
Set-Location .\apps\speak
python -m http.server 8080
```

Then open `http://localhost:8080`.

> Microphone APIs usually require a secure context (`https://`) outside localhost. Browser and OS support varies. iOS/Safari may expose different speech-recognition behavior than Chromium browsers.

## Safety boundary

Speak is an assistive voice/text interface. It does not attempt to infer thoughts, identify nearby people, bypass device security, inspect unrelated Bluetooth/Wi-Fi devices, or treat RF/network signals as human communication.

## Files

- `index.html` — application shell and accessible controls.
- `styles.css` — mobile-first Aura styling.
- `app.js` — speech synthesis, recognition, transcript, and control logic.
