#!/usr/bin/env bash
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/MVPuknowme/Aura-core.git}"
BRANCH="${BRANCH:-main}"
WORKDIR="${WORKDIR:-$HOME/aura-core-skygrid}"
AWS_REGION="${AWS_REGION:-us-east-1}"
WALLET_ADDRESS="${WALLET_ADDRESS:-0xbAA5A03bC268546194550a427d3F1d5787c15403}"
DASHBOARD_PORT="${DASHBOARD_PORT:-3000}"

printf '\nSkyGrid / Aura-Core AWS CloudShell ETH Validator Runner\n'
printf 'Region: %s\n' "$AWS_REGION"
printf 'Branch: %s\n' "$BRANCH"
printf 'Wallet destination: %s\n' "$WALLET_ADDRESS"
printf 'Mode: validator checks + local dashboard; no auto-transfer\n\n'

export AWS_REGION

command -v git >/dev/null 2>&1 || { echo "git is required"; exit 1; }
command -v node >/dev/null 2>&1 || { echo "Node.js is required in CloudShell"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "npm is required in CloudShell"; exit 1; }
command -v aws >/dev/null 2>&1 || { echo "AWS CLI is required in CloudShell"; exit 1; }

printf 'Checking AWS caller identity...\n'
aws sts get-caller-identity --output json

printf '\nPreparing workspace: %s\n' "$WORKDIR"
rm -rf "$WORKDIR"
git clone --branch "$BRANCH" --depth 1 "$REPO_URL" "$WORKDIR"
cd "$WORKDIR"

printf '\nRepository revision:\n'
git rev-parse --short HEAD

printf '\nInstalling dependencies...\n'
if [ -f package-lock.json ]; then
  npm ci
elif [ -f package.json ]; then
  npm install
else
  echo "No package.json found; skipping npm install."
fi

printf '\nVerifying wallet configuration...\n'
test -f config/wallets/rainbow-connect.json
test -f config/payouts/aws-validator-rainbow-wallet.json
node -e "const fs=require('fs'); const wallet=JSON.parse(fs.readFileSync('config/wallets/rainbow-connect.json','utf8')); const payout=JSON.parse(fs.readFileSync('config/payouts/aws-validator-rainbow-wallet.json','utf8')); const expected=process.env.WALLET_ADDRESS; if(wallet.wallet.address!==expected) throw new Error('Wallet config address mismatch'); if(payout.destination.address!==expected) throw new Error('Payout config address mismatch'); if(wallet.connectionPolicy.noAutomaticTransfers!==true) throw new Error('Wallet must block automatic transfers'); if(payout.safety.noAutoTransfer!==true) throw new Error('Payout must block automatic transfers'); console.log('Wallet route verified:', expected);"

printf '\nRunning production-state verification when available...\n'
if [ -f scripts/verify-production-state.mjs ]; then
  node scripts/verify-production-state.mjs
else
  echo "scripts/verify-production-state.mjs not found; skipping."
fi

printf '\nRunning Postman integration verification when available...\n'
if [ -f scripts/verify-postman-integration.mjs ]; then
  node scripts/verify-postman-integration.mjs
else
  echo "scripts/verify-postman-integration.mjs not found; skipping."
fi

printf '\nRunning validator health checks when available...\n'
if [ -f scripts/validator-health-check.mjs ]; then
  node scripts/validator-health-check.mjs || echo "Validator health check returned non-zero; inspect RPC/config before production."
else
  echo "scripts/validator-health-check.mjs not found; skipping."
fi

printf '\nRunning Klamath validator gross-output verification when CSV is available...\n'
if [ -f validator_exchange_run_week.csv ] && [ -f scripts/verify-klamath-validator-profit.mjs ]; then
  node scripts/verify-klamath-validator-profit.mjs
else
  echo "Klamath CSV or verifier not present in this checkout; skipping."
fi

printf '\nStarting ETH dashboard if available...\n'
if [ -f dashboard/eth-dashboard-local.js ]; then
  PORT="$DASHBOARD_PORT" HOST="127.0.0.1" node dashboard/eth-dashboard-local.js &
  DASHBOARD_PID=$!
  sleep 2
  echo "Dashboard PID: $DASHBOARD_PID"
  echo "Local dashboard: http://localhost:${DASHBOARD_PORT}/eth-dashboard"
  echo "Health route: http://localhost:${DASHBOARD_PORT}/health"
else
  echo "dashboard/eth-dashboard-local.js not found; skipping dashboard start."
fi

printf '\nCloudShell validator lane complete.\n'
printf 'Status: checks executed; wallet transfer not executed; manual signing required in Rainbow Wallet.\n'
printf 'Destination wallet: %s\n' "$WALLET_ADDRESS"
