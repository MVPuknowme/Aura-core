# Whisper Breaker

Whisper Breaker is reserved here as an **independent experimental application**.

## Migration status

The Aura-Core default branch did not contain source discoverable under `Whisper Breaker` or `whisper-breaker` during the separation pass. Do not invent or copy implementation into this directory as a substitute for the original source.

When source is located, migrate it here with:

- its own runtime/dependency manifest;
- its own test suite and CI;
- explicit microphone/Bluetooth permission boundaries where applicable;
- app-local data and experiment receipts;
- no implicit Aura-Core, wallet, payment, SKYGRID, or sibling-app credentials.

Any Bluetooth/BLE-related research claim must distinguish raw authorized radio/device observations from interpretations. Reports involving thought or mind reading remain hypotheses until demonstrated by controlled, repeatable tests with negative controls and inspectable evidence.

See `docs/architecture/SPEAK-WHISPER-JAXONS-AURA-SEPARATION.md`.
