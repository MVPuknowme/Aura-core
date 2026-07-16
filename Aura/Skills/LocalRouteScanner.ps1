[CmdletBinding()]
param(
    [string]$RepoPath,
    [string[]]$AllowedHosts,
    [ValidateRange(1, 65535)][int[]]$PortsToTest = @(3000),
    [string[]]$HealthPaths = @(
        "/api/health",
        "/health.json",
        "/api/skygrid/status",
        "/api/highway/status"
    ),
    [ValidateRange(1, 10)][int]$ProbeCount = 3,
    [ValidateRange(1, 30)][int]$TimeoutSeconds = 3,
    [ValidateRange(0, 100)][double]$SwitchImprovementPercent = 20,
    [ValidateRange(1, 10)][int]$SwitchConfirmations = 2,
    [ValidateRange(0, 3600)][int]$SwitchCooldownSeconds = 60,
    [string]$ExpectedVersion,
    [switch]$IncludeVirtualAdapters,
    [switch]$NoStateWrite
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$Product = "SKYGRID Emergency Data On-Ramp"
$RuntimeName = "vercel-aura-core"
$Mode = "controlled-pilot"
$Sentinel = "fail_closed"

function Get-PropertyValue {
    param($InputObject, [Parameter(Mandatory)][string]$Name)

    if ($null -eq $InputObject) { return $null }
    $Property = $InputObject.PSObject.Properties[$Name]
    if ($null -eq $Property) { return $null }
    return $Property.Value
}

function Resolve-RepoPath {
    param([string]$Path)

    if ([string]::IsNullOrWhiteSpace($Path)) {
        if ([string]::IsNullOrWhiteSpace($PSScriptRoot)) {
            throw "Repository path was not supplied and PSScriptRoot is unavailable."
        }
        $Path = Join-Path $PSScriptRoot "..\.."
    }

    $Resolved = [System.IO.Path]::GetFullPath($Path)
    if (-not (Test-Path -LiteralPath (Join-Path $Resolved ".git"))) {
        throw "Aura-Core repository not found at: $Resolved"
    }
    return $Resolved
}

function Write-JsonUtf8 {
    param($Value, [string]$Path, [int]$Depth = 16)

    $Json = $Value | ConvertTo-Json -Depth $Depth
    $Utf8NoBom = [System.Text.UTF8Encoding]::new($false)
    [System.IO.File]::WriteAllText($Path, $Json + "`n", $Utf8NoBom)
}

function Read-JsonSafe {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) { return $null }
    try {
        return Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
    }
    catch {
        Write-Warning "Ignoring unreadable route state: $Path"
        return $null
    }
}

function Convert-BytesToHex {
    param([byte[]]$Bytes)
    return (($Bytes | ForEach-Object { $_.ToString("x2") }) -join "")
}

function Get-Sha256Hex {
    param([string]$Text)

    $Algorithm = [System.Security.Cryptography.SHA256]::Create()
    try {
        $Bytes = [System.Text.Encoding]::UTF8.GetBytes($Text)
        return Convert-BytesToHex -Bytes ($Algorithm.ComputeHash($Bytes))
    }
    finally {
        $Algorithm.Dispose()
    }
}

function Get-HmacSha256Hex {
    param([string]$Text, [string]$Secret)

    $Key = [System.Text.Encoding]::UTF8.GetBytes($Secret)
    $Data = [System.Text.Encoding]::UTF8.GetBytes($Text)
    $Algorithm = [System.Security.Cryptography.HMACSHA256]::new($Key)
    try {
        return Convert-BytesToHex -Bytes ($Algorithm.ComputeHash($Data))
    }
    finally {
        $Algorithm.Dispose()
    }
}

function Get-Median {
    param([double[]]$Values)

    if (-not $Values -or $Values.Count -eq 0) { return $null }
    $Sorted = @($Values | Sort-Object)
    $Middle = [math]::Floor($Sorted.Count / 2)
    if ($Sorted.Count % 2 -eq 1) { return [double]$Sorted[$Middle] }
    return ([double]$Sorted[$Middle - 1] + [double]$Sorted[$Middle]) / 2
}

