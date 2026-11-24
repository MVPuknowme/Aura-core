param(
  [ValidateRange(1,3600)][int]$DurationSeconds = 180,
  [ValidateRange(1,3600)][int]$IntervalSeconds = 10,
  [string]$ExpectedSsid = "Base",
  [int]$ExpectedChannel = 1,
  [ValidateRange(0,100)][int]$MinimumSignalPercent = 70,
  [string]$OutputRoot = (Join-Path ([System.IO.Path]::GetTempPath()) "skygrid-network"),
  [switch]$IncludeFirewallDrops
)

$ErrorActionPreference = "Continue"

$Root = $OutputRoot
$ErrorCountAtStart = $Error.Count
$collectionIncomplete = $false
$wlanReadFailed = $false
$sampleCount = 0
$runStatus = "INCOMPLETE"
$Stamp = Get-Date -Format "yyyy-MM-dd-HHmmss"
$OutDir = Join-Path $Root ("firewall-freq-leak-test-{0}-{1}" -f $Stamp, [guid]::NewGuid().ToString("N").Substring(0,8))
$FirewallLogPath = "C:\Windows\System32\LogFiles\Firewall\pfirewall.log"

New-Item -ItemType Directory -Force $OutDir -ErrorAction Stop | Out-Null

$Summary = Join-Path $OutDir "skygrid-firewall-freq-leak-summary.md"
$SamplesCsv = Join-Path $OutDir "network-samples.csv"
$FindingsCsv = Join-Path $OutDir "findings.csv"

function Add-Finding {
  param(
    [string]$Severity,
    [string]$Category,
    [string]$Finding,
    [string]$Evidence
  )

  [pscustomobject]@{
    timestamp = (Get-Date).ToUniversalTime().ToString("o")
    severity = $Severity
    category = $Category
    finding = $Finding
    evidence = $Evidence
  } | Export-Csv -NoTypeInformation -Encoding utf8 -Append -Path $FindingsCsv
}

function Get-WlanText {
  try {
    $output = netsh wlan show interfaces | Out-String
    if ($LASTEXITCODE -ne 0) { throw "netsh exited with $LASTEXITCODE" }
    return $output
  } catch {
    $script:wlanReadFailed = $true
    return "Wi-Fi interface status unavailable"
  }
}

function Parse-WlanInterface {
  $text = Get-WlanText
  $ssid = ""
  $bssid = ""
  $channel = ""
  $signal = ""
  $radio = ""

  foreach ($line in ($text -split "`r?`n")) {
    if ($line -match "^\s*SSID\s+:\s+(.+)$" -and $line -notmatch "BSSID") { $ssid = $Matches[1].Trim() }
    if ($line -match "^\s*BSSID\s+:\s+(.+)$") { $bssid = $Matches[1].Trim() }
    if ($line -match "^\s*Channel\s+:\s+(.+)$") { $channel = $Matches[1].Trim() }
    if ($line -match "^\s*Signal\s+:\s+(.+)%") { $signal = $Matches[1].Trim() }
    if ($line -match "^\s*Radio type\s+:\s+(.+)$") { $radio = $Matches[1].Trim() }
  }

  [pscustomobject]@{
    ssid = $ssid
    bssid = $bssid
    channel = $channel
    signal = $signal
    radio = $radio
    raw = $text
  }
}

Write-Host "SKYGRID firewall + frequency-leak indicator test" -ForegroundColor Cyan
Write-Host "Output: $OutDir"
Write-Host "Duration: $DurationSeconds seconds"
Write-Host ""

# Read existing logs only when requested; never change firewall settings.
$dropBaseline = @()
$dropState = "NOT_REQUESTED"
if ($IncludeFirewallDrops) {
  try {
    $dropBaseline = @(Get-Content -LiteralPath $FirewallLogPath -ErrorAction Stop)
    $dropState = "BASELINE_OK"
  } catch {
    $dropState = "UNAVAILABLE"
    $collectionIncomplete = $true
  }
}

# Baseline snapshots.
Get-NetFirewallRule |
  Select-Object DisplayName,Enabled,Profile,Direction,Action,Group |
  Export-Csv -NoTypeInformation -Encoding utf8 (Join-Path $OutDir "firewall-rules-all.csv")

Get-NetFirewallRule -Group "SKYGRID Unified Port Firewall" -ErrorAction SilentlyContinue |
  Select-Object DisplayName,Enabled,Direction,Action,Group |
  Export-Csv -NoTypeInformation -Encoding utf8 (Join-Path $OutDir "skygrid-unified-port-firewall.csv")

Get-NetFirewallRule -Group "SKYGRID LoRa Backhaul Firewall" -ErrorAction SilentlyContinue |
  Select-Object DisplayName,Enabled,Direction,Action,Group |
  Export-Csv -NoTypeInformation -Encoding utf8 (Join-Path $OutDir "skygrid-lora-backhaul-firewall.csv")

