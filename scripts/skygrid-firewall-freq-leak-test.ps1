param(
  [int]$DurationSeconds = 180,
  [int]$IntervalSeconds = 10,
  [string]$ExpectedSsid = "Base",
  [int]$ExpectedChannel = 1,
  [int]$MinimumSignalPercent = 70
)

$ErrorActionPreference = "Continue"

$Root = "E:\Aura-core"
$Stamp = Get-Date -Format "yyyy-MM-dd-HHmmss"
$OutDir = Join-Path $Root ".skygrid\network\firewall-freq-leak-test-$Stamp"
$FirewallLogPath = "C:\Windows\System32\LogFiles\Firewall\pfirewall.log"

New-Item -ItemType Directory -Force $OutDir | Out-Null

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
  try { return (netsh wlan show interfaces | Out-String) }
  catch { return "netsh wlan show interfaces failed: $($_.Exception.Message)" }
}

function Get-WlanNetworksText {
  try { return (netsh wlan show networks mode=bssid | Out-String) }
  catch { return "netsh wlan show networks failed: $($_.Exception.Message)" }
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

# Enable forward-looking firewall dropped connection logging.
try {
  New-Item -ItemType Directory -Force C:\Windows\System32\LogFiles\Firewall | Out-Null
  netsh advfirewall set allprofiles logging filename C:\Windows\System32\LogFiles\Firewall\pfirewall.log | Out-Null
  netsh advfirewall set allprofiles logging maxfilesize 32767 | Out-Null
  netsh advfirewall set allprofiles logging droppedconnections enable | Out-Null
  netsh advfirewall set allprofiles logging allowedconnections disable | Out-Null
} catch {
  Add-Finding "warning" "firewall-logging" "Could not configure firewall logging" $_.Exception.Message
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
(Get-WlanNetworksText) | Set-Content -Encoding utf8 (Join-Path $OutDir "wlan-networks-before.txt")

# Parameter checks.
$wlan = Parse-WlanInterface

if ($wlan.ssid -ne $ExpectedSsid) {
  Add-Finding "warning" "wifi" "Connected SSID does not match expected SSID" "expected=$ExpectedSsid actual=$($wlan.ssid)"
}

if ([int]$wlan.channel -ne $ExpectedChannel) {
  Add-Finding "warning" "wifi" "Wi-Fi channel changed from expected parameter" "expected=$ExpectedChannel actual=$($wlan.channel)"
}

if ([int]$wlan.signal -lt $MinimumSignalPercent) {
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

  Get-NetTCPConnection -ErrorAction SilentlyContinue |
    ForEach-Object {
      $row = '"' + $now + '","tcp","' + $_.LocalAddress + '","' + $_.LocalPort + '","' + $_.RemoteAddress + '","' + $_.RemotePort + '","' + $_.State + '","' + $_.OwningProcess + '","' + $w.ssid + '","' + $w.bssid + '","' + $w.channel + '","' + $w.signal + '","' + $w.radio + '"'
      Add-Content -Encoding utf8 $SamplesCsv $row
    }

  Get-NetUDPEndpoint -ErrorAction SilentlyContinue |
    ForEach-Object {
      $row = '"' + $now + '","udp","' + $_.LocalAddress + '","' + $_.LocalPort + '","","","endpoint","' + $_.OwningProcess + '","' + $w.ssid + '","' + $w.bssid + '","' + $w.channel + '","' + $w.signal + '","' + $w.radio + '"'
      Add-Content -Encoding utf8 $SamplesCsv $row
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
(Get-WlanNetworksText) | Set-Content -Encoding utf8 (Join-Path $OutDir "wlan-networks-after.txt")

# Parse firewall DROP records if present.
$DropsCsv = Join-Path $OutDir "firewall-drops.csv"

if (Test-Path $FirewallLogPath) {
  Get-Content $FirewallLogPath |
    Where-Object { $_ -and $_ -notmatch "^#" -and $_ -match "\bDROP\b" } |
    ForEach-Object {
      $p = $_ -split "\s+"
      if ($p.Count -ge 8) {
        [pscustomobject]@{
          date = $p[0]
          time = $p[1]
          action = $p[2]
          protocol = $p[3]
          sourceIp = $p[4]
          destinationIp = $p[5]
          sourcePort = $p[6]
          destinationPort = $p[7]
          raw = $_
        }
      }
    } | Export-Csv -NoTypeInformation -Encoding utf8 $DropsCsv
} else {
  "date,time,action,protocol,sourceIp,destinationIp,sourcePort,destinationPort,raw" |
    Set-Content -Encoding utf8 $DropsCsv
}

# Hash manifest.
$HashManifest = Join-Path $OutDir "hash-manifest-sha256.csv"
"file,sha256,size_bytes,hashed_utc" | Set-Content -Encoding utf8 $HashManifest

Get-ChildItem $OutDir -File | ForEach-Object {
  $h = Get-FileHash -Algorithm SHA256 $_.FullName
  $row = '"' + $_.Name + '","' + $h.Hash + '","' + $_.Length + '","' + (Get-Date).ToUniversalTime().ToString("o") + '"'
  Add-Content -Encoding utf8 $HashManifest $row
}

# Summary.
$findingsText = "No findings file created."
if (Test-Path $FindingsCsv) {
  $findingsText = Import-Csv $FindingsCsv | Format-Table -AutoSize | Out-String
}

$dropCount = 0
try {
  $dropCount = @(Import-Csv $DropsCsv).Count
} catch {}

@"
# SKYGRID Firewall + Frequency-Leak Indicator Test

Generated: $(Get-Date)
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
- visible Wi-Fi network/channel metadata
- Bluetooth device state
- Wi-Fi Direct adapter state
- firewall DROP metadata, if present
- hash manifest for captured files

## Frequency-Leak Boundary

Windows cannot directly prove RF leakage or identify RF emitters from this test.
This test records nearby Wi-Fi channel/radio indicators and local adapter state.
It does not capture RF content, packet payloads, private messages, credentials, cookies, or session tokens.

## Firewall DROP Rows

DROP rows parsed: $dropCount

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

Write-Host ""
Write-Host "SKYGRID test complete." -ForegroundColor Green
Write-Host "Output:  $OutDir"
Write-Host "Summary: $Summary"

notepad $Summary
explorer.exe $OutDir
