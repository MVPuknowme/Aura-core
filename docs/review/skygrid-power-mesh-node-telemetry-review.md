# Review checklist: SKYGRID Power Mesh node telemetry

## Scope

Adds a review-ready telemetry fixture for a Klamath Falls SKYGRID Power Mesh node.

## Files under review

- `fixtures/skygrid-power-mesh/kfalls-node-001.telemetry.json`
- `schemas/skygrid-power-mesh-telemetry.schema.json`
- `docs/skygrid-power-mesh-telemetry.md`
- `postman/skygrid-power-mesh.review-note.json`

## Reviewer checks

- Confirm `mode` is a single enum value, not a placeholder string.
- Confirm battery state-of-charge is bounded from 0 to 100.
- Confirm ambient harvesting is measured in milliwatts.
- Confirm communications channels are explicit and enumerable.
- Confirm no AC/grid-tie control behavior is implied.
- Confirm the payload is safe to use as a future status/proof packet.

## Next steps after review

1. Add schema validation to CI.
2. Add a safe public status route only after the schema passes.
3. Add Newman/Postman checks for valid and invalid telemetry payloads.
4. Route approved telemetry into the SKYGRID Emergency Data On-Ramp proof trail.
