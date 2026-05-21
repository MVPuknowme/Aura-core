# SkyGrid Auto Drill Resource Selector

## Purpose

SkyGrid Auto Drill should evaluate available network and resource lanes, then recommend the best path for onboarding, compute contribution, processing performance, storage support, platform discovery, or emergency-readiness routing.

This component is advisory and proof-gated. It does not automatically claim resources, execute payments, activate nodes, alter wallets, change production infrastructure, or override human approval.

## Core Idea

Onboarders may provide or request different resource types:

- Processor power
- Runtime performance
- Storage capacity
- Local network availability
- Failover transport
- API platform access
- Web3 settlement or validation rails
- Edge node participation
- Proof/document readiness

Auto Drill selects the best network lane by scoring each candidate against technical, operational, and proof-readiness criteria.

## Supported Network / Resource Lanes

- base
- usdc
- x402
- allbridge
- helium
- ton
- cloudflare
- blockscout
- local_wifi
- lora
- azure
- railway
- vercel
- aws_lambda
- aws_dynamodb
- aws_s3
- community_compute
- device_compute
- solar_backup

## Use Cases

### 1. Provide Processor Power

The onboarder has a device, server, warehouse machine, solar-backed system, or local compute lane that can contribute processing capacity.

Recommended scoring emphasis:

- CPU / runtime availability
- uptime
- latency
- energy reliability
- bandwidth
- proof packet completeness
- region fit
- cost band

### 2. Provide Performance / Failover

The onboarder can improve response, routing, fallback, or edge delivery.

Recommended scoring emphasis:

- total_response_ms
- packet loss
- uptime
- route diversity
- transport type
- region
- endpoint health
- failover readiness

### 3. Find Resources on Platforms

The onboarder or operator wants SkyGrid to identify which platform is best suited for the requested need.

Recommended scoring emphasis:

- platform capability
- integration readiness
- existing credentials/status
- proof availability
- cost risk
- deployment risk
- human approval requirement

## Resource Intent Types

- provide_compute
- request_compute
- provide_storage
- request_storage
- provide_network
- request_network
- provide_failover
- request_failover
- find_platform_resource
- onboard_node
- validate_proof

## Candidate Score Fields

Each candidate lane should be evaluated with:

- network
- resourceType
- region
- latencyMs
- uptimePct
- packetLossPct
- computeScore
- storageScore
- bandwidthScore
- energyScore
- integrationReady
- proofReady
- humanApprovalRequired
- riskLevel
- costBand
- status
- evidenceUrls

## Recommended Score Formula

```text
score =
  latencyScore * 0.20 +
  uptimeScore * 0.20 +
  proofScore * 0.15 +
  integrationScore * 0.15 +
  resourceFitScore * 0.20 +
  riskScore * 0.10
```

Score bands:

- 90-100 = best
- 75-89 = strong
- 60-74 = usable
- 40-59 = caution
- 0-39 = avoid

## Gold / Silver / Bronze Latency Mapping

- Gold: total_response_ms <= 500
- Silver: total_response_ms <= 1500
- Bronze: total_response_ms <= 3000
- Fail: total_response_ms > 3000

Bronze or better can be considered emergency-ready for advisory planning. Gold indicates preferred response performance.

## Decision Output

Auto Drill should return:

```json
{
  "ok": true,
  "intent": "provide_compute",
  "recommendedNetwork": "cloudflare",
  "recommendedResourceType": "edge_compute",
  "score": 91,
  "band": "best",
  "latencyGrade": "gold",
  "riskLevel": "Low",
  "proofRequired": true,
  "humanApprovalRequired": true,
  "allowedToExecute": false,
  "reason": "Best fit based on latency, integration readiness, region fit, and proof availability.",
  "alternates": [
    {
      "network": "aws_lambda",
      "score": 86,
      "band": "strong"
    },
    {
      "network": "local_wifi",
      "score": 72,
      "band": "usable"
    }
  ],
  "nextAction": "Create preflight record and request proof approval before activation."
}
```

## Execution Guardrail

Auto Drill can recommend. It cannot execute without the SkyGrid Preflight Protection Lane.

Required sequence:

1. Dry-run selection
2. Advisory recommendation
3. Preflight record
4. Proof/evidence attachment
5. Human approval
6. Execution by authorized system or operator

## Integration Points

- Flask onboarding gateway
- Postman preflight collection
- Airtable SkyGrid Web3 Onboarders table
- DynamoDB preflight records
- Linear issues
- GitHub workflow evidence
- Vercel / Railway / Azure / AWS deployment status
- SkyGrid dashboard readiness display

## Acceptance Criteria

- Auto Drill accepts resource intent and candidate lanes.
- Auto Drill scores candidates consistently.
- Auto Drill recommends best, alternate, and avoid lanes.
- Auto Drill returns proof and approval requirements.
- Auto Drill blocks direct activation or execution.
- Auto Drill output can be written into Airtable, DynamoDB, and proof packets.
