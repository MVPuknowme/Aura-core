#!/usr/bin/env bash
set -euo pipefail

missing=()

[ -n "${AURA_ENV:-}" ] || missing+=("AURA_ENV")
[ -n "${PEER_SECRET:-}" ] || missing+=("PEER_SECRET")
[ -n "${CHAIN_KEY:-}" ] || missing+=("CHAIN_KEY")

if [ "${SKYGRID_ENV:-staging}" = "staging" ]; then
  [ -n "${STAGING_HEALTH_URL:-}" ] || missing+=("STAGING_HEALTH_URL")
fi

if [ "${SKYGRID_ENV:-}" = "production" ]; then
  [ -n "${PRODUCTION_HEALTH_URL:-}" ] || missing+=("PRODUCTION_HEALTH_URL")
fi

if [ ${#missing[@]} -gt 0 ]; then
  echo "SkyGrid release config blocked. Missing: ${missing[*]}"
  exit 2
fi

echo "SkyGrid release config ready for ${SKYGRID_ENV:-staging}."
