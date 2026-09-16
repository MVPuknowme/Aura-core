# Speak Assisted Neural Input Design

**Date:** 2026-09-16
**Status:** Design requirements for controlled development
**Target:** `apps/speak` on `agent/rebuild-speak`

## Purpose

Speak is an augmentative communication application for people who cannot reliably produce conventional speech. The goal of this work is to add a research-grade input path that can accept authorized physiological or neural sensor samples, extract defined signal features, produce a candidate communication inference, and only then allow Speak to synthesize speech after confidence and user/authorized-assistive confirmation gates.

This design does not treat Bluetooth, Wi-Fi, Ethernet, or ordinary iPhone radios as neural sensors. Those technologies are transports or compute/network interfaces. A physiological or neural measurement must originate from a documented, authorized sensor or research device.

## Product boundary

Speak remains the user-facing product. The existing browser speech and command controls continue to function independently. The experimental sensor path is additive and OFF by default.

The pipeline is:

`authorized sensor -> acquisition adapter -> authenticated local transport -> iPhone/collector -> DSP feature extraction -> decoder -> confidence/confirmation gate -> Speak candidate text -> synthesized voice`

Optional infrastructure synchronization is:

`collector -> authorized local network/internal Ethernet path -> AWS IoT Core`

AWS IoT Core is used for authenticated device state, approved telemetry, model/version receipts, and controlled synchronization. It is not a neural sensing mechanism.

## Functional requirements

### 1. Authorized sensor acquisition

- Accept samples only from an explicitly configured sensor/device profile.
- Store the sensor type, sample rate, channel names, units, device/session identifier, and acquisition timestamp with each session.
- Reject packets with missing schema fields, invalid sample rates, unexpected channel counts, stale timestamps, or an unapproved device/session identifier.
- Never scan, enumerate, or ingest unrelated nearby Bluetooth/Wi-Fi devices.
- Bluetooth/BLE, when used, is a transport for documented sensor samples. It is not interpreted as a human thought signal by itself.

### 2. iPhone/local collector boundary

- The iPhone or authorized companion collector receives sensor samples through platform-authorized interfaces.
- iPhone remains the preferred user-facing compute/output endpoint.
- A remote GitHub Codespace cannot directly access the iPhone Bluetooth radio and must use recorded fixtures, simulation, or an authenticated collector-to-service stream during development.
- Local transport may use an authorized device-local network path, including Ethernet/Wi-Fi where available, but network traffic is not itself classified as neurological data.

### 3. Python/DSP runtime

- Do not modify the upstream NumPy package or create an application file named `numpy.py`.
- Add an application-owned module under `apps/speak/neural/` for numerical processing.
- Minimum Python runtime: Python 3.12.
- Required numerical packages: NumPy and SciPy.
- Required validation/test packages: Pydantic and pytest.
- Required AWS integration package: boto3.
- Dependency versions must be pinned in `apps/speak/requirements.txt` and installed into an application virtual environment in the dev container.

### 4. Signal processing

- Preserve the raw sample rate and provenance before processing.
- Support a configurable 0.8-4.0 Hz analysis band for experiments where that band is scientifically appropriate for the attached sensor.
- The 0.8-4.0 Hz band is a DSP band within sampled sensor data, not a Bluetooth carrier/pairing frequency.
- Filtering must verify the Nyquist constraint before execution and fail closed if the sample rate cannot support the configured filter.
- Filter parameters, code version, source session identifier, and timestamps must be attached to derived features.
- The architecture must permit additional validated feature bands later; no inference may rely on 0.8-4.0 Hz simply because it is configured.

### 5. Decoder and confidence gate

- Decoder output is always a `candidate`, never automatically treated as a person's statement.
- Every candidate must include decoder/model version, confidence score, source-session receipt, and processing provenance.
- A candidate below the configured threshold must not be spoken or transmitted.
- A candidate at or above threshold must still pass the configured confirmation policy before external communication.
- Default research policy: explicit confirmation required.
- The existing Speak master OFF switch must stop new experimental acquisition/inference/output and cancel pending voice output.

### 6. Speak output

