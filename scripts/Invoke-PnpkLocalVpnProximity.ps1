[CmdletBinding()]
param(
  [string]$Config = "config/pnpk-local-vpn-proximity.v1.json",
  [double]$RadiusMiles = 3,
  [string]$Shape = "radius_square",
  [string]$VpnCidr = $env:SKYGRID_LOCAL_VPN_CIDR,
  [string]$AnchorLabel = $env:SKYGRID_PNPK_ANCHOR_LABEL,
  [switch]$Apply,
  [switch]$Approved,
  [switch]$NoReceipt
)

$ErrorActionPreference = "Stop"

if (-not $VpnCidr) {
  $VpnCidr = "127.0.0.1/32"
}

$env:SKYGRID_LOCAL_VPN_CIDR = $VpnCidr
if ($AnchorLabel) {
  $env:SKYGRID_PNPK_ANCHOR_LABEL = $AnchorLabel
}

$toolArgs = @(
  "scripts/pnpk-local-vpn-proximity-runner.mjs",
  "--config=$Config",
  "--radius-miles=$RadiusMiles",
  "--shape=$Shape"
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

Write-Host "PNPK local VPN proximity wrapper"
Write-Host "Radius: $RadiusMiles miles"
Write-Host "Shape: $Shape"
Write-Host "VPN CIDR: $VpnCidr"
Write-Host "Mode: $(if ($Apply) { 'apply' } else { 'dry-run' })"

node @toolArgs
