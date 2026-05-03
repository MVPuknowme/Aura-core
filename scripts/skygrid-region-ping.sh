#!/usr/bin/env bash
set -euo pipefail
set +H 2>/dev/null || true

REGION_LABEL="${1:-aws-us-east-1-virginia}"
NETWORK_LABEL="${2:-network}"
PACKETS="${PACKETS:-4}"
TIMEOUT="${TIMEOUT:-3}"

case "$REGION_LABEL" in
  aws-us-east-1-virginia)
    HOST="ec2.us-east-1.amazonaws.com"
    AWS_REGION="us-east-1"
    ;;
  aws-us-west-2-oregon)
    HOST="ec2.us-west-2.amazonaws.com"
    AWS_REGION="us-west-2"
    ;;
  aws-us-west-1-california)
    HOST="ec2.us-west-1.amazonaws.com"
    AWS_REGION="us-west-1"
    ;;
  local-mesh-lapine)
    HOST="${LOCAL_MESH_HOST:-127.0.0.1}"
    AWS_REGION="local"
    ;;
  meshtastic-lapine)
    HOST="${MESHTASTIC_HOST:-127.0.0.1}"
    AWS_REGION="mesh"
    ;;
  *)
    HOST="$REGION_LABEL"
    AWS_REGION="custom"
    ;;
esac

START_TS="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

echo "[check] region=$REGION_LABEL network=$NETWORK_LABEL host=$HOST packets=$PACKETS timeout=$TIMEOUT started=$START_TS"

if ! command -v ping >/dev/null 2>&1; then
  echo '{"status":"error","reason":"ping_missing"}'
  exit 1
fi

set +e
PING_OUTPUT="$(ping -c "$PACKETS" -W "$TIMEOUT" "$HOST" 2>&1)"
PING_CODE=$?
set -e

LOSS="$(printf '%s\n' "$PING_OUTPUT" | awk -F, '/packet loss/ {gsub(/% packet loss/,"",$3); gsub(/^ +| +$/,"",$3); print $3}' | tail -n1)"
RTT="$(printf '%s\n' "$PING_OUTPUT" | awk -F'=' '/min\/avg\/max/ {print $2}' | awk '{print $1}' | tail -n1)"
AVG_MS=""
MIN_MS=""
MAX_MS=""
if [[ -n "$RTT" ]]; then
  MIN_MS="$(printf '%s' "$RTT" | cut -d/ -f1)"
  AVG_MS="$(printf '%s' "$RTT" | cut -d/ -f2)"
  MAX_MS="$(printf '%s' "$RTT" | cut -d/ -f3)"
fi

STATUS="ok"
if [[ "$PING_CODE" -ne 0 ]]; then
  STATUS="degraded"
fi

node - <<JSON
const result = {
  status: "$STATUS",
  region: "$REGION_LABEL",
  network: "$NETWORK_LABEL",
  host: "$HOST",
  aws_region: "$AWS_REGION",
  packet_count: Number("$PACKETS"),
  packet_loss_percent: "$LOSS" === "" ? null : Number("$LOSS"),
  min_latency_ms: "$MIN_MS" === "" ? null : Number("$MIN_MS"),
  avg_latency_ms: "$AVG_MS" === "" ? null : Number("$AVG_MS"),
  max_latency_ms: "$MAX_MS" === "" ? null : Number("$MAX_MS"),
  timestamp_utc: "$START_TS"
};
console.log(JSON.stringify(result, null, 2));
JSON
