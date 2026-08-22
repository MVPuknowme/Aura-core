param(
    [string]$ListenAddress = '127.0.0.1',
    [ValidateRange(1, 65535)]
    [int]$Port = 8000
)

$ErrorActionPreference = 'Stop'

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$BackendRoot = Join-Path $ProjectRoot 'backend'

Set-Location $BackendRoot

if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    throw 'Python 3.12 or newer is required.'
}

python -c "import sys; raise SystemExit(0 if sys.version_info >= (3, 12) else 1)"
if ($LASTEXITCODE -ne 0) {
    throw 'Python 3.12 or newer is required.'
}

python -m pip install --disable-pip-version-check --no-input -r requirements.txt
if ($LASTEXITCODE -ne 0) {
    throw 'Dependency installation failed.'
}

python -m uvicorn app.main:app --host $ListenAddress --port $Port --reload
