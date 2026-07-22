$ErrorActionPreference = 'Stop'

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$BackendRoot = Join-Path $ProjectRoot 'backend'

Set-Location $BackendRoot

if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    throw 'Python 3.12 or newer is required.'
}

python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
