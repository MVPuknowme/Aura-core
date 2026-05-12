# SKYGRID / Aura-Core Validation Links Portal

Issue: #87
Deploy command: `/deploy`
Operator: Michael Vincent Patrick / MVPuknowme
Status: Deployment-ready website and backend plan

## Deployment Purpose

Complete the website link layer for SKYGRID / Aura-Core with public blockchain reference routes and a lawful, opt-in validation pilot.

This plan converts mining-language interest into a transparent participation model:

```text
public explorer links + voluntary validation + consented metrics + aggregate dashboard proof
```

## Core Boundary

This system must be opt-in. It must not run hidden mining, forced device use, silent telemetry, automatic wallet activity, exchange transactions, or guaranteed income claims.

Approved flow:

```text
User opens website
User sees disclosure
User chooses validation pilot
User grants or declines each metric
Backend records approved proof-of-participation metrics
Dashboard displays aggregate validation status
```

## Website Section

### Section Title

```text
Mining & Validation Links
```

### Public Copy

```text
SKYGRID / Aura-Core is preparing an opt-in validation portal for participants who want to help test decentralized infrastructure routes, public block explorer links, and lightweight proof-of-participation metrics.

Participants may voluntarily open validation links, view public blockchain explorers, and submit approved metrics such as local time, approximate location, weather context, and route health for pilot reliability testing.

This is a pilot/demo system. It does not guarantee earnings, does not run hidden mining, and does not collect sensitive credentials. Participation is voluntary, transparent, and reviewable.
```

### Button Map

| Button | Destination | Purpose |
|---|---|---|
| View Ethereum Activity | `https://etherscan.io/` | Public Ethereum block explorer reference |
| View Multi-Chain Activity | `https://blockscan.com/` | Public multi-chain explorer reference |
| Learn About Exchange Routing | Educational exchange/reference page only | Education, not trading action |
| Join Opt-In Validation Pilot | `#validation-consent` | Consent-first validation pilot |
| View Proof Trail | `https://github.com/MVPuknowme/Aura-core/issues/87` | Public project proof |
| Check System Status | `/health.json` or fallback raw GitHub health JSON | Status check |

Fallback status route:

```text
https://raw.githubusercontent.com/MVPuknowme/Aura-core/MVPuknowme/public/health.json
```

## Consent Block

```text
Validation Pilot Consent

Participation is voluntary. You choose which metrics to share. You may decline location access. SKYGRID / Aura-Core uses approved metrics to test route health, validation timing, weather context, and aggregate reliability.

Do not submit private credentials, wallet recovery phrases, passwords, or sensitive financial details.

By continuing, you agree to share only the metrics displayed on this screen for pilot validation purposes.
```

## Backend Route Plan

```text
GET  /health
GET  /validation/status
GET  /validation/config
POST /validation/consent
POST /validation/metrics
GET  /validation/aggregate
```

### Route Responsibilities

#### `GET /health`

Returns service availability and public-safe status.

#### `GET /validation/status`

Returns current validation pilot status and whether metric collection is enabled.

#### `GET /validation/config`

Returns the current consent version, allowed metrics, and privacy defaults.

#### `POST /validation/consent`

Records that the participant accepted the visible validation terms.

#### `POST /validation/metrics`

Records only approved metrics from an opted-in participant.

#### `GET /validation/aggregate`

Returns aggregate public dashboard statistics only.

## Metrics Schema

```json
{
  "participantId": "random_non_identifying_id",
  "consentVersion": "validation-consent-v1",
  "timestampUtc": "ISO_TIMESTAMP",
  "timezone": "America/Los_Angeles",
  "location": {
    "mode": "none | approximate | precise",
    "lat": null,
    "lon": null,
    "accuracyMeters": null
  },
  "weather": {
    "source": "user_provided_or_server_lookup",
    "temperature": null,
    "conditions": null
  },
  "device": {
    "userAgentFamily": "browser_family_only",
    "platform": "mobile_or_desktop",
    "networkType": "optional_browser_reported"
  },
  "validation": {
    "openedEtherscan": false,
    "openedBlockscan": false,
    "openedExchangeReference": false,
    "healthCheckPassed": false,
    "latencyMs": null
  }
}
```

## Privacy Defaults

- Default location mode: `none`
- Use approximate location where possible
- Use random participant IDs by default
- Keep raw telemetry private
- Publish aggregate dashboard metrics only
- Do not request financial credentials
- Do not claim official partnership with Etherscan, Blockscan, Binance, or any exchange unless a contract exists

## Aggregate Dashboard Metrics

