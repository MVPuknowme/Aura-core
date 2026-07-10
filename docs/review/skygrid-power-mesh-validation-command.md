# SKYGRID Power Mesh validation command

Run this after checkout to validate the first power mesh telemetry fixture:

```bash
node scripts/validate-power-mesh-fixture.mjs
```

Expected output:

```json
{
  "ok": true,
  "checked": "skygrid-power-mesh-telemetry",
  "node_id": "skygrid-node-kfalls-001",
  "mode": "grid_connected",
  "emergency_ready": true
}
```
