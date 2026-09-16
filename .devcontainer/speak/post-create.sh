#!/usr/bin/env bash
set -euo pipefail

cd "${CONTAINER_WORKSPACE_FOLDER:-/workspaces/Aura-core}"

python3.12 -m venv .venv
.venv/bin/python -m pip install --upgrade pip
.venv/bin/python -m pip install --requirement apps/speak/requirements.txt

node --version
.venv/bin/python --version
.venv/bin/python - <<'PY'
import boto3
import numpy
import pydantic
import scipy

print("Speak Python environment ready")
print("numpy", numpy.__version__)
print("scipy", scipy.__version__)
print("pydantic", pydantic.__version__)
print("boto3", boto3.__version__)
PY
