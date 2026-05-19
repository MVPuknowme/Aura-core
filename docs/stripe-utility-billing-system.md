# SkyGrid Utility Billing System

## Purpose

SkyGrid Utility Billing turns one-time expansion funding into a recurring monthly service model that behaves like a utility bill.

The system supports fixed tier anchors, adaptive usage riders, two-way bridge billing, Web3 infrastructure backup rates, ISP condition adjustments, emergency data-pack pricing, infrastructure support insurance, device/node lease credits, proof logs, and Airtable reconciliation.

## Billing principle

SkyGrid should keep clear set rates with tier anchors, then adjust based on what the customer actually uses at the edge.

```text
Set the base rate. Track the real use. Add the correct rider. Credit verified contribution. Smooth the monthly bill.
```

## Billing model

```yaml
billing_model:
  tier_anchor:
    description: Fixed monthly base rate for the account class or service focus.
  adaptive_riders:
    description: Add-on charges or credits based on bridge use, Web3 backup use, ISP state, emergency demand, and support load.
  usage_bands:
    description: Usage is grouped into bands so customers are not surprised by noisy micro-line-items.
  monthly_smoothing:
    description: High-activity months can be capped, averaged, credited, or escalated depending on policy and demand.
  contribution_credits:
    description: Credits for verified node hosts, device contributors, storage checkpoints, relay checks, or infrastructure support.
  invoices:
    description: Monthly invoice created and collected through Stripe Billing.
  portal:
    description: Customer self-service portal for payment methods, invoices, and subscription management.
```

## Tier anchors

These are starting rate anchors, not final locked pricing. Each tier can receive adaptive riders.

```yaml
tier_anchors:
  residential_base:
    use: household/device owner account
    billing: fixed_monthly_base_plus_usage_riders
  household_plus:
    use: multiple devices, recurring checks, emergency memory readiness
    billing: higher_fixed_base_plus_usage_riders
  small_business:
    use: shop, studio, office, or local business continuity account
    billing: fixed_business_base_plus_device_and_event_riders
  resilience_hub:
    use: community site, local partner, emergency continuity site
    billing: negotiated_base_plus_reports_and_event_riders
  infrastructure_partner:
    use: ISP, Web3, server bank, edge node, or local infrastructure partner
    billing: negotiated_base_plus_bridge_and_support_riders
```

## Adaptive riders

```yaml
adaptive_riders:
  two_way_bridge_rider:
    trigger: customer uses SkyGrid two-way bridge for data movement, relay, checkpoint routing, or continuity support
    rate_basis:
      - bridge_sessions
      - data_pack_size_band
      - verified_relay_events
      - service_priority
    notes: charge only when the two-way bridge is used or reserved

  web3_infrastructure_backup_rider:
    trigger: SkyGrid is used to back up or stabilize Web3 infrastructure
    rate_basis:
      - ETH_reference_rate
      - gas_or_execution_conditions
      - validator_or_node_support_window
      - proof_log_volume
    notes: use ETH-linked reference logic for Web3 infrastructure support while avoiding automatic asset movement

  isp_condition_rider:
    trigger: ISP/service condition affects the route, availability, or failover need
    rate_basis:
      - isp_up_status
      - isp_down_status
      - degraded_or_congested_trend
      - failover_need_detected
      - recovery_window
    notes: follow the observed ISP trend; up/down/degraded state changes the rider and proof requirement

  crisis_emergency_data_pack_rider:
    trigger: emergency, outage, fire-risk, evacuation, or preservation window event
    rate_basis:
      - local_supply_availability
      - local_demand_pressure
      - data_pack_size_band
      - preservation_window_minutes
      - support_priority
    notes: crisis data-pack rate is local-supply sensitive and time-window sensitive

  infrastructure_support_insurance_rider:
    trigger: SkyGrid provides support or continuity coverage for infrastructure risk
    rate_basis:
      - covered_device_or_node_count
      - agreed_support_window
      - proof_log_requirement
      - recovery_or_checkpoint_scope
    notes: billed as an infrastructure support / insurance-style add-on, not as a guaranteed emergency outcome
```

## Product lines