function Test-IsVirtualAdapter {
    param([string]$Text)
    return $Text -match '(?i)(loopback|docker|hyper-v|vethernet|virtual|vmware|vpn|tunnel|tailscale|wireguard|wsl|bluetooth)'
}

function Get-AdapterSnapshot {
    param([switch]$AllowVirtual)

    $Snapshots = foreach ($Route in @(
        Get-NetRoute -AddressFamily IPv4 -DestinationPrefix "0.0.0.0/0" -ErrorAction SilentlyContinue
    )) {
        $Adapter = Get-NetAdapter -InterfaceIndex $Route.InterfaceIndex -ErrorAction SilentlyContinue
        if (-not $Adapter -or $Adapter.Status -ne "Up") { continue }

        $AdapterIdentity = "$($Adapter.Name) $($Adapter.InterfaceDescription)"
        if (-not $AllowVirtual -and (Test-IsVirtualAdapter $AdapterIdentity)) { continue }

        $IpInterface = Get-NetIPInterface -AddressFamily IPv4 -InterfaceIndex $Route.InterfaceIndex -ErrorAction SilentlyContinue
        $Address = Get-NetIPAddress -AddressFamily IPv4 -InterfaceIndex $Route.InterfaceIndex -ErrorAction SilentlyContinue |
            Where-Object { $_.IPAddress -ne "127.0.0.1" -and $_.IPAddress -notlike "169.254.*" } |
            Select-Object -First 1
        $Config = Get-NetIPConfiguration -InterfaceIndex $Route.InterfaceIndex -ErrorAction SilentlyContinue

        $InterfaceMetric = if ($IpInterface) { [int]$IpInterface.InterfaceMetric } else { 0 }
        $TotalMetric = [int]$Route.RouteMetric + $InterfaceMetric
        $LinkSpeedMbps = 0.0
        try { $LinkSpeedMbps = [math]::Round(([double]$Adapter.LinkSpeed / 1000000), 2) } catch {}
        $AdapterScore = [math]::Round(
            1000 - [math]::Min(900, $TotalMetric) +
            [math]::Min(100, [math]::Log10($LinkSpeedMbps + 1) * 25),
            2
        )

        [pscustomobject]@{
            interface_index  = [int]$Route.InterfaceIndex
            interface_alias  = [string]$Adapter.Name
            description      = [string]$Adapter.InterfaceDescription
            ipv4_address     = if ($Address) { [string]$Address.IPAddress } else { $null }
            gateway          = if ($Config -and $Config.IPv4DefaultGateway) {
                [string]$Config.IPv4DefaultGateway.NextHop
            } else { $null }
            dns_servers      = if ($Config -and $Config.DnsServer) {
                @($Config.DnsServer.ServerAddresses)
            } else { @() }
            route_metric     = [int]$Route.RouteMetric
            interface_metric = $InterfaceMetric
            total_metric     = $TotalMetric
            link_speed_mbps  = $LinkSpeedMbps
            adapter_score    = $AdapterScore
        }
    }

    return @($Snapshots | Sort-Object total_metric, @{ Expression = "adapter_score"; Descending = $true })
}

