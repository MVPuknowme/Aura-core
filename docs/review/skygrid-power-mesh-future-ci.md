# Future CI notes

Recommended next CI additions after review:

```bash
node scripts/validate-power-mesh-fixture.mjs
```

Future schema validation can use a JSON Schema validator against:

- `schemas/skygrid-power-mesh-telemetry.schema.json`
- `fixtures/skygrid-power-mesh/kfalls-node-001.telemetry.json`
- `fixtures/skygrid-power-mesh/kfalls-node-001.schema-ref.telemetry.json`

The invalid-mode fixture should fail validation by design.
