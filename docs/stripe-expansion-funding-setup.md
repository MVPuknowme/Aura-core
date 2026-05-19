# Stripe Expansion Funding Setup

## Purpose

This guide configures Stripe as the safe collection rail for SkyGrid / Aura-Core expansion funding.

Use Stripe to collect pilot funding, sponsorships, service payments, and partner contributions for:

- SkyGrid expansion
- building lease planning
- hiring assistance
- device onboarding
- Emergency Memory Window pilot work
- reporting and reserve

## Key handling

Stripe uses two important key types:

```yaml
stripe_keys:
  publishable_key:
    prefix: pk_live_or_pk_test
    visibility: public_client_safe
    use: B12 site, public checkout button, browser-side Stripe initialization
  secret_key:
    prefix: sk_live_or_sk_test
    visibility: server_only
    use: server-side checkout sessions, webhooks, payment operations
```

Do not commit Stripe secret values to GitHub, Airtable, B12, client-side code, or public docs.

Store the Stripe server key as a GitHub Actions secret or server environment variable:

```text
STRIPE_SECRET_KEY
```

The publishable key may be exposed to the browser, but should still be kept configurable for easy rotation:

```text
STRIPE_PUBLISHABLE_KEY
```

For B12, place the publishable key only where Stripe/public checkout configuration expects a public key. Do not place the secret key in B12.

## Required server environment variables

```text
STRIPE_SECRET_KEY
SKYGRID_SUCCESS_URL
SKYGRID_CANCEL_URL
```

## Optional public/client environment variable

```text
STRIPE_PUBLISHABLE_KEY
```

Optional server values:

```text
SKYGRID_EXPANSION_AMOUNT_USD
SKYGRID_FUNDING_BUCKET
SKYGRID_PAYMENT_DESCRIPTION
```

## Funding bucket examples

```yaml
funding_buckets:
  expansion_general: Core SkyGrid / Aura-Core expansion
  building_lease: Deposit, rent, utilities, insurance, workspace setup
  hiring_assistance: Contractors, admin help, developer support, grant writing, field onboarding
  device_onboarding: Device registry, QR materials, local agent pilot, user support
  emergency_memory_window: Emergency preservation pilot, proof logs, outreach
  compliance_reporting: Grant/reporting/admin support
  reserve: Fees, refunds, chargebacks, emergency buffer
```

## Create a test checkout session

```bash
export STRIPE_SECRET_KEY="set_this_in_your_secret_manager"
export SKYGRID_SUCCESS_URL="https://example.com/success"
export SKYGRID_CANCEL_URL="https://example.com/cancel"
export SKYGRID_EXPANSION_AMOUNT_USD="25"
export SKYGRID_FUNDING_BUCKET="expansion_general"

npm run stripe:expansion-session
```

The script prints a Stripe Checkout URL that can be opened for a test payment.

## Script

```text
scripts/create-stripe-expansion-session.mjs
```

## Airtable ledger

Record Stripe collections in Airtable using:

- Income Dashboard: Stripe Expansion Funding Rail
- Sun Pay Payout Logs: stripe-expansion-ledger-seed-2026-05-19

Track:

```yaml
ledger_fields:
  - transaction reference
  - gross amount
  - fees
  - net amount
  - funding bucket
  - purpose
  - receipt reference
  - approval status
  - grant restricted flag
```

## B12 button copy

```text
Fund SkyGrid Expansion
```

Button description:

```text
Support SkyGrid expansion, emergency memory preservation pilots, device onboarding, building lease planning, and hiring assistance. All funds are tracked by purpose for responsible expansion.
```

## B12 Stripe setup note

Use the publishable key for browser/public checkout setup. Use a Stripe-hosted Payment Link or server-created Checkout Session for actual payment collection. Never paste a secret key into B12 page code.

Recommended button destinations:

```yaml
b12_buttons:
  fund_skygrid_expansion: Stripe Payment Link or server-created Checkout URL
  sponsor_emergency_memory_window: Stripe Payment Link with metadata/bucket tracking
  request_pilot: B12 intake form plus follow-up invoice/payment link
```

## Compliance note

Keep grant-restricted funds separate from unrestricted Stripe revenue. Do not mix grant money with general sponsorships, service payments, donations, or private investment unless the grant terms allow the exact cost category.