function Test-SkygridIdentity {
    param($Response, [string]$RequestedPath, [string]$RequiredVersion)

    $Reasons = [System.Collections.Generic.List[string]]::new()
    $Payload = $null
    try { $Payload = [string]$Response.Content | ConvertFrom-Json }
    catch { $Reasons.Add("response_not_valid_json") }

    $HeaderProduct = [string]$Response.Headers["X-SKYGRID-Product"]
    $HeaderRuntime = [string]$Response.Headers["X-SKYGRID-Runtime"]
    $ContentType = [string]$Response.Headers["Content-Type"]

    if ([int]$Response.StatusCode -lt 200 -or [int]$Response.StatusCode -ge 300) { $Reasons.Add("unexpected_status_code") }
    if ($ContentType -notmatch '(?i)^application/json(?:;|$)') { $Reasons.Add("unexpected_content_type") }
    if ($HeaderProduct -ne $Product) { $Reasons.Add("product_header_mismatch") }
    if ([string]::IsNullOrWhiteSpace($HeaderRuntime)) { $Reasons.Add("runtime_header_missing") }

    $PayloadOk = Get-PropertyValue $Payload "ok"
    $PayloadProduct = [string](Get-PropertyValue $Payload "product")
    $PayloadSkygrid = [string](Get-PropertyValue $Payload "skygrid")
    $PayloadRuntime = [string](Get-PropertyValue $Payload "runtime")
    $PayloadMode = [string](Get-PropertyValue $Payload "mode")
    $PayloadSentinel = [string](Get-PropertyValue $Payload "sentinel")
    $PayloadRoute = [string](Get-PropertyValue $Payload "route")
    $PayloadVersion = [string](Get-PropertyValue $Payload "version")

    if ($Payload) {
        if ($PayloadOk -ne $true) { $Reasons.Add("payload_ok_not_true") }
        if ($PayloadProduct -ne $Product) { $Reasons.Add("payload_product_mismatch") }
        if ($PayloadSkygrid -ne $Product) { $Reasons.Add("payload_skygrid_mismatch") }
        if ($PayloadRuntime -ne $RuntimeName) { $Reasons.Add("payload_runtime_mismatch") }
        if ($PayloadMode -ne $Mode) { $Reasons.Add("payload_mode_mismatch") }
        if ($PayloadSentinel -ne $Sentinel) { $Reasons.Add("payload_sentinel_mismatch") }
        if ($PayloadRoute -ne $RequestedPath) { $Reasons.Add("payload_route_mismatch") }
        if ([string]::IsNullOrWhiteSpace($PayloadVersion)) { $Reasons.Add("payload_version_missing") }
        elseif ($PayloadVersion -ne $HeaderRuntime) { $Reasons.Add("header_payload_version_mismatch") }
        if ($RequiredVersion -and $PayloadVersion -ne $RequiredVersion) { $Reasons.Add("required_version_mismatch") }
    }

    return [pscustomobject]@{
        verified = ($Reasons.Count -eq 0)
        reasons  = @($Reasons)
        version  = $PayloadVersion
    }
}

function Invoke-SkygridProbe {
    param(
        [string]$HostName,
        [int]$Port,
        [string]$Path,
        [int]$Attempts,
        [int]$Timeout,
        [string]$RequiredVersion
    )

    $Uri = "http://${HostName}:$Port$Path"
    $Samples = @()
    $MinimumSuccesses = [int][math]::Ceiling($Attempts * 0.67)

    for ($Attempt = 1; $Attempt -le $Attempts; $Attempt++) {
        $Timer = [System.Diagnostics.Stopwatch]::StartNew()
        try {
            $Parameters = @{
                Uri = $Uri; Method = "Get"; TimeoutSec = $Timeout
                UseBasicParsing = $true; ErrorAction = "Stop"
            }
            if ((Get-Command Invoke-WebRequest).Parameters.ContainsKey("NoProxy")) {
                $Parameters.NoProxy = $true
            }

            $Response = Invoke-WebRequest @Parameters
            $Timer.Stop()
            $Identity = Test-SkygridIdentity $Response $Path $RequiredVersion
            $Samples += [pscustomobject]@{
                attempt = $Attempt
                latency_ms = [math]::Round($Timer.Elapsed.TotalMilliseconds, 2)
                status_code = [int]$Response.StatusCode
                reachable = $true
                identity_verified = [bool]$Identity.verified
                identity_reasons = @($Identity.reasons)
                version = $Identity.version
                error = $null
            }
        }
        catch {
            $Timer.Stop()
            $Samples += [pscustomobject]@{
                attempt = $Attempt
                latency_ms = [math]::Round($Timer.Elapsed.TotalMilliseconds, 2)
                status_code = $null
                reachable = $false
                identity_verified = $false
                identity_reasons = @("request_failed")
                version = $null
                error = $_.Exception.Message
            }
        }
    }

    $Verified = @($Samples | Where-Object { $_.reachable -and $_.identity_verified })
    $Latencies = @($Verified | ForEach-Object { [double]$_.latency_ms })
    $Median = Get-Median $Latencies
    $Jitter = if ($Latencies.Count -gt 1) {
        [double](($Latencies | Measure-Object -Maximum).Maximum - ($Latencies | Measure-Object -Minimum).Minimum)
    } elseif ($Latencies.Count -eq 1) { 0.0 } else { $null }
    $Healthy = $Verified.Count -ge $MinimumSuccesses
    $Score = if ($Healthy) {
        [math]::Round([double]$Median + ([double]$Jitter * 2) + (($Attempts - $Verified.Count) * 1000), 2)
    } else { $null }

    return [pscustomobject]@{
        uri = $Uri
        base_url = "http://${HostName}:$Port"
        route_key = "http://${HostName}:$Port"
        host = $HostName
        port = $Port
        path = $Path
        attempts = $Attempts
        verified_successes = $Verified.Count
        minimum_successes = $MinimumSuccesses
        median_latency_ms = if ($null -ne $Median) { [math]::Round([double]$Median, 2) } else { $null }
        jitter_ms = if ($null -ne $Jitter) { [math]::Round([double]$Jitter, 2) } else { $null }
        route_score = $Score
        identity_verified = ($Verified.Count -gt 0)
        healthy = $Healthy
        version = if ($Verified.Count -gt 0) { [string]$Verified[0].version } else { $null }
        samples = @($Samples)
    }
}

