#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-${SKYGRID_BASE_URL:-https://aura-core-home-e539c0b1.vercel.app}}"
BASE_URL="${BASE_URL%/}"

VERCEL_BYPASS="${VERCEL_AUTOMATION_BYPASS_SECRET:-}"

echo "SKYGRID Emergency Data On-Ramp smoke test"
echo "Base: ${BASE_URL}"
echo ""

curl_args=("-sS" "-L")

if [[ -n "$VERCEL_BYPASS" ]]; then
  curl_args+=(
    -H "x-vercel-protection-bypass: ${VERCEL_BYPASS}"
    -H "x-vercel-set-bypass-cookie: true"
  )
else
  echo "WARN: VERCEL_AUTOMATION_BYPASS_SECRET is not set."
fi

check_required() {
  local path="$1"
  local url="${BASE_URL}${path}"

  local body_file
  body_file="$(mktemp)"

  local code
  code="$(curl "${curl_args[@]}" -o "$body_file" -w "%{http_code}" "$url" || true)"

  echo "== ${path} HTTP ${code}"

  if [[ "$code" != "200" ]]; then
    echo "FAIL: ${url} is not ready"
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
  local url="${BASE_URL}${path}"

  local code
  code="$(curl "${curl_args[@]}" -o /dev/null -w "%{http_code}" "$url" || true)"

  echo "== ${path} HTTP ${code}"

  if [[ "$code" != "200" ]]; then
    echo "WARN: ${url} is optional and did not return 200"
  fi
}

check_required "/api/health"

check_optional "/"
check_optional "/health.json"
check_optional "/api/skygrid/provenance"

echo ""
echo "SKYGRID ramp smoke completed successfully."