Public dashboard may show:

- Total opt-in validation sessions
- Successful health checks
- Average route latency
- Explorer link click counts
- Approximate region count
- Weather-context count
- Validation sessions by day
- CDN cache hit/miss ratio when available
- Error rate by route

## Builder Prompt

Paste into B12 or website builder:

```text
Add a new website section titled "Mining & Validation Links".

Explain that SKYGRID / Aura-Core is launching an opt-in validation pilot for people who want to help test decentralized infrastructure routes, public blockchain explorer links, and proof-of-participation metrics.

Use clear public wording: participation is voluntary, transparent, and pilot/demo only. No guaranteed earnings. No hidden mining. No automatic wallet or exchange actions. No sensitive financial details should be submitted.

Add buttons:
1. View Ethereum Activity -> https://etherscan.io/
2. View Multi-Chain Activity -> https://blockscan.com/
3. Learn About Exchange Routing -> educational/reference page only
4. Join Opt-In Validation Pilot -> #validation-consent
5. View Proof Trail -> https://github.com/MVPuknowme/Aura-core/issues/87
6. Check System Status -> /health.json or the GitHub raw health fallback

Add a consent block explaining that participants choose which metrics to share, may decline location access, and only approved metrics are used for validation testing.

Add an aggregate metrics area showing opt-in sessions, successful health checks, average latency, explorer link clicks, approximate region count, weather-context count, and validation sessions by day.
```

## Backend Implementation Stub

Recommended Flask shape:

```python
from datetime import datetime, timezone
from flask import Flask, jsonify, request

app = Flask(__name__)

CONSENT_VERSION = "validation-consent-v1"

@app.get("/health")
def health():
    return jsonify({
        "service": "SKYGRID / Aura-Core Validation Portal",
        "status": "pilot",
        "ok": True,
        "checkedAt": datetime.now(timezone.utc).isoformat(),
        "notes": "Pilot/demo only. No production uptime guarantee."
    })

@app.get("/validation/config")
def validation_config():
    return jsonify({
        "consentVersion": CONSENT_VERSION,
        "defaultLocationMode": "none",
        "allowedMetrics": [
            "timestampUtc",
            "timezone",
            "locationMode",
            "approximateLocationOptional",
            "weatherContextOptional",
            "browserFamily",
            "platform",
            "routeLatencyMs",
            "explorerLinkOpened"
        ],
        "disallowed": [
            "privateCredentials",
            "walletRecoveryPhrases",
            "passwords",
            "sensitiveFinancialDetails"
        ]
    })

@app.post("/validation/consent")
def validation_consent():
    body = request.get_json(silent=True) or {}
    return jsonify({
        "ok": True,
        "consentVersion": CONSENT_VERSION,
        "participantId": body.get("participantId", "anonymous-pilot"),
        "recordedAt": datetime.now(timezone.utc).isoformat()
    })

@app.post("/validation/metrics")
def validation_metrics():
    body = request.get_json(silent=True) or {}
    return jsonify({
        "ok": True,
        "received": True,
        "consentVersion": body.get("consentVersion"),
        "recordedAt": datetime.now(timezone.utc).isoformat(),
        "notes": "Metrics accepted for pilot validation only."
    })

@app.get("/validation/aggregate")
def validation_aggregate():
    return jsonify({
        "status": "pilot",
        "totalSessions": 0,
        "successfulHealthChecks": 0,
        "averageLatencyMs": None,
        "explorerClicks": {
            "etherscan": 0,
            "blockscan": 0,
            "exchangeReference": 0
        },
        "approximateRegionCount": 0,
        "weatherContextCount": 0,
        "updatedAt": datetime.now(timezone.utc).isoformat()
    })
```

## Rollback Plan

If links or validation copy are not ready:

1. Remove the `Mining & Validation Links` section from B12.
2. Keep only `Check System Status` and `View Proof Trail` buttons.
3. Disable `/validation/metrics` writes.
4. Keep `/health` public.
5. Revert this documentation commit if needed.

## Acceptance Checklist

```text
[ ] Website section added
[ ] All explorer links open safely
[ ] Status route works
[ ] Consent block visible
[ ] Validation endpoints implemented or marked planned
[ ] Metrics are opt-in only
[ ] Aggregate dashboard shows no private raw telemetry
[ ] No official partnership claims
[ ] No guaranteed earnings claims
[ ] No hidden mining language
[ ] Five testers can understand the flow in under 30 seconds
```

## Deployment Status

This document completes the planning deploy for Issue #87. Next deployment stage is implementation in the active Flask/Vercel/B12 surface.
