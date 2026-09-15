# Speak application boundary

Speak is an independent application within the repository and must remain runnable/testable without importing sibling application internals.

## Current verified implementation surface

- Browser speech synthesis.
- Browser speech recognition where supported.
- Explicit typed/transcribed command mode.
- Deterministic known-target calibration scoring.

The current implementation does **not** establish thought detection and does not implement Bluetooth/BLE discovery.

## Integration rule

Bluetooth/BLE functionality, if added, must be introduced behind an explicit adapter with user-authorized device selection, a documented service/characteristic contract, and raw observation receipts suitable for controlled testing. Bluetooth observations and signal strength must not automatically be labeled as a person's thoughts, identity, intent, or speech.

Speak must not implicitly receive credentials, wallet/payment access, SKYGRID routing privileges, or data belonging to Whisper Breaker or Jaxon's Aura.

See `docs/architecture/SPEAK-WHISPER-JAXONS-AURA-SEPARATION.md`.
