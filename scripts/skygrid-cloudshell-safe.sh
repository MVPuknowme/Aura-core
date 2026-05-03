#!/usr/bin/env bash
set -euo pipefail
set +H 2>/dev/null || true

REPO_URL="https://github.com/MVPuknowme/Aura-core.git"
REPO_DIR="${REPO_DIR:-Aura-core}"

printf '%s\n' '== SkyGrid Cloud Shell Safe Launcher =='
printf 'operator=%s\n' 'MVP-19830312'
printf 'node=%s\n' "${MVP_NODE:-42XA-0312}"

if [[ ! -d "$REPO_DIR/.git" ]]; then
  printf 'Repo directory not found. Cloning %s into %s ...\n' "$REPO_URL" "$REPO_DIR"
  git clone "$REPO_URL" "$REPO_DIR"
else
  printf 'Repo directory found: %s\n' "$REPO_DIR"
fi

cd "$REPO_DIR"
printf 'Current directory: %s\n' "$(pwd)"

git pull --ff-only || true

if [[ ! -f scripts/skygrid-status-aws.sh ]]; then
  printf '%s\n' 'Missing scripts/skygrid-status-aws.sh. Showing available files:'
  find . -maxdepth 3 -type f | sort
  exit 1
fi

chmod +x scripts/skygrid-status-aws.sh
AWS_REGION="${AWS_REGION:-us-east-1}" SKYGRID_REGION="${SKYGRID_REGION:-aws-us-east-1-virginia}" ./scripts/skygrid-status-aws.sh
