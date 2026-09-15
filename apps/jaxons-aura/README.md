# Jaxon's Aura

Jaxon's Aura is an **independent Speak-derived communication application** for neurodivergent translation/mediation with cooperative assistants/services from Microsoft Azure.

## Product boundary

The app should preserve the user's original speech/text and make mediation transparent. A translation envelope should record:

- original input;
- user-selected communication/translation profile;
- transformed output;
- what kind of transformation was requested;
- local or Azure/cloud processing state;
- version/provider metadata sufficient to reproduce or review the transformation.

The user must be able to disable mediation and communicate through the baseline Speak path. Translation should be preference-driven rather than diagnostic: the app should not infer or assign a medical condition from a person's behavior, and it should not silently change intended meaning.

## Azure boundary

Azure integration must use an app-local adapter and narrowly scoped credentials. Content sent to a cloud service must be clearly distinguishable from local processing. Jaxon's Aura must not inherit unrelated Aura-Core/SKYGRID, wallet/payment, Whisper Breaker, or general infrastructure credentials/data.

## Migration status

The Aura-Core default branch did not contain source discoverable under `Jaxon`, `Jaxon's Aura`, or `jaxons-aura` during the separation pass. Do not reconstruct its implementation from assumptions or from another Aura app. Recover and migrate the identified original source here, then add its own tests and CI.

See `docs/architecture/SPEAK-WHISPER-JAXONS-AURA-SEPARATION.md`.
