#!/usr/bin/env bash
set -euo pipefail

# SkyGrid / Aura-Core Auto Drill
# Safe advisory failover drill using authorized endpoints only.
# No wallet signing, no private keys, no packet interception, no third-party tampering.

DRILL_NAME="skygrid-auto-drill"
DRILL_ID="${DRILL_ID:-$(date -u +%Y%m%dT%H%M%SZ)}"
OUT_DIR="${OUT_DIR:-drill-reports}"
REPORT_JSON="$OUT_DIR/${DRILL_NAME}-${DRILL_ID}.json"
REPORT_MD="$OUT_DIR/${DRILL_NAME}-${DRILL_ID}.md"

PRIMARY_URL="${PRIMARY_URL:-https://skygrid-gs3e.b12sites.com/}"
FALLBACK_URL="${FALLBACK_URL:-https://github.com/MVPuknowme/Aura-core}"
SIMULATE_FAILURE="${SIMULATE_FAILURE:-true}"
SAMPLES="${SAMPLES:-3}"
TIMEOUT_SECONDS="${TIMEOUT_SECONDS:-10}"

mkdir -p "$OUT_DIR"

now_utc() {
  date -u +%Y-%m-%dT%H:%M:%SZ
}

probe_url() {
  local name="$1"
  local url="$2"
  local started ended http_code total_time result

  started="$(now_utc)"

  set +e
  read -r http_code total_time < <(
    curl \
      --location \
      --silent \
      --output /dev/null \
      --write-out "%{http_code} %{time_total}" \
      --max-time "$TIMEOUT_SECONDS" \
      "$url"
  )
  result=$?
  set -e

  ended="$(now_utc)"

  if [[ "$result" -eq 0 && "$http_code" =~ ^2|3 ]]; then
    status="healthy"
  elif [[ "$result" -eq 0 ]]; then
    status="degraded"
  else
    status="down"
  fi

  printf '{"name":"%s","url":"%s","started_at":"%s","ended_at":"%s","http_code":"%s","time_total_seconds":%s,"curl_exit":%s,"status":"%s"}' \
    "$name" "$url" "$started" "$ended" "${http_code:-000}" "${total_time:-0}" "$result" "$status"
}

sample_route() {
  local name="$1"
  local url="$2"
  local items=()

  for i in $(seq 1 "$SAMPLES"); do
    items+=("$(probe_url "$name" "$url")")
    sleep 1
  done

  local joined
  joined=$(IFS=,; echo "${items[*]}")
  printf '[%s]' "$joined"
}

recommend_route() {
  local primary_status="$1"
  local fallback_status="$2"

  if [[ "$SIMULATE_FAILURE" == "true" ]]; then
    echo "fallback"
    return
  fi

  case "$primary_status:$fallback_status" in
    healthy:*) echo "primary" ;;
    degraded:healthy|down:healthy) echo "fallback" ;;
    degraded:degraded) echo "primary_degraded_hold" ;;
    down:degraded) echo "fallback_degraded" ;;
    *) echo "manual_review" ;;
  esac
}

latest_status() {
  python3 - "$1" <<'PY'
import json, sys
items = json.loads(sys.argv[1])
print(items[-1].get("status", "unknown") if items else "unknown")
PY
}

printf '== SkyGrid / Aura-Core Auto Drill ==\n'
printf 'Drill ID: %s\n' "$DRILL_ID"
printf 'Primary: %s\n' "$PRIMARY_URL"
printf 'Fallback: %s\n' "$FALLBACK_URL"
printf 'Simulate failure: %s\n\n' "$SIMULATE_FAILURE"

STARTED_AT="$(now_utc)"
BASELINE_PRIMARY="$(sample_route primary "$PRIMARY_URL")"
BASELINE_FALLBACK="$(sample_route fallback "$FALLBACK_URL")"

PRIMARY_STATUS="$(latest_status "$BASELINE_PRIMARY")"
FALLBACK_STATUS="$(latest_status "$BASELINE_FALLBACK")"
SELECTED_ROUTE="$(recommend_route "$PRIMARY_STATUS" "$FALLBACK_STATUS")"
ENDED_AT="$(now_utc)"

cat > "$REPORT_JSON" <<JSON
{
  "drill_name": "$DRILL_NAME",
  "drill_id": "$DRILL_ID",
  "started_at": "$STARTED_AT",
  "ended_at": "$ENDED_AT",
  "mode": "advisory_simulation",
  "simulate_failure": "$SIMULATE_FAILURE",
  "primary_url": "$PRIMARY_URL",
  "fallback_url": "$FALLBACK_URL",
  "primary_status": "$PRIMARY_STATUS",
  "fallback_status": "$FALLBACK_STATUS",
  "selected_route": "$SELECTED_ROUTE",
  "operator_decision": "auto-drill-no-live-handoff",
  "safety_boundary": "authorized endpoints only; no wallet signing; no private keys; no packet interception; no unauthorized network manipulation",
  "baseline_primary": $BASELINE_PRIMARY,
  "baseline_fallback": $BASELINE_FALLBACK
}
JSON

cat > "$REPORT_MD" <<MD
# SkyGrid / Aura-Core Auto Drill Report

- Drill ID: $DRILL_ID
- Started: $STARTED_AT
- Ended: $ENDED_AT
- Mode: advisory_simulation
- Simulated failure: $SIMULATE_FAILURE
- Primary URL: $PRIMARY_URL
- Fallback URL: $FALLBACK_URL
- Primary status: $PRIMARY_STATUS
- Fallback status: $FALLBACK_STATUS
- Selected route: $SELECTED_ROUTE
- Operator decision: auto-drill-no-live-handoff

## Safety boundary

Authorized endpoints only. No wallet signing, no private keys, no packet interception, and no unauthorized network manipulation.

## Output artifacts

- JSON: $REPORT_JSON
- Markdown: $REPORT_MD
MD

printf '\nAuto drill complete.\n'
printf 'Selected route: %s\n' "$SELECTED_ROUTE"
printf 'JSON report: %s\n' "$REPORT_JSON"
printf 'Markdown report: %s\n' "$REPORT_MD"