$RepoPath = Resolve-RepoPath $RepoPath
$StateDir = Join-Path $RepoPath "Aura\State"
$ReceiptDir = Join-Path $StateDir "RouteReceipts"
$StateFile = Join-Path $StateDir "active-route.json"

$Adapters = @(Get-AdapterSnapshot -AllowVirtual:$IncludeVirtualAdapters)
$DefaultAdapter = $Adapters | Select-Object -First 1

if (-not $AllowedHosts -or $AllowedHosts.Count -eq 0) {
    $AllowedHosts = @("127.0.0.1", "host.docker.internal")
    if ($DefaultAdapter -and $DefaultAdapter.ipv4_address) {
        $AllowedHosts += [string]$DefaultAdapter.ipv4_address
    }
}
$AllowedHosts = @($AllowedHosts | Where-Object { $_ } | Select-Object -Unique)
if ($AllowedHosts.Count -eq 0) { throw "At least one explicitly allowed host is required." }

foreach ($HostName in $AllowedHosts) {
    if ($HostName -notmatch '^[A-Za-z0-9.-]+$') { throw "Invalid allowed host: $HostName" }
}
foreach ($Path in $HealthPaths) {
    if ($Path -notmatch '^/[A-Za-z0-9._~!$&''()*+,;=:@%/-]+$') { throw "Invalid health path: $Path" }
}

$Results = foreach ($HostName in $AllowedHosts) {
    foreach ($Port in $PortsToTest) {
        foreach ($Path in $HealthPaths) {
            Invoke-SkygridProbe $HostName $Port $Path $ProbeCount $TimeoutSeconds $ExpectedVersion
        }
    }
}

$Results |
    Sort-Object @{ Expression = "healthy"; Descending = $true }, @{ Expression = "route_score"; Ascending = $true } |
    Format-Table -Property uri, verified_successes, median_latency_ms, jitter_ms, identity_verified, healthy, route_score -AutoSize

$HealthyLanes = @(
    $Results | Where-Object healthy |
    Sort-Object @{ Expression = "route_score"; Ascending = $true }, @{ Expression = "median_latency_ms"; Ascending = $true }
)
$BestLane = $HealthyLanes | Select-Object -First 1
$PreviousState = Read-JsonSafe $StateFile
$PreviousSelectedRoute = Get-PropertyValue $PreviousState "selected_route"

if (-not $PreviousSelectedRoute -and $PreviousState) {
    $LegacyUrl = [string](Get-PropertyValue $PreviousState "url")
    $LegacyPath = [string](Get-PropertyValue $PreviousState "health_endpoint")
    if ($LegacyUrl -and $LegacyPath) {
        $PreviousSelectedRoute = [pscustomobject]@{
            route_key = $LegacyUrl
            base_url = $LegacyUrl
            health_endpoint = $LegacyPath
        }
    }
}