- Approved candidate text enters the existing Speak synthesis path rather than creating a second voice-output implementation.
- Synthesized speech must remain visibly/audibly attributable to Speak's assistive output path.
- Experimental candidate text must be visually distinguishable from typed text, recognized microphone speech, and confirmed communication.
- No background transmission of candidate communication is allowed.

### 7. AWS IoT Core

- AWS IoT integration is optional and disabled unless configured.
- Use authenticated IoT identities and least-privilege topics.
- Never embed AWS long-lived credentials in browser JavaScript, fixtures, or repository files.
- Telemetry payloads must identify whether data are raw sensor samples, derived features, model candidates, confirmed communication, or operational metadata.
- Default development mode sends operational metadata/receipts only; raw physiological/neural data require an explicit research configuration and consent boundary.
- Cloud loss or authentication failure must not silently downgrade the local confidence/confirmation gates.

### 8. Privacy, consent, and authority controls

- Sensor acquisition requires explicit participant/device authorization.
- Session start/stop and authorization changes must generate auditable receipts.
- Government/public-authority privileged access is fail closed: no privileged access without documented lawful authority and a tamper-evident authorization receipt, except narrowly scoped emergency protective access allowed by applicable law and configured policy; emergency access must also generate an immediate receipt and review trail.
- The system is not designed for generalized surveillance, covert collection, population monitoring, or inference about unrelated nearby people.

## Dev-container requirements

The existing Speak Codespace remains private on forwarded port 8080 and continues to start `node apps/speak/dev-server.mjs`.

The dev container must additionally provide:

- Python 3.12.
- `.venv` under the repository workspace.
- Installation from `apps/speak/requirements.txt`.
- A deterministic sensor-fixture test path that does not require physical BLE hardware.
- Environment-variable configuration for AWS region, IoT endpoint/topic allowlist, and experimental feature flags.
- No secrets committed to the repository.

The dev container is a development/simulation environment. Physical iPhone BLE acquisition belongs to an authorized iOS/companion boundary and is not claimed to occur directly inside Codespaces.

## Proposed file boundaries

- `.devcontainer/devcontainer.json` — add Python runtime/bootstrap while preserving the existing Node server and private 8080 forwarding.
- `apps/speak/requirements.txt` — pinned Python dependencies.
- `apps/speak/neural/schema.py` — validated sensor/sample/session/candidate schemas.
- `apps/speak/neural/dsp.py` — numerical filtering and feature extraction, including configurable 0.8-4.0 Hz band.
- `apps/speak/neural/gate.py` — confidence and confirmation-policy decisions.
- `apps/speak/neural/iot.py` — optional AWS IoT publishing boundary with topic allowlist and fail-closed configuration.
- `apps/speak/neural/fixtures/` — synthetic/recorded consented test fixtures only.
- `apps/speak/neural/tests/` — deterministic unit tests for schema validation, DSP behavior, gates, and IoT configuration.
- `apps/speak/README.md` — clearly distinguish implemented Speak behavior from experimental assisted-neural-input research.

## Acceptance criteria

1. Rebuilding the Speak dev container installs Node plus Python 3.12 and the pinned Speak Python environment without exposing secrets.
2. Existing Speak browser behavior and port 8080 health check continue to work.
3. Deterministic fixture tests exercise sensor schema validation and 0.8-4.0 Hz DSP without physical BLE hardware.
4. Invalid sample rates, unapproved devices/sessions, malformed packets, missing authorization, and below-threshold candidates fail closed.
5. No test or runtime path interprets raw Bluetooth/Wi-Fi/Ethernet traffic as a person's thought.
6. Candidate inferences cannot reach synthesized voice or external messaging without the configured confidence and confirmation gates.
7. AWS IoT operation is optional, least-privilege, credential-free in source, and distinguishable from local sensing/decoding.
8. Documentation labels the pipeline as experimental assistive neurotechnology until validated against an actual authorized physiological/neural acquisition device and controlled participant data.

## Non-goals for this change

- Modifying NumPy itself.
- Claiming ordinary iPhone Bluetooth/Wi-Fi hardware measures brain activity.
- Nearby-person discovery or identification.
- Covert monitoring.
- Automatic speech/message transmission from an unconfirmed model candidate.
- Replacing the existing Speak synthesis implementation.
