$ErrorActionPreference = "Continue"

Write-Host "Testing SKYGRID Social Integrity Gates..." -ForegroundColor Cyan

$targets = @(
  @{ name = "Instagram"; url = "http://127.0.0.1:8787/health" },
  @{ name = "Snapchat";  url = "http://127.0.0.1:8788/health" },
  @{ name = "TikTok";    url = "http://127.0.0.1:8789/health" }
)

foreach ($target in $targets) {
  try {
    $result = Invoke-RestMethod -Method Get -Uri $target.url -TimeoutSec 3
    Write-Host "$($target.name): OK" -ForegroundColor Green
    $result
  }
  catch {
    Write-Host "$($target.name): not running or unreachable" -ForegroundColor Yellow
  }
}