$PreviousRouteKey = [string](Get-PropertyValue $PreviousSelectedRoute "route_key")
$PreviousLane = if ($PreviousRouteKey) {
    $HealthyLanes | Where-Object route_key -eq $PreviousRouteKey | Select-Object -First 1
} else { $null }

$Now = [datetimeoffset]::UtcNow
$Decision = "FAIL_CLOSED"
$Reason = "no_verified_lane"
$SelectedLane = $null
$PendingCandidate = $null
$ImprovementPercent = $null

if ($BestLane) {
    if (-not $PreviousSelectedRoute) {
        $Decision = "SELECT"; $Reason = "first_verified_lane"; $SelectedLane = $BestLane
    }
    elseif (-not $PreviousLane) {
        $Decision = "SWITCH"; $Reason = "previous_lane_not_verified"; $SelectedLane = $BestLane
    }
    elseif ($PreviousLane.route_key -eq $BestLane.route_key) {
        $Decision = "RETAIN"; $Reason = "current_lane_remains_best"; $SelectedLane = $PreviousLane
    }
    else {
        $PreviousLatency = [double]$PreviousLane.median_latency_ms
        $CandidateLatency = [double]$BestLane.median_latency_ms
        $ImprovementPercent = if ($PreviousLatency -gt 0) {
            [math]::Round((($PreviousLatency - $CandidateLatency) / $PreviousLatency) * 100, 2)
        } else { 0.0 }

        $SelectedAtText = [string](Get-PropertyValue $PreviousState "selected_at")
        $SelectedAt = [datetimeoffset]::MinValue
        if (-not [datetimeoffset]::TryParse($SelectedAtText, [ref]$SelectedAt)) {
            $SelectedAt = [datetimeoffset]::MinValue
        }
        $CooldownElapsed = ($Now - $SelectedAt).TotalSeconds -ge $SwitchCooldownSeconds

        $PreviousCandidate = Get-PropertyValue $PreviousState "pending_candidate"
        $PreviousCandidateKey = [string](Get-PropertyValue $PreviousCandidate "route_key")
        $PreviousConfirmations = Get-PropertyValue $PreviousCandidate "confirmations"
        $Confirmations = if ($PreviousCandidateKey -eq $BestLane.route_key) {
            [int]$PreviousConfirmations + 1
        } else { 1 }

        $PendingCandidate = [ordered]@{
            route_key = $BestLane.route_key
            base_url = $BestLane.base_url
            health_endpoint = $BestLane.path
            confirmations = $Confirmations
            observed_at = $Now.ToString("o")
            improvement_percent = $ImprovementPercent
        }

        $ImprovementMet = $ImprovementPercent -ge $SwitchImprovementPercent
        $ConfirmationsMet = $Confirmations -ge $SwitchConfirmations

        if ($ImprovementMet -and $ConfirmationsMet -and $CooldownElapsed) {
            $Decision = "SWITCH"; $Reason = "candidate_confirmed_and_materially_better"
            $SelectedLane = $BestLane; $PendingCandidate = $null
        }
        else {
            $Decision = "RETAIN"; $SelectedLane = $PreviousLane
            if (-not $ImprovementMet) { $Reason = "candidate_improvement_below_threshold" }
            elseif (-not $ConfirmationsMet) { $Reason = "candidate_waiting_for_confirmation" }
            else { $Reason = "switch_cooldown_active" }
        }
    }
}

$ObservedAt = $Now.ToString("o")
$DecisionId = [guid]::NewGuid().ToString("n")
$ReceiptPath = Join-Path $ReceiptDir "route-decision-$($Now.ToString('yyyyMMddTHHmmssfffZ'))-$DecisionId.json"
$SelectedRoute = if ($SelectedLane) {
    [ordered]@{
        route_key = $SelectedLane.route_key
        base_url = $SelectedLane.base_url
        health_endpoint = $SelectedLane.path
        median_latency_ms = $SelectedLane.median_latency_ms
        jitter_ms = $SelectedLane.jitter_ms
        route_score = $SelectedLane.route_score
        version = $SelectedLane.version
        identity_verified = $SelectedLane.identity_verified
    }
} else { $null }

