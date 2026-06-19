#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-${SKYGRID_BASE_URL:-https://aura-core-home-e539c0b1.vercel.app}}"
BASE_URL="${BASE_URL%/}"

VERCEL_BYPASS="${VERCEL_AUTOMATION_BYPASS_SECRET:-}"

echo "SKYGRID Emergency Data On-Ramp smoke test"
echo "Base: ${BASE_URL}"
echo ""

build_url() {
  local path="$1"
  local url="${BASE_URL}${path}"

  if [[ -n "$VERCEL_BYPASS" ]]; then
    if [[ "$url" == *"?"* ]]; then
      url="${url}&x-vercel-set-bypass-cookie=true&x-vercel-protection-bypass=${VERCEL_BYPASS}"
    else
      url="${url}?x-vercel-set-bypass-cookie=true&x-vercel-protection-bypass=${VERCEL_BYPASS}"
    fi
  fi

  echo "$url"
}

check_required() {
  local path="$1"
  local url
  url="$(build_url "$path")"

  local body_file
  body_file="$(mktemp)"

  local code
  code="$(curl -sS -L -o "$body_file" -w "%{http_code}" "$url" || true)"

  echo "== ${path} HTTP ${code}"

  if [[ "$code" != "200" ]]; then
    echo "FAIL: ${BASE_URL}${path} is not ready"
    cat "$body_file" || true
    rm -f "$body_file"
    exit 1
  fi

  cat "$body_file" || true
  echo ""
  rm -f "$body_file"
}

check_optional() {
  local path="$1"
  local url
  url="$(build_url "$path")"

  local code
  code="$(curl -sS -L -o /dev/null -w "%{http_code}" "$url" || true)"

  echo "== ${path} HTTP ${code}"

  if [[ "$code" != "200" ]]; then
    echo "WARN: ${BASE_URL}${path} is optional and did not return 200"
  fi
}

check_required "/api/health"

check_optional "/"
check_optional "/health.json"
check_optional "/api/skygrid/provenance"

echo ""
echo "SKYGRID ramp smoke completed successfully."