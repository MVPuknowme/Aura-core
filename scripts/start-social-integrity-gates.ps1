$ErrorActionPreference = "Stop"

Write-Host "Starting SKYGRID Social Integrity Gates..." -ForegroundColor Cyan

$root = "E:\Aura-core"

$snapchat = Join-Path $root "scripts\snapchat-integrity-gate.ps1"
$tiktok = Join-Path $root "scripts\tiktok-integrity-gate.ps1"
$instagram = Join-Path $root "scripts\instagram-integrity-gate.ps1"

if (Test-Path $instagram) {
  Start-Process powershell -ArgumentList "-ExecutionPolicy Bypass -File `"$instagram`""
  Write-Host "Instagram gate starting on 8787"
}
else {
  Write-Host "Instagram PowerShell gate not found yet: $instagram" -ForegroundColor Yellow
}

if (Test-Path $snapchat) {
  Start-Process powershell -ArgumentList "-ExecutionPolicy Bypass -File `"$snapchat`""
  Write-Host "Snapchat gate starting on 8788"
}
else {
  Write-Host "Snapchat gate not found: $snapchat" -ForegroundColor Yellow
}

if (Test-Path $tiktok) {
  Start-Process powershell -ArgumentList "-ExecutionPolicy Bypass -File `"$tiktok`""
  Write-Host "TikTok gate starting on 8789"
}
else {
  Write-Host "TikTok gate not found: $tiktok" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Health checks:"
Write-Host "Instagram: http://127.0.0.1:8787/health"
Write-Host "Snapchat:  http://127.0.0.1:8788/health"
Write-Host "TikTok:    http://127.0.0.1:8789/health"
