[CmdletBinding()]
param(
  [string]$Target = "all",
  [string]$Map = "config/skygrid-removal-map.v1.json",
  [switch]$Apply,
  [switch]$Approved,
  [switch]$IncludeGuardedDeletes,
  [switch]$NoReceipt
)

$ErrorActionPreference = "Stop"

$toolArgs = @(
  "scripts/skygrid-removal-tool.mjs",
  "--target=$Target",
  "--map=$Map"
)

if ($Apply) {
  $toolArgs += "--apply"
} else {
  $toolArgs += "--dry-run"
}

if ($Approved) {
  $toolArgs += "--approved"
}

if ($IncludeGuardedDeletes) {
  $toolArgs += "--include-guarded-deletes"
}

if ($NoReceipt) {
  $toolArgs += "--no-receipt"
}

Write-Host "SKYGRID removal wrapper"
Write-Host "Target: $Target"
Write-Host "Mode: $(if ($Apply) { 'apply' } else { 'dry-run' })"

node @toolArgs
