#!/usr/bin/env bash
set -euo pipefail
set +H 2>/dev/null || true

cd "${REPO_DIR:-$HOME/Aura-core}"

LOG_DIR="logs"
PID_FILE="$LOG_DIR/skygrid-dashboard.pid"
LOG_FILE="$LOG_DIR/skygrid-dashboard.log"
mkdir -p "$LOG_DIR"

if [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  echo "SkyGrid dashboard already running pid=$(cat "$PID_FILE")"
else
  echo "Starting SkyGrid dashboard in background..."
  nohup node skygrid-dashboard-live.js > "$LOG_FILE" 2>&1 &
  echo $! > "$PID_FILE"
  sleep 2
fi

echo "pid=$(cat "$PID_FILE")"
echo "log=$LOG_FILE"
echo "--- latest logs ---"
tail -n 20 "$LOG_FILE" || true

echo "--- health ---"
curl -sS http://127.0.0.1:3000/health || true
echo

echo "--- skygrid-status compact ---"
curl -sS http://127.0.0.1:3000/skygrid-status | jq '{status, timestamp, route: .network.active_route, aws_authenticated: .aws.authenticated, discordbotlist: .integrations.discordbotlist.status}' || true
echo
