#!/usr/bin/env bash
set -euo pipefail

VERSION="$(node -p 'process.versions.node')"
MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
NPM_VERSION="$(npm -v)"

echo "Node version: v$VERSION"
echo "npm version: $NPM_VERSION"

if [ "$MAJOR" -ne 24 ]; then
  echo "ERROR: SkyGrid temporary runtime requires Node 24.x only."
  echo "Detected Node major: $MAJOR"
  exit 1
fi

echo "PASS: Node 24.x runtime verified."
