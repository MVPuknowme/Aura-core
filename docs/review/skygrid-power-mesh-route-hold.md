# Route hold: SKYGRID Power Mesh telemetry

Do not wire this payload to a public route until review confirms:

1. Schema validation is passing.
2. Public response fields are sanitized.
3. No location-sensitive or safety-sensitive fields are exposed without intent.
4. The endpoint is status/proof-only and cannot control physical power hardware.
5. Newman/Postman checks cover valid and invalid payloads.

Suggested future endpoint after review:

```text
/api/power-mesh/status
```

Suggested future route behavior:

- `GET` returns safe public status metadata only.
- `POST` accepts telemetry only when authenticated or signed.
- No route controls electrical equipment.
