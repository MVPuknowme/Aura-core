$StateDir = "E:\Aura-core\Aura\State"
$StateFile = Join-Path $StateDir "active-route.json"

New-Item -ItemType Directory -Path $StateDir -Force | Out-Null

$LocalIp = (
    Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object {
        $_.IPAddress -notlike "169.254.*" -and
        $_.IPAddress -ne "127.0.0.1" -and
        $_.InterfaceAlias -eq "Wi-Fi"
    } |
    Select-Object -First 1 -ExpandProperty IPAddress
)

$HostsToTest = @(
    "127.0.0.1",
    $LocalIp,
    "host.docker.internal"
) | Where-Object { $_ } | Select-Object -Unique

$PortsToTest = @(3000, 3001, 4173, 5000, 8000, 8080, 8787)
$HealthPaths = @(
    "/api/health",
    "/health",
    "/api/highway/status"
)

$Results = foreach ($HostName in $HostsToTest) {
    foreach ($Port in $PortsToTest) {
        foreach ($Path in $HealthPaths) {
            $Uri = "http://${HostName}:$Port$Path"
            $Timer = [System.Diagnostics.Stopwatch]::StartNew()

            try {
                $Response = Invoke-WebRequest `
                    -Uri $Uri `
                    -Method Get `
                    -TimeoutSec 3 `
                    -UseBasicParsing

                $Timer.Stop()

                $Body = [string]$Response.Content
                $IdentityVerified =
                    $Body -match "SKYGRID|Aura-Core|Aura Core" -or
                    $Body -match '"ok"\s*:\s*true'

                [pscustomobject]@{
                    Uri              = $Uri
                    Host             = $HostName
                    Port             = $Port
                    Path             = $Path
                    StatusCode       = [int]$Response.StatusCode
                    LatencyMs        = $Timer.ElapsedMilliseconds
                    Reachable        = $true
                    IdentityVerified = $IdentityVerified
                    Healthy          = (
                        $Response.StatusCode -ge 200 -and
                        $Response.StatusCode -lt 300 -and
                        $IdentityVerified
                    )
                    Error            = $null
                }
            }
            catch {
                $Timer.Stop()

                [pscustomobject]@{
                    Uri              = $Uri
                    Host             = $HostName
                    Port             = $Port
                    Path             = $Path
                    StatusCode       = $null
                    LatencyMs        = $Timer.ElapsedMilliseconds
                    Reachable        = $false
                    IdentityVerified = $false
                    Healthy          = $false
                    Error            = $_.Exception.Message
                }
            }
        }
    }
}

$Results |
    Sort-Object `
        @{ Expression = "Healthy"; Descending = $true }, `
        @{ Expression = "LatencyMs"; Ascending = $true } |
    Format-Table Uri, StatusCode, LatencyMs, Reachable, IdentityVerified, Healthy -AutoSize

$BestLane = $Results |
    Where-Object { $_.Healthy -eq $true } |
    Sort-Object `
        @{ Expression = "LatencyMs"; Ascending = $true } |
    Select-Object -First 1

if ($BestLane) {
    $ActiveRoute = [ordered]@{
        selected_at       = (Get-Date).ToString("o")
        name              = "local-aura-core"
        url               = "http://$($BestLane.Host):$($BestLane.Port)"
        health_endpoint   = $BestLane.Path
        status_code       = $BestLane.StatusCode
        latency_ms        = $BestLane.LatencyMs
        identity_verified = $BestLane.IdentityVerified
        state             = "HEALTHY"
        reason            = "Fastest verified local Aura-Core service."
    }

    $ActiveRoute |
        ConvertTo-Json -Depth 5 |
        Set-Content -Path $StateFile -Encoding UTF8

    Write-Host ""
    Write-Host "AURA-CORE LOCAL LANE SELECTED" -ForegroundColor Green
    Write-Host "URL:     $($ActiveRoute.url)"
    Write-Host "Health:  $($ActiveRoute.health_endpoint)"
    Write-Host "Latency: $($ActiveRoute.latency_ms) ms"
    Write-Host "Saved:   $StateFile"
}
else {
    $OfflineState = [ordered]@{
        checked_at = (Get-Date).ToString("o")
        state      = "OFFLINE"
        reason     = "No verified local Aura-Core service was found."
        action     = "Start the local service or retain traffic in the durable queue."
    }

    $OfflineState |
        ConvertTo-Json |
        Set-Content -Path $StateFile -Encoding UTF8

    Write-Host ""
    Write-Host "NO VERIFIED LOCAL AURA-CORE LANE FOUND" -ForegroundColor Yellow
    Write-Host "State written to $StateFile"
}
