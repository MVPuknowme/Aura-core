# SkyGrid Utility Billing System

## Purpose

SkyGrid Utility Billing turns one-time expansion funding into a recurring monthly service model.

The system supports monthly subscriptions, optional usage-based charges, customer self-service, device/node lease credits, proof logs, and Airtable reconciliation.

## Billing model

```yaml
billing_model:
  base_subscription:
    description: Monthly access fee for SkyGrid services, dashboard, support, and account presence.
  usage_metering:
    description: Optional usage-based line items for device checks, failover events, storage checkpoints, emergency memory windows, or relay participation.
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
  skygrid_residential_node:
    interval: monthly
    purpose: opt-in device monitoring, Emergency Memory Window readiness, and proof logs
  skygrid_small_business:
    interval: monthly
    purpose: device preservation, uptime readiness, and support bundle
  skygrid_community_resilience_hub:
    interval: monthly
    purpose: local continuity hub, device registry, and responder-ready planning
  skygrid_emergency_memory_window:
    interval: monthly plus optional event usage
    purpose: power-loss and fire-risk preservation workflows
  skygrid_node_host_lease:
    interval: monthly credit or payout
    purpose: credit for verified participation, uptime, relay checks, or storage checkpoints
```

## Monthly utility invoice structure

```yaml
invoice_lines:
  - base_service_fee
  - registered_device_count
  - heartbeat_checks
  - emergency_memory_windows
  - storage_checkpoints
  - node_host_credit
  - reserve_or_reporting_line
```

## Stripe flow

```text
B12 / SkyGrid site
        |
        v
Subscription Checkout Session
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

1. Create Stripe Products and Prices in the Stripe Dashboard.
2. Store price IDs in GitHub Actions or server environment variables.
3. Use server-side Checkout Sessions for new subscriptions.
4. Enable Stripe Customer Portal.
5. Add webhooks for invoice and subscription events.
6. Write invoice/payment events to Airtable.
7. Reconcile host credits monthly.

## Recommended first tiers

```yaml
tiers:
  residential_pilot:
    monthly_base: 9
    use: early household/device preservation pilot
  household_plus:
    monthly_base: 19
    use: multiple devices and Emergency Memory Window readiness
  small_business:
    monthly_base: 49
    use: shop/studio/office continuity bundle
  resilience_hub:
    monthly_base: 149
    use: community site, local device registry, proof logs
```

## Public positioning

SkyGrid bills like a utility: a simple monthly base fee plus optional usage-based services for approved device monitoring, preservation windows, checkpoints, and community resilience support.
