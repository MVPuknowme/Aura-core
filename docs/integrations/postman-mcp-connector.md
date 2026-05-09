# Postman MCP Connector Integration

## Overview

This document tracks the SKYGRID / Aura-Core Postman MCP connector lane.

The goal is to use Postman MCP requests as an interoperability and validation bridge between:

- GitHub Actions
- Airtable
- Railway
- Azure
- AWS
- Phoenix Protocol
- Sun Pay prototype APIs
- SKYGRID reliability metrics

## Workspace Information

- Workspace Name: Mvpuknowme's Workspace
- Workspace ID: c4eec727-cb21-450f-81c6-0e5c93ca76ff
- Creator/User ID: 50503657

## MCP Request

- MCP Request ID: 696d4a74de9ba435231bed21

## Active Environment

- Environment ID: 50503657-a6b1f21b-1236-4a0c-b5c3-5d0bc9ea9146

## Intended Use

The Postman MCP layer is intended to:

1. Validate API availability.
2. Confirm deployment health.
3. Verify connector interoperability.
4. Test fallback routing.
5. Simulate recovery events.
6. Feed reliability metrics into SKYGRID dashboards.
7. Provide proof-of-behavior beyond static deployment screenshots.

## Suggested Collections

- SKYGRID Core Health
- Phoenix Recovery API
- Sun Pay Prototype API
- Railway Agent Health
- Azure Deploy Health
- GitHub Workflow Health
- Reliability Metrics Gateway

## Suggested Environment Variables

```env
BASE_URL=
STATUS_ENDPOINT=
GITHUB_API=
RAILWAY_URL=
AZURE_URL=
PHOENIX_API=
SUNPAY_API=
NODE_METRICS_ENDPOINT=
```

## Security Notes

- Do not commit API tokens.
- Store secrets only in Postman environment variables, GitHub Secrets, or provider vaults.
- Prefer read-only integrations first.
- Treat all MCP integrations as staging until validated with live requests.

## Reliability Philosophy

GitHub provides proof-of-code.
Postman provides proof-of-behavior.
Phoenix provides proof-of-recovery.
SKYGRID combines them into operational resilience.
