param(
  [string[]]$Models = @("openai/gpt-4o-mini"),
  [string]$EnvFile = ".env.local"
)

$ErrorActionPreference = "Stop"

Write-Host "SKYGRID AI Gateway Switch Verification" -ForegroundColor Cyan

if (!(Test-Path ".\scripts\ai-gateway-smoke.mjs")) {
  throw "Missing scripts\ai-gateway-smoke.mjs"
}

if (!(Test-Path $EnvFile)) {
  throw "Missing $EnvFile"
}

foreach ($model in $Models) {
  Write-Host ""
  Write-Host "Testing model: $model" -ForegroundColor Yellow

  $env:AI_GATEWAY_MODEL = $model

  & node "--env-file=$EnvFile" ".\scripts\ai-gateway-smoke.mjs"

  if ($LASTEXITCODE -ne 0) {
    throw "AI Gateway smoke failed for $model with exit code $LASTEXITCODE"
  }

  Write-Host "Model passed and process exited: $model" -ForegroundColor Green
}

Remove-Item Env:\AI_GATEWAY_MODEL -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "AI switching verification complete." -ForegroundColor Green
