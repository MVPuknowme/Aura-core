# SkyGrid Utility Billing System

## Purpose

SkyGrid Utility Billing turns one-time expansion funding into a recurring monthly service model that behaves like a utility bill.

The system supports monthly baseline access, demand-curved usage bands, customer self-service, device/node lease credits, proof logs, and Airtable reconciliation.

## Billing principle

Do not hard-lock customers into rigid SaaS tiers before demand is known. SkyGrid should start with a low monthly access floor and curve billing with actual service demand, device count, event volume, and support focus.

```text
Low friction to start. Curve with demand. Credit verified contribution. Smooth monthly billing.
```

## Billing model

```yaml
billing_model:
  access_floor:
    description: Low monthly base fee that keeps the account, dashboard, support channel, and registry active.
  demand_curve:
    description: Monthly bill adjusts by active devices, preservation windows, checkpoints, node events, and support load.
  usage_bands:
    description: Usage is grouped into bands so customers are not surprised by tiny line-item noise.
  monthly_smoothing:
    description: High-activity months can be capped, averaged, or credited depending on pilot policy.
  credits:
    description: Credits for node hosts, device contributors, pilots, sponsorships, or promotional balances.
  invoices:
    description: Monthly invoice created and collected through Stripe Billing.
  portal:
    description: Customer self-service portal for payment methods, invoices, and subscription management.
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
  skygrid_emergency_memory_window:
    interval: event_or_usage_band_monthly
    purpose: power-loss and fire-risk preservation workflows
  skygrid_storage_checkpoint:
    interval: usage_band_monthly
    purpose: approved folder or device-state checkpoint events
  skygrid_resilience_hub:
    interval: negotiated_monthly
    purpose: community site, local device registry, responder-ready planning, and reports
  skygrid_node_host_lease:
    interval: monthly_credit_or_payout
    purpose: credit for verified participation, uptime, relay checks, or storage checkpoints
```

## Monthly utility invoice structure

```yaml
invoice_lines:
  - access_floor
  - active_device_band
  - heartbeat_check_band
  - emergency_memory_window_events
  - storage_checkpoint_band
  - support_or_focus_band
  - node_host_credit
  - reserve_or_reporting_line
```

## Demand curve examples

```yaml
demand_curve:
  start:
    use: one household or small pilot account
    billing: low access floor plus minimal device band
  growing:
    use: multiple devices, recurring heartbeats, occasional preservation windows
    billing: access floor plus device/event bands
  active:
    use: frequent checkpoints, local node hosting, higher support demand
    billing: higher band with monthly smoothing
  community:
    use: resilience hub, public partner, or business continuity site
    billing: negotiated monthly service plus usage and reports
```

## Pricing posture

Use internal example numbers for testing only. Final pricing should be set after observing pilot demand.

```yaml
pricing_posture:
  fixed_public_tiers: not_final
  pilot_pricing: flexible
  customer_quote: based_on_expected_devices_and_use
  invoice_style: utility_like_monthly
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

1. Create Stripe Products for access floor, device monitoring, emergency window events, storage checkpoints, resilience hub, and node host credits.
2. Create Prices for fixed monthly access and metered or banded usage.
3. Store price IDs in GitHub Actions or server environment variables.
4. Use server-side Checkout Sessions for new accounts.
5. Enable Stripe Customer Portal.
6. Add webhooks for invoice and subscription events.
7. Write invoice/payment events to Airtable.
8. Reconcile host credits monthly.

## First public language

SkyGrid bills like a utility: a simple monthly access floor with flexible usage bands for approved device monitoring, preservation windows, checkpoints, and community resilience support. Early pilot accounts may receive custom pricing while demand patterns are measured.
