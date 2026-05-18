# SkyGrid Release Configuration Checklist

This file documents the configuration names required by the SkyGrid release pipeline. It does not contain secret values.

## Required GitHub Actions secrets for staging

Add these in GitHub under repository secrets or the `staging` environment secrets:

```text
AURA_ENV
PEER_SECRET
CHAIN_KEY
STAGING_HEALTH_URL
```

## Required GitHub Actions secrets for production

Add these in GitHub under the `production` environment secrets:

```text
AURA_ENV
PEER_SECRET
CHAIN_KEY
PRODUCTION_HEALTH_URL
```

## Optional tracker secrets

The multi-chain tracker uses these when live Dune and Airtable sync are enabled:

```text
DUNE_API_KEY
AIRTABLE_API_KEY or AIRTABLE_TOKEN
AIRTABLE_BASE_ID
DUNE_SCROLL_QUERY_ID
```

## Safe configuration rules

```yaml
safe_config_rules:
  never_commit:
    - real secret values
    - wallet private keys
    - seed phrases
    - raw credentials
    - personal files
    - bank details
  allowed_in_repo:
    - variable names
    - documentation
    - example URLs using placeholders
    - non-sensitive defaults
    - status check commands
```

## Recommended setup path

1. Go to GitHub repository settings.
2. Open `Secrets and variables`.
3. Open `Actions`.
4. Add required repository secrets or environment secrets.
5. Rerun `SKYGRID Release Pipeline`.
6. Confirm the staging deploy summary says configuration is ready.

## Expected pipeline behavior

```yaml
without_required_secrets:
  build: allowed
  staging_deploy: skipped_with_warning
  production_deploy: skipped

with_staging_secrets:
  build: allowed
  staging_deploy: allowed
  health_check: requires_STAGING_HEALTH_URL

with_production_secrets:
  production_deploy: allowed_after_smoke_test
  production_health_check: requires_PRODUCTION_HEALTH_URL
```

## Proof note

The release pipeline is intentionally fail-safe. Missing deployment secrets should block live deploys without marking the code build as broken.
