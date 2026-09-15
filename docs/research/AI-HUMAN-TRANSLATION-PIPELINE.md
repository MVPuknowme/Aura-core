# AI-Human Translation Research Pipeline

## Purpose

Define a testable architecture for translating authorized human/sensor inputs into candidate speech while keeping transport, measurement, inference, confidence, consent, and economic receipts separate.

This document does not treat Wi-Fi, Ethernet, Bluetooth/BLE, AWS IoT, LRAD/acoustic signals, or an LLM as proof that thoughts are being read. Thought-to-speech is the research hypothesis. Promotion requires controlled and repeatable evidence.

## Pipeline

```text
AUTHORIZED PERSON / SENSOR
        |
        v
MEASUREMENT
  - neural/physiological sensor data, if a real sensor provides it
  - acoustic/LRAD observation, when applicable
  - Bluetooth/BLE telemetry kept separately from neural measurements
        |
        v
LOCAL TRANSPORT
  - phone Wi-Fi / hotspot / Ethernet / BLE
  - loopback/internal routes are network topology, not neural evidence
        |
        v
AWS IOT INGEST
  - timestamped event
  - device identity
  - consent/session scope
  - raw-observation reference
        |
        v
PERSON CONTEXT ENVELOPE
  - pseudonymous participant/session ID
  - communication preferences
  - voluntarily supplied translation context
  - allowed transformations/providers
        |
        v
FEATURE EXTRACTION
  - versioned Python/DSP implementation
  - proposed 0.08-5 Hz temporal feature band where technically valid
  - acquisition rate must support the analyzed frequencies
        |
        v
INFERENCE
  - versioned model
  - candidate text/phonemes
  - calibrated probability/confidence
        |
        v
CONFIDENCE + CONSENT GATE
  - below threshold: retain as experiment only
  - review threshold: show candidate, do not speak automatically
  - validated threshold: user-authorized translation/speech path
        |
        v
SPEAK / JAXON'S AURA OUTPUT
        |
        v
RECEIPT / VALUE LAYER
  - provenance receipt
  - participant authorization
  - optional crypto-value/reward accounting
  - never used as evidence that the inference was correct
```

## JSON event envelope

```json
{
  "schema": "aura.ai-human.translation.v1",
  "session_id": "pseudonymous-session-id",
  "participant": {
    "id": "pseudonymous-participant-id",
    "consent": {
      "active": true,
      "scope": ["sensor_ingest", "inference", "translation"],
      "expires_at": "ISO-8601"
    },
    "translation_preferences": {
      "mode": "user-selected",
      "preserve_original": true
    }
  },
  "transport": {
    "local_path": ["sensor", "phone", "authorized-network", "aws-iot"],
    "bluetooth_is_transport": true
  },
  "measurement": {
    "source_type": "declared-sensor-type",
    "device_id": "authorized-device-id",
    "sample_rate_hz": 0,
    "raw_observation_ref": "immutable-or-local-reference"
  },
  "features": {
    "pipeline_version": "version-id",
    "analysis_band_hz": [0.08, 5.0],
    "values_ref": "feature-reference"
  },
  "inference": {
    "model_version": "version-id",
    "candidate": "candidate output",
    "confidence": 0.0,
    "state": "experimental"
  },
  "gate": {
    "threshold_version": "version-id",
    "decision": "record_only",
    "human_confirmed": false
  },
  "output": {
    "provider": "local-or-approved-cloud-provider",
    "spoken": false,
    "preserve_original": true
  },
  "receipt": {
    "provenance_hash": "hash",
    "value_asset": null,
    "value_amount": null
  }
}
```

## Application boundaries

### Speak
Baseline explicit speech/text/control and output surface. It must not silently acquire unrelated devices or infer hidden input.

### Whisper Breaker
Experimental LRAD/acoustic counterpart to Speak. LRAD/acoustic measurements, BLE telemetry, sensor measurements, feature extraction, inference, and interpretation must be logged as different fields. A semantic thought-to-speech result remains experimental until controlled testing supports it.

### Jaxon's Aura
Speak-derived communication translation/mediation. It may use explicitly configured Microsoft Azure assistants/services, but must preserve the original input, indicate local versus cloud processing, keep the user in control of transformations, and avoid diagnosing a condition from behavior.

## Confidence improvement loop

Every model or Python/DSP change is evaluated against frozen test sessions containing target trials, no-target controls, shuffled/blinded trials where practical, false-positive counts, false-negative counts, calibration error, and provenance of the exact code/model versions. A higher confidence score alone is not an improvement: promotion requires better held-out performance without unacceptable false-positive growth.

## Crypto-value / AI-human kit

Crypto-value can represent consent receipts, contribution/reward accounting, licensing, or provenance. Keep keys and personally identifying context outside sensor payloads and do not put raw neural/physiological/acoustic observations on a public chain. Economic value is orthogonal to inference validity.
