function Write-AuraNetworkLog {
    param([string]$Message)

    $logPath = "E:\Aura-core\Aura\Logs\network-route.log"
    $logDirectory = Split-Path -Parent $logPath
    if (-not (Test-Path $logDirectory)) {
        New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null
    }

    $line = "[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message
    Add-Content -Path $logPath -Value $line
    Write-Host $line -ForegroundColor Cyan
}

function Test-AuraRouteEndpoint {
    param(
        [Parameter(Mandatory)] [string]$BaseUrl,
        [Parameter(Mandatory)] [string]$Endpoint,
        [int]$TimeoutSec = 8
    )

    $uri = "$($BaseUrl.TrimEnd('/'))$Endpoint"
    $watch = [System.Diagnostics.Stopwatch]::StartNew()

    try {
        $res = Invoke-WebRequest -Uri $uri -Method GET -UseBasicParsing -TimeoutSec $TimeoutSec
        $watch.Stop()
        $body = [string]$res.Content
        $identityOk = $body -match 'SKYGRID|Aura-Core|"ok"\s*:\s*true'

        return [pscustomobject]@{
            endpoint = $Endpoint
            uri = $uri
            ok = ($res.StatusCode -ge 200 -and $res.StatusCode -lt 300 -and $identityOk)
            status = [int]$res.StatusCode
            latency_ms = $watch.ElapsedMilliseconds
            identity_ok = $identityOk
            error = if ($identityOk) { $null } else { "Unexpected health identity" }
        }
    }
    catch {
        $watch.Stop()
        $statusCode = $null
        if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
            $statusCode = [int]$_.Exception.Response.StatusCode
        }

        return [pscustomobject]@{
            endpoint = $Endpoint
            uri = $uri
            ok = $false
            status = $statusCode
            latency_ms = $watch.ElapsedMilliseconds
            identity_ok = $false
            error = $_.Exception.Message
        }
    }
}

function Get-AuraLaneState {
    param(
        [Parameter(Mandatory)] [object[]]$Checks,
        [int]$DegradedLatencyMs = 1500
    )

    $failed = @($Checks | Where-Object { -not $_.ok })
    if ($failed.Count -eq $Checks.Count) { return "OFFLINE" }
    if ($failed.Count -gt 0) { return "DEGRADED" }

    $avg = [double](@($Checks | Measure-Object latency_ms -Average).Average)
    if ($avg -gt $DegradedLatencyMs) { return "DEGRADED" }
    return "HEALTHY"
}

function Invoke-AuraNetworkRoute {
    param(
        [switch]$Watch,
        [int]$DownIntervalSeconds = 60,
        [int]$HealthyIntervalSeconds = 300,
        [int]$StableIntervalSeconds = 900,
        [int]$RequiredRecoveryPasses = 3
    )

    $routesPath = "E:\Aura-core\Aura\Config\routes.json"
    $activePath = "E:\Aura-core\Aura\State\active-route.json"
    $stateDirectory = Split-Path -Parent $activePath
    if (-not (Test-Path $stateDirectory)) {
        New-Item -ItemType Directory -Path $stateDirectory -Force | Out-Null
    }

    $consecutivePasses = @{}
    $healthySince = @{}

    do {
        if (-not (Test-Path $routesPath)) {
            Write-AuraNetworkLog "No routes config found: $routesPath"
            return
        }

        $routes = @(Get-Content $routesPath -Raw | ConvertFrom-Json | Where-Object { $_.enabled -eq $true })
        if ($routes.Count -eq 0) {
            Write-AuraNetworkLog "No enabled routes found."
            return
        }

        $results = foreach ($route in $routes) {
            $endpoints = if ($route.endpoints) { @($route.endpoints) } else { @('/api/health') }
            Write-AuraNetworkLog "Testing lane: $($route.name) $($route.url)"

            $checks = foreach ($endpoint in $endpoints) {
                $check = Test-AuraRouteEndpoint -BaseUrl $route.url -Endpoint $endpoint
                $label = if ($check.ok) { 'PASS' } else { 'FAIL' }
                Write-AuraNetworkLog "$label $($check.uri) HTTP $($check.status) $($check.latency_ms)ms $($check.error)"
                $check
            }

            $laneState = Get-AuraLaneState -Checks $checks
            $avgLatency = [math]::Round([double](@($checks | Measure-Object latency_ms -Average).Average), 2)

            if ($laneState -eq 'HEALTHY') {
                if (-not $consecutivePasses.ContainsKey($route.name)) { $consecutivePasses[$route.name] = 0 }
                $consecutivePasses[$route.name]++
                if (-not $healthySince.ContainsKey($route.name)) { $healthySince[$route.name] = Get-Date }
            }
            else {
                $consecutivePasses[$route.name] = 0
                $healthySince.Remove($route.name)
            }

            [pscustomobject]@{
                name = $route.name
                url = $route.url
                priority = [int]$route.priority
                state = $laneState
                recovery_passes = [int]$consecutivePasses[$route.name]
                average_latency_ms = $avgLatency
                checks = $checks
            }
        }

        $best = $results |
            Where-Object { $_.state -eq 'HEALTHY' -and $_.recovery_passes -ge $RequiredRecoveryPasses } |
            Sort-Object average_latency_ms, priority |
            Select-Object -First 1

        if ($best) {
            $active = [ordered]@{
                selected_at = (Get-Date).ToString('o')
                name = $best.name
                url = $best.url
                priority = $best.priority
                state = $best.state
                average_latency_ms = $best.average_latency_ms
                recovery_passes = $best.recovery_passes
                reason = "Healthy Aura/SKYGRID identity confirmed for $RequiredRecoveryPasses consecutive checks; selected by latency then priority."
            }
            $active | ConvertTo-Json -Depth 6 | Set-Content $activePath
            Write-AuraNetworkLog "ACTIVE lane $($best.name) $($best.url) avg=$($best.average_latency_ms)ms"
        }
        else {
            $offline = [ordered]@{
                selected_at = (Get-Date).ToString('o')
                name = $null
                url = $null
                state = 'OFFLINE'
                reason = 'No lane has completed the required recovery checks. Preserve traffic in the durable local queue.'
            }
            $offline | ConvertTo-Json -Depth 6 | Set-Content $activePath
            Write-AuraNetworkLog "No verified lane available; durable local queue required."
        }

        $results | Select-Object name,url,priority,state,recovery_passes,average_latency_ms | Format-Table -AutoSize

        if ($Watch) {
            $anyHealthy = @($results | Where-Object state -eq 'HEALTHY').Count -gt 0
            $stableForHour = $false
            if ($best -and $healthySince.ContainsKey($best.name)) {
                $stableForHour = ((Get-Date) - $healthySince[$best.name]).TotalHours -ge 1
            }

            $sleepSeconds = if (-not $anyHealthy) {
                $DownIntervalSeconds
            } elseif ($stableForHour) {
                $StableIntervalSeconds
            } else {
                $HealthyIntervalSeconds
            }

            Write-AuraNetworkLog "Next lane preflight in $sleepSeconds seconds."
            Start-Sleep -Seconds $sleepSeconds
        }
    } while ($Watch)
}
