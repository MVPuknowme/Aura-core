# AuraSky Vercel Domain Wiring

Owned deployable site target:

```txt
https://aurasky.skygrid-protocol.net
```

## Role

`aurasky.skygrid-protocol.net` is the primary public deployable site target for the SKYGRID Emergency Data On-Ramp on Vercel.

## Required Vercel domain binding

Attach this domain to the Aura-core Vercel project:

```txt
aurasky.skygrid-protocol.net
```

If the apex/root domain is managed outside Vercel, create the provider's requested DNS record for the subdomain. For most Vercel custom subdomains, this is commonly a CNAME from `aurasky` to the Vercel assigned CNAME target shown in the Vercel dashboard.

## Verification commands

Run these after DNS/TLS/domain binding completes:

```bash
SKYGRID_BASE_URL="https://aurasky.skygrid-protocol.net" pnpm run skygrid:verify
SKYGRID_BASE_URL="https://aurasky.skygrid-protocol.net" pnpm run skygrid:test:routing
SKYGRID_BASE_URL="https://aurasky.skygrid-protocol.net" pnpm run aura:selection:watch
```

PowerShell:

```powershell
$env:SKYGRID_BASE_URL="https://aurasky.skygrid-protocol.net"
pnpm run skygrid:verify
pnpm run skygrid:test:routing
pnpm run aura:selection:watch
```

## Expected result

The Aura-Core selection/watch test should report:

```txt
selection_fail_count: 0
endpoint_fail_count: 0
```

Pending `401`, `403`, or `404` responses mean DNS, TLS, Vercel protection, or domain binding is not complete yet. They should not be treated as selector logic failure.
