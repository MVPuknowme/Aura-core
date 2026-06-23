param(
  [switch]$Apply,
  [switch]$Remove,
  [int[]]$Ports = @(1700, 1883, 8883, 8080, 8083),
  [string]$RuleGroup = "SKYGRID LoRa Backhaul Firewall"
)

$ErrorActionPreference = "Stop"

$AuditDir = "E:\Aura-core\.skygrid\firewall"
$Stamp = Get-Date -Format "yyyy-MM-dd-HHmmss"
$LedgerPath = Join-Path $AuditDir "lora-backhaul-firewall-$Stamp.csv"

New-Item -ItemType Directory -Force $AuditDir | Out-Null

function Assert-Admin {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($identity)
  $admin = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

  if (-not $admin) {
    throw "Run PowerShell as Administrator."
  }
}

function Add-LedgerRow {
  param(
    [string]$Mode,
    [string]$Action,
    [string]$Protocol,
    [int]$Port,
    [string]$RuleName,
    [string]$Note
  )

  $row = [pscustomobject]@{
    timestamp = (Get-Date).ToUniversalTime().ToString("o")
    mode = $Mode
    action = $Action
    protocol = $Protocol
    port = $Port
    ruleName = $RuleName
    note = $Note
  }

  $exists = Test-Path $LedgerPath
  $row | Export-Csv -NoTypeInformation -Encoding utf8 -Append:$exists -Path $LedgerPath
}

Assert-Admin

if ($Remove) {
  Get-NetFirewallRule -Group $RuleGroup -ErrorAction SilentlyContinue |
    Remove-NetFirewallRule

  Write-Host "Removed SKYGRID LoRa backhaul firewall rules." -ForegroundColor Yellow
  Write-Host "Ledger: $LedgerPath"
  exit 0
}

Write-Host "SKYGRID LoRa Backhaul Firewall" -ForegroundColor Cyan
Write-Host "Mode: $($(if ($Apply) { 'APPLY' } else { 'AUDIT ONLY' }))"
Write-Host "Ports: $($Ports -join ', ')"
Write-Host ""

foreach ($port in $Ports) {
  foreach ($protocol in @("UDP", "TCP")) {
    $ruleName = "SKYGRID Block LoRa Backhaul $protocol $port"
    $existing = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue

    if ($existing) {
      $status = "already-exists"
    }
    elseif ($Apply) {
      New-NetFirewallRule `
        -DisplayName $ruleName `
        -Group $RuleGroup `
        -Direction Inbound `
        -Action Block `
        -Protocol $protocol `
        -LocalPort $port `
        -Profile Any `
        -Description "SKYGRID defensive block for LoRa/LoRaWAN gateway backhaul $protocol port $port." `
        | Out-Null

      New-NetFirewallRule `
        -DisplayName "$ruleName Outbound" `
        -Group $RuleGroup `
        -Direction Outbound `
        -Action Block `
        -Protocol $protocol `
        -RemotePort $port `
        -Profile Any `
        -Description "SKYGRID defensive outbound block for LoRa/LoRaWAN gateway backhaul $protocol remote port $port." `
        | Out-Null

      $status = "blocked-inbound-and-outbound"
    }
    else {
      $status = "would-block"
    }

    Add-LedgerRow `
      -Mode $(if ($Apply) { "apply" } else { "audit" }) `
      -Action $status `
      -Protocol $protocol `
      -Port $port `
      -RuleName $ruleName `
      -Note "LoRa/LoRaWAN gateway backhaul defensive firewall rule."
  }
}

Write-Host ""
Write-Host "Ledger written:" -ForegroundColor Green
Write-Host $LedgerPath

Write-Host ""
Write-Host "View rules:"
Write-Host "Get-NetFirewallRule -Group `"$RuleGroup`" | Format-Table DisplayName,Enabled,Direction,Action"

Write-Host ""
Write-Host "Remove rules:"
Write-Host "powershell -ExecutionPolicy Bypass -File .\scripts\skygrid-lora-backhaul-firewall.ps1 -Remove"

if (-not $Apply) {
  Write-Host ""
  Write-Host "Audit-only complete. Rerun with -Apply to block." -ForegroundColor Yellow
}
else {
  Write-Host ""
  Write-Host "LoRa backhaul firewall blocks applied." -ForegroundColor Green
}
