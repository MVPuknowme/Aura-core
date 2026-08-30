#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-${SKYGRID_BASE_URL:-http://127.0.0.1:3000}}"
BASE_URL="${BASE_URL%/}"

echo "SKYGRID Emergency Data On-Ramp smoke test"
echo "Base: ${BASE_URL}"
echo "Mode: local/devcontainer-first"
echo ""

curl_args=("-sS" "-L")

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

check_post_accepted() {
  local path="$1"
  local url="${BASE_URL}${path}"

  local body_file
  body_file="$(mktemp)"

  local code
  code="$(curl "${curl_args[@]}" \
    -H "Content-Type: application/json" \
    -X POST \
    -d '{"source":"github-smoke","type":"system-health","severity":"normal"}' \
    -o "$body_file" \
    -w "%{http_code}" \
    "$url" || true)"

  echo "== ${path} HTTP ${code}"

  if [[ "$code" != "202" && "$code" != "200" ]]; then
    echo "FAIL: ${url} did not accept smoke payload"
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

# Required routes must match config/skygrid-route-manifest.json and api/runtime.mjs.
check_required "/"
check_required "/health.json"
check_required "/api/skygrid/status"
check_required "/api/highway/status"
check_required "/api/failover/status"
check_required "/api/panels/summary"
check_required "/api/autodrill/latest"

# Required POST acceptance routes for proof-of-intake and advisory routing.
check_post_accepted "/api/skygrid/intake"
check_post_accepted "/api/aura-core/decide"
check_post_accepted "/api/agent/signals"

# Optional dashboard/business routes.
check_optional "/dashboard/command-center"
check_optional "/dashboard/validation-panel"
check_optional "/dashboard/deployment-review"
check_optional "/dashboard/receipts"
check_optional "/api/highway/postman"
check_optional "/api/pay/quote?amount=25"

echo ""
echo "SKYGRID ramp smoke completed successfully."