Get-NetTCPConnection -State Listen |
  Select-Object LocalAddress,LocalPort,OwningProcess |
  Sort-Object LocalPort |
  Export-Csv -NoTypeInformation -Encoding utf8 (Join-Path $OutDir "tcp-listeners-before.csv")

Get-NetUDPEndpoint |
  Select-Object LocalAddress,LocalPort,OwningProcess |
  Sort-Object LocalPort |
  Export-Csv -NoTypeInformation -Encoding utf8 (Join-Path $OutDir "udp-endpoints-before.csv")

Get-PnpDevice -Class Bluetooth -ErrorAction SilentlyContinue |
  Select-Object Status,FriendlyName,InstanceId |
  Export-Csv -NoTypeInformation -Encoding utf8 (Join-Path $OutDir "bluetooth-devices.csv")

Get-PnpDevice -FriendlyName "Microsoft Wi-Fi Direct Virtual Adapter*" -ErrorAction SilentlyContinue |
  Select-Object Status,FriendlyName,InstanceId |
  Export-Csv -NoTypeInformation -Encoding utf8 (Join-Path $OutDir "wifi-direct-adapters.csv")

Get-DnsClientServerAddress |
  Export-Csv -NoTypeInformation -Encoding utf8 (Join-Path $OutDir "dns-client-server-addresses.csv")

(Get-WlanText) | Set-Content -Encoding utf8 (Join-Path $OutDir "wlan-interface-before.txt")

# Parameter checks.
$wlan = Parse-WlanInterface

if ($wlan.ssid -and $wlan.ssid -ne $ExpectedSsid) {
  Add-Finding "warning" "wifi" "Connected SSID does not match expected SSID" "expected=$ExpectedSsid actual=$($wlan.ssid)"
}

if ($wlan.channel -match "^\d+$" -and [int]$wlan.channel -ne $ExpectedChannel) {
  Add-Finding "warning" "wifi" "Wi-Fi channel changed from expected parameter" "expected=$ExpectedChannel actual=$($wlan.channel)"
}

if ($wlan.signal -match "^\d+$" -and [int]$wlan.signal -lt $MinimumSignalPercent) {
  Add-Finding "warning" "wifi" "Wi-Fi signal below threshold" "minimum=$MinimumSignalPercent actual=$($wlan.signal)"
}

# Watch ports: Windows exposure + common backhaul/messaging channels.
$WatchPorts = @(135,139,445,1700,1883,2179,5040,8080,8083,8883,49664,49665,49666,49667,49668)

$listeners = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue
foreach ($port in $WatchPorts) {
  $hits = $listeners | Where-Object { $_.LocalPort -eq $port -and $_.LocalAddress -notin @("127.0.0.1","::1") }
  if ($hits) {
    Add-Finding "notice" "tcp-listener" "Watched TCP port is listening" "port=$port hits=$($hits.Count)"
  }
}

$udpEndpoints = Get-NetUDPEndpoint -ErrorAction SilentlyContinue
foreach ($port in $WatchPorts) {
  $hits = $udpEndpoints | Where-Object { $_.LocalPort -eq $port -and $_.LocalAddress -notin @("127.0.0.1","::1") }
  if ($hits) {
    Add-Finding "notice" "udp-endpoint" "Watched UDP endpoint exists" "port=$port hits=$($hits.Count)"
  }
}

# Sampling loop.
"timestamp,type,localAddress,localPort,remoteAddress,remotePort,state,owningProcess,ssid,bssid,channel,signal,radio" |
  Set-Content -Encoding utf8 $SamplesCsv

$end = (Get-Date).AddSeconds($DurationSeconds)

while ((Get-Date) -lt $end) {
  $now = (Get-Date).ToUniversalTime().ToString("o")
  $w = Parse-WlanInterface
  if ($w.ssid -and $w.channel -match "^\d+$" -and $w.signal -match "^\d+$") { $sampleCount++ }

  Get-NetTCPConnection -ErrorAction SilentlyContinue |
    ForEach-Object {
      $record = [pscustomobject][ordered]@{timestamp=$now;type="tcp";localAddress=$_.LocalAddress;localPort=$_.LocalPort;remoteAddress=$_.RemoteAddress;remotePort=$_.RemotePort;state=$_.State;owningProcess=$_.OwningProcess;ssid=$w.ssid;bssid=$w.bssid;channel=$w.channel;signal=$w.signal;radio=$w.radio}
      $record | Export-Csv -NoTypeInformation -Encoding utf8 -Append -Path $SamplesCsv
    }

  Get-NetUDPEndpoint -ErrorAction SilentlyContinue |
    ForEach-Object {
      $record = [pscustomobject][ordered]@{timestamp=$now;type="udp";localAddress=$_.LocalAddress;localPort=$_.LocalPort;remoteAddress="";remotePort="";state="endpoint";owningProcess=$_.OwningProcess;ssid=$w.ssid;bssid=$w.bssid;channel=$w.channel;signal=$w.signal;radio=$w.radio}
      $record | Export-Csv -NoTypeInformation -Encoding utf8 -Append -Path $SamplesCsv
    }

  Start-Sleep -Seconds $IntervalSeconds
}

