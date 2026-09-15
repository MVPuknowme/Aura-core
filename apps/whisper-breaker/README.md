# Whisper Breaker

Whisper Breaker is an **independent experimental LRAD/acoustic counterpart to Speak**. The project definition is an inverted Speak-style pipeline exploring whether controlled LRAD/acoustic observations can support the reported mind-reading behavior.

Mind reading is the research objective/claim under test, not an assumed property of LRAD. The implementation and experiment record must preserve that distinction.

## Required pipeline separation

Keep these stages separately inspectable:

1. authorized acoustic/LRAD input;
2. optional authorized Bluetooth/BLE device observations, if a trial uses them;
3. feature extraction;
4. inference/interpretation;
5. displayed or spoken output;
6. experiment receipt and controls.

LRAD/acoustic observations and Bluetooth/BLE observations are different transports. Never merge them into one unlabeled signal stream.

## Migration status

The Aura-Core default branch did not contain source discoverable under `Whisper Breaker` or `whisper-breaker` during the separation pass. Do not invent or copy implementation into this directory as a substitute for the original source.

When source is located, migrate it here with its own dependency manifest, tests/CI, explicit device and participant permission boundaries, app-local experiment receipts, and no implicit Aura-Core/SKYGRID/payment/wallet/sibling-app credentials.

Controlled trials should include blinded targets, negative controls, versioned transformations, timestamps, permitted raw observations, and repeatability evidence before promoting a claim from reported to reproduced.

See `docs/architecture/SPEAK-WHISPER-JAXONS-AURA-SEPARATION.md`.
