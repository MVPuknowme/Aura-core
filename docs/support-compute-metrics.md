# SkyGrid / Aura-Core Support Compute Metrics

This document turns the support-compute opportunity into presentation-ready graph data and dashboard definitions.

## 1. Support Compute Demand by Use Case

Chart type: horizontal bar chart  
Purpose: show which areas need compute support first.

| Use case | Priority score | Notes |
|---|---:|---|
| Hosted demo capacity | 95 | Public demo reliability and onboarding |
| Validator / testnet capacity | 92 | Wallet, Base/L2, and EIP testing |
| RPC / edge fallback | 90 | Reliability and route continuity |
| Uptime / failover testing | 88 | Direct SkyGrid proof metric |
| Device lease marketplace | 78 | Turns idle hardware into capacity |
| Storage / cache support | 68 | Logs, reports, artifacts, dashboard backup |

## 2. Node Health Score Model

Chart type: stacked contribution bar or radar chart  
Purpose: show how a node earns trust.

| Metric | Weight | Good target |
|---|---:|---|
| Uptime | 30 | 95% volunteer / 99% paid |
| Latency | 20 | <300ms preferred |
| Successful probes | 20 | >95% successful checks |
| Bandwidth availability | 15 | Stable enough for assigned workload |
| Compute availability | 10 | CPU/RAM capacity available during drill |
| Error penalty | -15 | Applied for failed probes, unsafe config, or instability |

Formula:

```txt
node_score = uptime + latency + successful_probes + bandwidth + compute_available - error_penalty
```

## 3. Failover Readiness Thresholds

Chart type: gauge cards or traffic-light table  
Purpose: show when a route is healthy, degraded, or down.

| Signal | Healthy | Degraded | Down |
|---|---:|---:|---:|
| Latency | <300ms | 300–800ms | >800ms sustained |
| Packet loss | <5% | 5–20% | >20% |
| Recovery time | <30s | 30–120s | >120s |
| Probe success | >95% | 80–95% | <80% |

## 4. Revenue / Fee Model Example

Chart type: waterfall chart  
Purpose: show gross compute lease value, Aura-Core 3% platform fee, and provider net.

| Gross monthly compute lease | Aura-Core 3% fee | Provider net |
|---:|---:|---:|
| $100 | $3.00 | $97.00 |
| $250 | $7.50 | $242.50 |
| $500 | $15.00 | $485.00 |
| $1,000 | $30.00 | $970.00 |
| $2,500 | $75.00 | $2,425.00 |

Formula:

```txt
provider_net = gross - (gross * 0.03)
aura_fee = gross * 0.03
```

## 5. Auto Drill Report Metrics

Chart type: time-series line chart + incident count card  
Purpose: connect `scripts/auto-drill.sh` and `.github/workflows/auto-drill.yml` to visible proof.

| Drill metric | Source | Display |
|---|---|---|
| HTTP response time | `curl time_total` | line chart |
| Route status | script status field | healthy/degraded/down badge |
| Selected route | script selected_route field | route decision card |
| Recovery time | future drill extension | line chart |
| Drill count | workflow runs | counter |
| Report artifacts | GitHub Actions artifacts | link list |

## 6. Presentation Graph Set

Recommended slide/dashboard order:

1. **Where Compute Support Is Needed** — demand bar chart.
2. **How Nodes Earn Trust** — node health score model.
3. **Failover Readiness** — healthy/degraded/down threshold chart.
4. **Lease Economics** — gross / fee / net waterfall.
5. **Auto Drill Proof Loop** — response-time and incident reporting metrics.

## Compliance / Safety Language

SkyGrid support compute is opt-in and consent-based. No device should run validation, mining, relay, storage, or compute workloads without explicit owner approval, clear power/bandwidth disclosure, and secure configuration. Fees and projected earnings are estimates unless backed by verified customer demand or signed service agreements.
