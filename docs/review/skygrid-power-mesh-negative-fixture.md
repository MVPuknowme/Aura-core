# Negative fixture: invalid mode placeholder

`fixtures/skygrid-power-mesh/kfalls-node-001.invalid-mode.telemetry.json` preserves the original review input where `mode` was supplied as a pipe-delimited placeholder string:

```json
"grid_connected | islanded | battery_only | ambient_trickle"
```

That format is intentionally invalid for runtime telemetry. Runtime payloads must use one concrete mode value.

This negative fixture gives reviewers and future CI a known-bad case for schema validation.
