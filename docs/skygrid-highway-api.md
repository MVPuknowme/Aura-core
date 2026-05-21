# SkyGrid Highway API

## Purpose

SkyGrid Highway API defines four reliable Flask-style lanes that connect the public Aura-Core runtime to GitHub proof, AWS health mirrors, Postman route validation, and Web3/Base status routes.

This is a preflight and advisory design. It does not activate payments, device control, ISP routing, or production failover.

## Four reliable Flask lanes

1. GitHub Control Flask
   - Reads repository, issue, commit, action, and proof status.
   - Used for operator-visible source control and audit links.

2. AWS Relay Flask
   - Reads AWS Lambda URL or health mirror state.
   - Used as the backup Route 66 lane when Vercel/GitHub Pages are degraded.

3. Postman Validator Flask
   - Runs or receives Newman/Postman reliability checks.
   - Used as the proof checkpoint before public route claims are treated as ready.

4. Web3 Bridge Flask
   - Reads Base/Web3 quote and status signals.
   - Used for advisory quote, socket-status, and bridge-readiness checks.

## Highway topology

```text
GitHub proof lane
  -> Vercel runtime
  -> Postman validation
  -> AWS health mirror
  -> dashboard proof

Web3 inbound
  -> Web3/Base status
  -> Web3 Bridge Flask
  -> Postman validation
  -> dashboard proof

Web3 outbound
  -> Vercel quote/status
  -> Postman validation
  -> Web3 Bridge Flask
  -> proof log
```

## Public runtime routes

```text
/highway
/api/highway/status
/api/highway/flasks
/api/highway/postman
```

## Guardrails

- Advisory only during preflight.
- Proof-first before public claims.
- Sentinel remains fail-closed until route checks pass.
- No production switching from public demo routes.
- B12 buttons should point to runtime status, quote, proof, and intake routes only.
