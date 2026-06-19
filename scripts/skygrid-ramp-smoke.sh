#!/usr/bin/env bash
set -euo pipefail

BASE="${1:-https://aura-core-home-e539c0b1.vercel.app}"

echo "SKYGRID Emergency Data On-Ramp smoke test"
echo "Base: $BASE"
echo

paths=(
  "/"
  "/health.json"
  "/dispatch"
  "/highway"
  "/api/skygrid/status"
  "/api/highway/status"
  "/api/highway/postman"
  "/api/pay/quote?amount=25"
)

for path in "${paths[@]}"; do
  printf "== %-32s " "$path"
  code="$(curl -sS -o /tmp/skygrid-ramp-response.txt -w "%{http_code}" "$BASE$path" || true)"
  echo "HTTP $code"
  if [[ "$code" == "404" || "$code" == "000" ]]; then
    echo "FAIL: $BASE$path is not ready"
    cat /tmp/skygrid-ramp-response.txt || true
    exit 1
  fi
done

echo
echo "POST /api/skygrid/intake"
code="$(curl -sS -o /tmp/skygrid-ramp-response.txt -w "%{http_code}" \
  -H "Content-Type: application/json" \
  -d '{"source":"smoke-test","type":"system-health","message":"SKYGRID smoke validation"}' \
  "$BASE/api/skygrid/intake" || true)"
echo "HTTP $code"
cat /tmp/skygrid-ramp-response.txt
echo

if [[ "$code" != "202" && "$code" != "502" ]]; then
  echo "FAIL: intake route did not return accepted or upstream failure"
  exit 1
fi

echo "PASS: public routes are present. If intake returned 502, configure AWS env secrets in Vercel."