```yaml
products:
  skygrid_access_floor:
    interval: monthly
    purpose: account presence, dashboard, support, and registry access
  skygrid_device_monitoring:
    interval: usage_band_monthly
    purpose: active device checks, heartbeat, status, and proof logs
  skygrid_two_way_bridge:
    interval: usage_or_reserved_capacity
    purpose: bridge-backed data movement, relay, failover, and checkpoint routing
  skygrid_web3_infrastructure_backup:
    interval: usage_or_support_window
    purpose: Web3 node, validator, ETH-referenced infrastructure support and proof logging
  skygrid_isp_condition_failover:
    interval: event_or_trend_based
    purpose: ISP up/down/degraded route response and continuity billing
  skygrid_emergency_memory_window:
    interval: event_or_usage_band_monthly
    purpose: power-loss and fire-risk preservation workflows
  skygrid_crisis_data_pack:
    interval: event_based
    purpose: local emergency data pack preservation and support
  skygrid_infrastructure_support_insurance:
    interval: monthly_or_event_based
    purpose: support coverage for device, node, route, or infrastructure risk
  skygrid_node_host_lease:
    interval: monthly_credit_or_payout
    purpose: credit for verified participation, uptime, relay checks, or storage checkpoints
```

## Monthly utility invoice structure

```yaml
invoice_lines:
  - tier_anchor_base_rate
  - active_device_band
  - heartbeat_check_band
  - two_way_bridge_rider
  - web3_infrastructure_backup_rider
  - isp_condition_rider
  - emergency_memory_window_events
  - crisis_data_pack_rider
  - storage_checkpoint_band
  - infrastructure_support_insurance_rider
  - node_host_credit
  - reserve_or_reporting_line
```

## Rate adjustment logic

```yaml
rate_adjustment_logic:
  base:
    action: apply selected tier anchor
  if_two_way_bridge_used:
    action: add bridge rider based on sessions, size band, and priority
  if_web3_backup_used:
    action: add ETH-referenced infrastructure backup rider
  if_isp_up:
    action: normal routing rate or monitoring-only rate
  if_isp_degraded:
    action: add degraded trend/failover readiness rider
  if_isp_down:
    action: add failover event or recovery window rider
  if_crisis_or_emergency:
    action: apply crisis data-pack rate based on local supply, urgency, and approved scope
  if_infrastructure_support:
    action: add support insurance rider for agreed coverage window
  if_host_contributes_verified_capacity:
    action: apply credit or payout ledger entry
```

## Demand curve examples

```yaml
demand_curve:
  start:
    use: one household or small pilot account
    billing: tier anchor plus minimal device band
  growing:
    use: multiple devices, recurring heartbeats, occasional preservation windows
    billing: tier anchor plus device/event bands
  active:
    use: frequent checkpoints, bridge use, local node hosting, higher support demand
    billing: tier anchor plus adaptive riders with monthly smoothing
  infrastructure:
    use: ISP, Web3, server bank, edge node, or local continuity partner
    billing: negotiated tier anchor plus bridge, Web3, ISP, and insurance riders
  crisis:
    use: outage, fire-risk, emergency preservation, high local demand
    billing: emergency data-pack rider plus proof logs and time-window limits
```

## Pricing posture

Use internal example numbers for testing only. Final pricing should be adjusted after observing pilot demand, bridge use, local supply, infrastructure support load, and customer class.

```yaml
pricing_posture:
  fixed_tier_anchors: required
  adaptive_riders: required
  customer_quote: based_on_tier_plus_expected_use
  invoice_style: utility_like_monthly
  web3_reference: ETH_rate_when_web3_infrastructure_backup_is_used
  isp_reference: up_down_degraded_trend_when_route_support_is_used
  crisis_reference: local_supply_and_data_pack_rate_when_emergency_window_is_used
  infrastructure_support: insurance_style_add_on_when_support_coverage_is_requested
  contribution_credit: based_on_verified_node_or_device_participation
```

## Stripe flow

```text
B12 / SkyGrid site
        |
        v
Subscription or quote-based Checkout Session
        |
        v
Stripe Customer + Subscription
        |
        v
Monthly invoice lifecycle
        |
        v
Webhook events
        |
        v
Airtable ledger + Device Registry + Payout Logs
        |
        v
Customer portal for self-service billing
```

## First implementation steps

1. Create Stripe Products for tier anchors and adaptive riders.
2. Create Prices for fixed monthly bases, usage bands, and event riders.
3. Store price IDs in GitHub Actions or server environment variables.
4. Use server-side Checkout Sessions for new accounts.
5. Enable Stripe Customer Portal.
6. Add webhooks for invoice and subscription events.
7. Write invoice/payment events to Airtable.
8. Reconcile host credits monthly.
9. Review bridge, Web3, ISP, crisis, and infrastructure support riders before each billing cycle.

## First public language

SkyGrid bills like a utility: a set monthly rate with adaptive riders for approved device monitoring, two-way bridge use, Web3 infrastructure backup, ISP failover conditions, emergency data packs, and infrastructure support coverage. Early pilot accounts may receive custom quotes while local demand and route conditions are measured.
