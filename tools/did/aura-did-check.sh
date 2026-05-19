#!/usr/bin/env bash
set -Eeuo pipefail

# Aura Open Protocol DID check helper
# Usage:
#   ./tools/did/aura-did-check.sh did:aura:mvpuknowme
#   AURA_DID=did:aura:mvpuknowme ./tools/did/aura-did-check.sh

BASE_URL="${AURA_DID_CHECK_URL:-https://agent.auraopenprotocol.org/check}"
DID="${1:-${AURA_DID:-did:aura:mvpuknowme}}"
TIMEOUT_SECONDS="${AURA_DID_TIMEOUT_SECONDS:-10}"

if [[ -z "$DID" || "$DID" == "did:aura:" ]]; then
  echo "ERROR: DID is incomplete. Expected did:aura:<identifier>, got '$DID'" >&2
  exit 64
fi

if [[ ! "$DID" =~ ^did:aura:.+ ]]; then
  echo "ERROR: Unsupported DID format. Expected did:aura:<identifier>, got '$DID'" >&2
  exit 65
fi

if command -v python3 >/dev/null 2>&1; then
  ENCODED_DID="$(python3 - <<PY
import urllib.parse
print(urllib.parse.quote('${DID}', safe=''))
PY
)"
else
  ENCODED_DID="${DID//:/%3A}"
fi

URL="${BASE_URL}?did=${ENCODED_DID}"
OUT="${AURA_DID_OUTPUT:-aura-did-check-result.json}"
TMP_BODY="$(mktemp)"
trap 'rm -f "$TMP_BODY"' EXIT

START_MS="$(date +%s%3N 2>/dev/null || python3 - <<'PY'
import time
print(int(time.time()*1000))
PY
)"

HTTP_CODE="$(curl -sS -L --max-time "$TIMEOUT_SECONDS" -o "$TMP_BODY" -w '%{http_code}' "$URL" || echo '000')"

END_MS="$(date +%s%3N 2>/dev/null || python3 - <<'PY'
import time
print(int(time.time()*1000))
PY
)"
RESPONSE_TIME_MS="$((END_MS - START_MS))"
TIMESTAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

STATUS="PASS"
if [[ "$HTTP_CODE" == "000" || "$HTTP_CODE" -ge 500 ]]; then
  STATUS="FAIL"
elif [[ "$HTTP_CODE" -ge 400 ]]; then
  STATUS="DEGRADED"
fi

if command -v jq >/dev/null 2>&1 && jq -e . "$TMP_BODY" >/dev/null 2>&1; then
  BODY_MODE="json"
  BODY_COMPACT="$(jq -c . "$TMP_BODY")"
else
  BODY_MODE="text"
  BODY_COMPACT="$(head -c 500 "$TMP_BODY" | tr '\n' ' ' | sed 's/"/\\"/g')"
fi

cat > "$OUT" <<EOF
{
  "ack": $([[ "$STATUS" == "PASS" ]] && echo true || echo false),
  "endpoint": "aura_did_check",
  "base_url": "$BASE_URL",
  "did": "$DID",
  "url": "$URL",
  "http_code": $HTTP_CODE,
  "response_time_ms": $RESPONSE_TIME_MS,
  "status": "$STATUS",
  "body_mode": "$BODY_MODE",
  "body_preview": "$BODY_COMPACT",
  "timestamp": "$TIMESTAMP"
}
EOF

cat "$OUT"

if [[ "$STATUS" == "FAIL" ]]; then
  exit 1
fi
