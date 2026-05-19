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

## Secret handling

Do not commit Stripe secret values to GitHub, Airtable, B12, client-side code, or public docs.

Store the Stripe server key as a GitHub Actions secret or server environment variable:

```text
STRIPE_SECRET_KEY
```

## Required environment variables

```text
STRIPE_SECRET_KEY
SKYGRID_SUCCESS_URL
SKYGRID_CANCEL_URL
```

Optional:

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

## Compliance note

Keep grant-restricted funds separate from unrestricted Stripe revenue. Do not mix grant money with general sponsorships, service payments, donations, or private investment unless the grant terms allow the exact cost category.