# Post snapshots.
Get-NetTCPConnection -State Listen |
  Select-Object LocalAddress,LocalPort,OwningProcess |
  Sort-Object LocalPort |
  Export-Csv -NoTypeInformation -Encoding utf8 (Join-Path $OutDir "tcp-listeners-after.csv")

Get-NetUDPEndpoint |
  Select-Object LocalAddress,LocalPort,OwningProcess |
  Sort-Object LocalPort |
  Export-Csv -NoTypeInformation -Encoding utf8 (Join-Path $OutDir "udp-endpoints-after.csv")

(Get-WlanText) | Set-Content -Encoding utf8 (Join-Path $OutDir "wlan-interface-after.txt")

# Parse firewall DROP records if present.

$dropCount = 0
if ($dropState -eq "BASELINE_OK") {
  try {
    $endLog = @(Get-Content -LiteralPath $FirewallLogPath -ErrorAction Stop)
    $consistent = $endLog.Count -ge $dropBaseline.Count
    for ($i=0; $consistent -and $i -lt $dropBaseline.Count; $i++) {
      $consistent = [string]::Equals($dropBaseline[$i], $endLog[$i], [StringComparison]::Ordinal)
    }
    if (-not $consistent) { throw "Log changed or rotated during sampling" }
    $drops = @($endLog | Select-Object -Skip $dropBaseline.Count |
      Where-Object { $_ -and $_ -notmatch "^#" -and (($_ -split "\s+")[2] -eq "DROP") })
    $dropCount = $drops.Count
    $dropState = "READ_NEW_ENTRIES"
  } catch {
    $dropState = "UNAVAILABLE_OR_ROTATED"
    $collectionIncomplete = $true
  }
}

# Summary.
$findingsText = "No findings file created."
if (Test-Path $FindingsCsv) {
  $findingsText = Import-Csv $FindingsCsv | Format-Table -AutoSize | Out-String
}

if ($sampleCount -gt 0 -and -not $wlanReadFailed -and -not $collectionIncomplete -and $Error.Count -eq $ErrorCountAtStart) {
  $runStatus = "COLLECTED"
}

@"
# SKYGRID Firewall + Frequency-Leak Indicator Test

Generated: $(Get-Date)
Collection status: $runStatus
Valid Wi-Fi sample intervals: $sampleCount
Duration seconds: $DurationSeconds
Interval seconds: $IntervalSeconds

## Parameters

Expected SSID: $ExpectedSsid
Expected Wi-Fi channel: $ExpectedChannel
Minimum signal percent: $MinimumSignalPercent

## Scope

This test captures:
- firewall rule state
- SKYGRID firewall rule state
- TCP listeners
- UDP endpoints
- DNS server configuration
- Wi-Fi SSID/BSSID/channel/signal/radio metadata
- Bluetooth device state
- Wi-Fi Direct adapter state
- firewall DROP metadata, if present
- hash manifest for captured files

## Frequency-Leak Boundary

Windows cannot directly prove RF leakage or identify RF emitters from this test.
This test records nearby Wi-Fi channel/radio indicators and local adapter state.
It does not capture RF content, packet payloads, private messages, credentials, cookies, or session tokens.

## Firewall DROP Rows

Firewall log status: $dropState
New DROP rows observed: $dropCount

## Findings

$findingsText

## Output Folder

$OutDir

## Interpretation

- Channel or BSSID changes can indicate roaming/AP changes, not attribution.
- Bluetooth/Wi-Fi Direct exposure can indicate local radio surfaces, not proof of misuse.
- Firewall drops can show blocked inbound metadata, not identity by themselves.
- Stable SSID/channel/signal with no unexpected listeners is the desired quiet state.
"@ | Set-Content -Encoding utf8 $Summary

$HashManifest = Join-Path $OutDir "hash-manifest-sha256.csv"
Get-ChildItem -LiteralPath $OutDir -File |
  Where-Object Name -ne "hash-manifest-sha256.csv" |
  ForEach-Object {
    [pscustomobject]@{
      file = $_.Name
      sha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $_.FullName -ErrorAction Stop).Hash
      size_bytes = $_.Length
    }
  } | Export-Csv -NoTypeInformation -Encoding utf8 -LiteralPath $HashManifest -ErrorAction Stop
Write-Output ("SKYGRID diagnostic status: {0}. Summary: {1}" -f $runStatus, $Summary)
if ($runStatus -ne "COLLECTED") { exit 2 }
