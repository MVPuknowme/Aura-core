# Aura-Sky Vercel Domain Wiring

Canonical public landing page:

```txt
https://aura-sky.skygrid-protocol.net
```

## Role

`aura-sky.skygrid-protocol.net` is the primary public front page for the SKYGRID Emergency Data On-Ramp on Vercel.

This page is the visitor-facing explanation hub. It should link outward to the proof lane, dashboards, status endpoints, partner materials, and operational routes.

## Required Vercel domain binding

Attach this domain to the Aura-core Vercel project:

```txt
aura-sky.skygrid-protocol.net
```

Optional alias after the canonical domain is working:

```txt
aurasky.skygrid-protocol.net
```

If both names are attached to the same project, `aurasky.skygrid-protocol.net` should redirect or link back to the canonical `aura-sky.skygrid-protocol.net` front page.

## DNS record

If the apex/root domain is managed outside Vercel, create the provider's requested DNS record for the subdomain. For most Vercel custom subdomains, this is commonly a CNAME from `aura-sky` to the Vercel assigned CNAME target shown in the Vercel dashboard.

Typical record:

```txt
Type: CNAME
Name: aura-sky
Value: cname.vercel-dns.com
```

Do not change MX, SPF, DKIM, DMARC, or other mail/verification TXT records while moving the front page.

## Front-page linking plan

The canonical front page should link to:

```txt
/dashboard/command-center
/dashboard/validation-panel
/dashboard/deployment-review
/dashboard/receipts
/dispatch
/highway
/health.json
/api/skygrid/status
/api/highway/postman
/api/autodrill/latest
/api/failover/status
```

## Verification commands

Run these after DNS/TLS/domain binding completes:

```bash
SKYGRID_BASE_URL="https://aura-sky.skygrid-protocol.net" pnpm run skygrid:verify
SKYGRID_BASE_URL="https://aura-sky.skygrid-protocol.net" pnpm run skygrid:test:routing
SKYGRID_BASE_URL="https://aura-sky.skygrid-protocol.net" pnpm run aura:selection:watch
```

PowerShell:

```powershell
$env:SKYGRID_BASE_URL="https://aura-sky.skygrid-protocol.net"
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

Pending `401`, `403`, `404`, `DEPLOYMENT_NOT_FOUND`, or certificate responses mean DNS, TLS, Vercel protection, or domain binding is not complete yet. They should not be treated as selector logic failure.
