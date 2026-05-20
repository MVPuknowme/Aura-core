#!/usr/bin/env bash
set -Eeuo pipefail

BRANCH="mvpuknowme/mvp-12-build-skygrid-auto-drill-preflight"
LOG_DIR="deploy-logs"
STAMP="$(date +"%Y%m%d-%H%M%S")"
LOG_FILE="$LOG_DIR/run-deploy-$STAMP.log"

mkdir -p "$LOG_DIR"

NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
if [ "$NODE_MAJOR" -ne 24 ]; then
  echo "❌ Node 24.x required. Current version: $(node -v)"
  exit 1
fi

{
  echo "🚀 SKYGRID / AURA-CORE DEPLOY PREFLIGHT"
  echo "Branch: $BRANCH"
  echo "Log: $LOG_FILE"
  echo "Node: $(node -v)"
  echo
} | tee -a "$LOG_FILE"

run_step() {
  local name="$1"
  shift

  echo "▶ $name" | tee -a "$LOG_FILE"
  echo "===== $name =====" >> "$LOG_FILE"

  if "$@" 2>&1 | tee -a "$LOG_FILE"; then
    echo "✅ $name passed" | tee -a "$LOG_FILE"
    echo | tee -a "$LOG_FILE"
  else
    echo "❌ $name failed" | tee -a "$LOG_FILE"
    echo "Check log: $LOG_FILE" | tee -a "$LOG_FILE"
    exit 1
  fi
}

if git show-ref --verify --quiet "refs/heads/$BRANCH"; then
  run_step "Checkout existing deploy branch" git checkout "$BRANCH"
else
  run_step "Create deploy branch" git checkout -b "$BRANCH"
fi

run_step "Install clean dependencies" npm ci
run_step "Runtime build confirmation" npm run build
run_step "Test config" npm run test.config

if npm run | grep -q "validator:health"; then
  run_step "Validator health check" npm run validator:health
fi

if npm run | grep -q "node:ledger"; then
  run_step "Node ledger build" npm run node:ledger
fi

{
  echo "✅ DEPLOY PREFLIGHT COMPLETE"
  echo "Branch ready: $BRANCH"
  echo "Log saved: $LOG_FILE"
  echo
  echo "Next push command:"
  echo "git push -u origin $BRANCH"
} | tee -a "$LOG_FILE"
