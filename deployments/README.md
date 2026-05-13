# Aura-Core Deployment Proof Requirements

This folder stores contract deployment records for Aura-Core protocol work.

## Current status

`aura-core.contracts.json` is currently a template and unverified deployment record. It must not be treated as production proof until real deployment evidence is added.

## Required proof before marking verified

Do not set `verified: true` until all of the following are present and independently checkable:

1. Proxy contract address
2. Implementation contract address
3. Proxy admin address
4. Deployment transaction hash
5. Explorer URL for the proxy contract
6. Explorer URL for the implementation contract
7. Explorer URL for admin relationship proof
8. Initializer signature
9. Initializer data hash
10. Confirmation that admin separation has been reviewed
11. Confirmation that initialization status has been reviewed

## Safety rules

- Placeholder values such as `0x...`, empty strings, or guessed addresses are not valid proof.
- Use `null` for unknown values.
- Keep `status: "template-unverified"` until real addresses and transaction hashes exist.
- Public claims should distinguish between template, testnet, verified testnet, and production/mainnet status.

## Repository boundary

Aura-Core source and protocol records belong here:

- `MVPuknowme/Aura-core`

SkyGrid website, app, reliability dashboard, deployment pipeline, and public infrastructure workflows belong in:

- `MVPuknowme-aura-core/Skygrid`

## Verification checklist

Before updating `aura-core.contracts.json`, verify:

```text
Network:
Chain ID:
Proxy address:
Implementation address:
Proxy admin address:
Deployment transaction hash:
Explorer links:
ABI path:
Initializer signature:
Initializer data hash:
Admin separation reviewed:
Initialization status reviewed:
Verified by:
Date:
```

Only after this checklist is complete should the record move from `template-unverified` to a verified deployment status.
