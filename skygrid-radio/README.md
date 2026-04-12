# SkyGrid Radio Deploy Scaffold

This scaffold stages a minimal SkyGrid/Radio deployment inside Aura-core.

## Included
- `config.yaml` — runtime configuration template
- `deploy.sh` — placeholder deploy entrypoint
- `status.json` — initial deployment status marker

## Purpose
Create a safe landing zone for SkyGrid radio deployment logic without overwriting existing Aura-core files.

## Next steps
- bind RPC / transport targets
- add radio service runtime
- connect observability/logging
- wire CI/CD or remote deploy target
