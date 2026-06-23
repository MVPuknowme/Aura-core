param(
  [switch]$Apply,
  [int[]]$AllowPorts = @(80, 443),
  [string]$RuleGroup = "SKYGRID Unified Port Firewall"
)

$ErrorActionPreference = "Stop"

$AuditDir = "E:\Aura-core\.skygrid\firewall"
$Timestamp = Get-Date -Format "yyyy-MM-dd-HHmmss"
$OpenPortsCsv = Join-Path $AuditDir "open-ports-$Timestamp.csv"
$ActionCsv = Join-Path $AuditDir "firewall-actions-$Timestamp.csv"

New-Item -ItemType Directory -Force $AuditDir | Out-Null

function Assert-Admin {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($identity)
  $admin = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

  if (-not $admin) {
    throw "Run PowerShell as Administrator before applying firewall rules."
  }
}

function Is-LocalOnlyAddress {
  param([string]$Address)

  return @(
    "127.0.0.1",
    "::1",
    "localhost"
  ) -contains $Address
}

function Is-AnyAddress {
  param([string]$Address)

  return @(
    "0.0.0.0",
    "::",
    "*"
  ) -contains $Address
}

function Get-ProcessNameSafe {
  param([int]$Pid)

  try {
    return (Get-Process -Id $Pid -ErrorAction Stop).ProcessName
  }
  catch {
    return "unknown"
  }
}

Write-Host "SKYGRID Unified Port Firewall" -ForegroundColor Cyan
Write-Host "Mode: $($(if ($Apply) { 'APPLY' } else { 'AUDIT ONLY' }))"
Write-Host "Allowed ports: $($AllowPorts -join ', ')"
Write-Host ""

$listeners = Get-NetTCPConnection -State Listen |
  Sort-Object LocalPort, LocalAddress |
  Select-Object `
    LocalAddress,
    LocalPort,
    OwningProcess,
    @{Name="ProcessName";Expression={ Get-ProcessNameSafe $_.OwningProcess }},
    @{Name="LocalOnly";Expression={ Is-LocalOnlyAddress $_.LocalAddress }},
    @{Name="AnyAddress";Expression={ Is-AnyAddress $_.LocalAddress }}

$listeners | Export-Csv -NoTypeInformation -Encoding utf8 $OpenPortsCsv

Write-Host "Open-port audit written to:"
Write-Host $OpenPortsCsv -ForegroundColor Green
Write-Host ""

$exposed = $listeners |
  Where-Object {
    -not $_.LocalOnly -and
    $_.LocalPort -notin $AllowPorts
  } |
  Group-Object LocalPort |
  ForEach-Object {
    $_.Group | Select-Object -First 1
  } |
  Sort-Object LocalPort

$actions = New-Object System.Collections.Generic.List[object]

if (-not $exposed -or $exposed.Count -eq 0) {
  Write-Host "No exposed non-allowlisted listening ports found." -ForegroundColor Green
}
else {
  Write-Host "Exposed non-allowlisted ports found:" -ForegroundColor Yellow
  $exposed | Format-Table LocalAddress,LocalPort,ProcessName,OwningProcess -AutoSize
}

foreach ($item in $exposed) {
  $port = [int]$item.LocalPort
  $ruleName = "SKYGRID Block Inbound TCP $port"

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
      -Protocol TCP `
      -LocalPort $port `
      -Profile Any `
      -Description "SKYGRID defensive block for exposed non-allowlisted listening TCP port $port." `
      | Out-Null

    $status = "blocked"
  }
  else {
    $status = "would-block"
  }

  $actions.Add([pscustomobject]@{
    timestamp = (Get-Date).ToUniversalTime().ToString("o")
    mode = if ($Apply) { "apply" } else { "audit" }
    action = $status
    protocol = "TCP"
    port = $port
    process = $item.ProcessName
    owningProcess = $item.OwningProcess
    localAddress = $item.LocalAddress
    ruleName = $ruleName
  })
}

$actions | Export-Csv -NoTypeInformation -Encoding utf8 $ActionCsv

Write-Host ""
Write-Host "Firewall action ledger written to:"
Write-Host $ActionCsv -ForegroundColor Green

Write-Host ""
Write-Host "Useful commands:"
Write-Host "View SKYGRID rules:"
Write-Host "  Get-NetFirewallRule -Group `"$RuleGroup`" | Format-Table DisplayName,Enabled,Direction,Action"
Write-Host ""
Write-Host "Remove SKYGRID rules:"
Write-Host "  Get-NetFirewallRule -Group `"$RuleGroup`" | Remove-NetFirewallRule"
Write-Host ""

if (-not $Apply) {
  Write-Host "Audit-only run complete. To apply blocks, rerun with -Apply." -ForegroundColor Yellow
}
else {
  Write-Host "Firewall blocks applied." -ForegroundColor Green
}