$ReceiptCore = [ordered]@{
    schema = "skygrid.route-decision-receipt.v1"
    decision_id = $DecisionId
    observed_at = $ObservedAt
    product = $Product
    mode = $Mode
    sentinel = $Sentinel
    decision = $Decision
    reason = $Reason
    improvement_percent = $ImprovementPercent
    thresholds = [ordered]@{
        probe_count = $ProbeCount
        timeout_seconds = $TimeoutSeconds
        switch_improvement_percent = $SwitchImprovementPercent
        switch_confirmations = $SwitchConfirmations
        switch_cooldown_seconds = $SwitchCooldownSeconds
    }
    allowed_scope = [ordered]@{
        hosts = @($AllowedHosts)
        ports = @($PortsToTest)
        paths = @($HealthPaths)
    }
    default_adapter = $DefaultAdapter
    adapters = @($Adapters)
    previous_route = $PreviousSelectedRoute
    selected_route = $SelectedRoute
    pending_candidate = $PendingCandidate
    probes = @($Results)
}

$CanonicalReceipt = $ReceiptCore | ConvertTo-Json -Depth 16 -Compress
$ReceiptHash = Get-Sha256Hex $CanonicalReceipt
$HmacSecret = [string]$env:SKYGRID_ROUTE_RECEIPT_HMAC_KEY
$Integrity = [ordered]@{
    hash_algorithm = "SHA-256"
    sha256 = $ReceiptHash
    signature_algorithm = if ($HmacSecret) { "HMAC-SHA256" } else { $null }
    signature = if ($HmacSecret) { Get-HmacSha256Hex $CanonicalReceipt $HmacSecret } else { $null }
}

$Receipt = [ordered]@{}
foreach ($Entry in $ReceiptCore.GetEnumerator()) { $Receipt[$Entry.Key] = $Entry.Value }
$Receipt.integrity = $Integrity

$PreviousSelectedAt = [string](Get-PropertyValue $PreviousState "selected_at")
$SelectedAtOutput = if ($Decision -in @("SELECT", "SWITCH") -or -not $PreviousSelectedAt) {
    $ObservedAt
} else { $PreviousSelectedAt }

$State = [ordered]@{
    schema = "skygrid.route-state.v2"
    checked_at = $ObservedAt
    selected_at = $SelectedAtOutput
    state = if ($SelectedLane) { "HEALTHY" } else { "OFFLINE" }
    decision = $Decision
    reason = $Reason
    selected_route = $SelectedRoute
    pending_candidate = $PendingCandidate
    receipt_file = $ReceiptPath
    receipt_sha256 = $ReceiptHash
    action = if ($SelectedLane) {
        "Route verified. Continue controlled-pilot traffic."
    } else {
        "Fail closed and retain traffic in the durable queue."
    }
}

if (-not $NoStateWrite) {
    New-Item -ItemType Directory -Path $ReceiptDir -Force | Out-Null
    Write-JsonUtf8 $Receipt $ReceiptPath 18
    Write-JsonUtf8 $State $StateFile 10
}

Write-Host ""
if ($SelectedLane) {
    Write-Host "SKYGRID VERIFIED LANE: $Decision" -ForegroundColor Green
    Write-Host "URL:       $($SelectedLane.base_url)"
    Write-Host "Health:    $($SelectedLane.path)"
    Write-Host "Median:    $($SelectedLane.median_latency_ms) ms"
    Write-Host "Jitter:    $($SelectedLane.jitter_ms) ms"
    Write-Host "Reason:    $Reason"
}
else {
    Write-Host "NO VERIFIED SKYGRID LANE - FAIL CLOSED" -ForegroundColor Yellow
    Write-Host "Reason: $Reason"
}

if ($NoStateWrite) {
    Write-Host "Dry run: no state or receipt files were written."
}
else {
    Write-Host "State:     $StateFile"
    Write-Host "Receipt:   $ReceiptPath"
    Write-Host "SHA-256:   $ReceiptHash"
}
