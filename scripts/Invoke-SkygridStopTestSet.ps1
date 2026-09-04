[CmdletBinding()]
param(
  [string]$Config = "config/skygrid-stop-test-set.v1.json",
  [switch]$Apply,
  [switch]$Approved,
  [switch]$NoReceipt
)

$ErrorActionPreference = "Stop"

$toolArgs = @(
  "scripts/skygrid-stop-test-set.mjs",
  "--config=$Config"
)

if ($Apply) {
  $toolArgs += "--apply"
} else {
  $toolArgs += "--dry-run"
}

if ($Approved) {
  $toolArgs += "--approved"
}

if ($NoReceipt) {
  $toolArgs += "--no-receipt"
}

Write-Host "SKYGRID stop test set wrapper"
Write-Host "Config: $Config"
Write-Host "Mode: $(if ($Apply) { 'apply' } else { 'dry-run' })"
Write-Host "Network emission: stopped"
Write-Host "Remote removal: stopped"

node @toolArgs
