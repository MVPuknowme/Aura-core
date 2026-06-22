# SKYGRID Social Integrity Gate

## Purpose

Protect controlled social intake channels from spam, bot floods, scam language, fake leads, malformed requests, and abusive automation.

This belongs under the SKYGRID Emergency Data On-Ramp as a traffic-quality and trust layer.

## Supported Local Prototypes

- Instagram Integrity Gate
- Snapchat Integrity Gate
- TikTok Integrity Gate

## Safe Design

The gate may score messages from:

- controlled landing pages
- lead forms
- webhooks
- approved platform APIs
- creator/business inquiry forms

The gate must not:

- scrape private DMs
- capture cookies
- capture passwords
- capture session tokens
- track live location
- identify people from IP/location alone
- store secrets in ledgers

## Decision Model

| Score | Decision |
|---:|---|
| 90-100 | allow |
| 65-89 | allow-log |
| 40-64 | challenge |
| 20-39 | quarantine |
| 0-19 | block |

## Local Ports

| Platform | Port | Health |
|---|---:|---|
| Instagram | 8787 | http://127.0.0.1:8787/health |
| Snapchat | 8788 | http://127.0.0.1:8788/health |
| TikTok | 8789 | http://127.0.0.1:8789/health |

## Production Direction

Move the shared scoring logic into Vercel/SKYGRID API routes later:

- /api/social/instagram
- /api/social/snapchat
- /api/social/tiktok
- /api/social/integrity

Start in allow-log or quarantine mode before hard blocking.
