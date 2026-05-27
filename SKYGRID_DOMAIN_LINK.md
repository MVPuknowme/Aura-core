# SKYGRID Protocol Domain Link

Canonical production domain:

```txt
https://skygrid-protocol.net
```

## Domain role

`skygrid-protocol.net` is the public SKYGRID Protocol identity and should be treated as the stable entry point for demos, documentation, dashboards, validator status, and operational routing.

## Recommended subdomain map

| Host | Purpose |
|---|---|
| `skygrid-protocol.net` | Public landing page and demo entry |
| `www.skygrid-protocol.net` | Redirect to apex domain |
| `api.skygrid-protocol.net` | Runtime API, health checks, validator telemetry |
| `command.skygrid-protocol.net` | Operator dashboard / SKYGRID Command |
| `docs.skygrid-protocol.net` | Protocol docs, deployment notes, onboarding |
| `status.skygrid-protocol.net` | Uptime, incident, and route health reporting |

## Deployment targets

Initial recommended routing:

- Apex/root domain: Vercel or primary web host
- `www`: redirect to root
- `api`: Vercel serverless API, AWS API Gateway, or Cloudflare Worker
- `command`: dashboard deployment
- `docs`: GitHub Pages, Vercel docs app, or static docs build
- `status`: uptime/status page

## Required DNS records

Exact values depend on the active host, but the expected pattern is:

```txt
A / CNAME   skygrid-protocol.net        -> production frontend target
CNAME       www                         -> skygrid-protocol.net
CNAME       api                         -> production API target
CNAME       command                     -> dashboard target
CNAME       docs                        -> documentation target
CNAME       status                      -> status page target
TXT         _skygrid                    -> ownership / deployment verification note
```

## Operational rule

All public SKYGRID links should prefer `https://skygrid-protocol.net` over temporary preview, staging, B12, GitHub Pages, or raw Vercel URLs once DNS and SSL are verified.

## Validation checklist

- [ ] Add domain in Vercel / hosting provider
- [ ] Add DNS records at registrar or Cloudflare
- [ ] Enable HTTPS / SSL
- [ ] Redirect `www` to apex
- [ ] Confirm `/api/health` or equivalent runtime health path
- [ ] Confirm public landing page loads on mobile
- [ ] Confirm docs/dashboard links resolve
- [ ] Update README and public materials to use canonical domain

## Ownership note

SKYGRID Protocol is operated under the MVPuknowme / Aura-Core project lineage with Michael Vincent Patrick as creator/operator unless superseded by a later signed governance document.
