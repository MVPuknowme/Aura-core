# SKYGRID Power Mesh telemetry

This document defines the first review fixture for SKYGRID Power Mesh node telemetry.

The payload describes a field node that can report power continuity, communications availability, and emergency readiness to the SKYGRID Emergency Data On-Ramp.

## Fixture

`fixtures/skygrid-power-mesh/kfalls-node-001.telemetry.json`

## Mode values

The `mode` field must be one of:

- `grid_connected` — utility power is available and the node is operating normally.
- `islanded` — local/site power is available while detached from the utility grid.
- `battery_only` — the node is running on stored energy.
- `ambient_trickle` — the node is operating or recharging from very-low-power ambient harvesting.

## Review notes

This fixture is intentionally telemetry-only. It does not attempt AC grid-tie control, transfer switching, utility interconnection, or critical-load switching. Those functions require licensed electrical design and code-compliant hardware review.

Future review work can add a JSON schema, Postman proof checks, and route manifest entries for a safe public status endpoint.
