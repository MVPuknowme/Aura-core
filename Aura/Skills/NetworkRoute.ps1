function Write-AuraNetworkLog {
    param([string]$Message)

    $logPath = "E:\Aura-core\Aura\Logs\network-route.log"
    $line = "[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message
    Add-Content -Path $logPath -Value $line
    Write-Host $line -ForegroundColor Cyan
}

function Test-AuraRouteEndpoint {
    param(
        [string]$BaseUrl,
        [string]$Endpoint
    )

    $uri = "$BaseUrl$Endpoint"
    $watch = [System.Diagnostics.Stopwatch]::StartNew()

    try {
        $res = Invoke-WebRequest -Uri $uri -Method GET -UseBasicParsing -TimeoutSec 15
        $watch.Stop()

        return [ordered]@{
            endpoint = $Endpoint
            uri = $uri
            ok = ($res.StatusCode -ge 200 -and $res.StatusCode -lt 300)
            status = $res.StatusCode
            latency_ms = $watch.ElapsedMilliseconds
            error = $null
        }
    }
    catch {
        $watch.Stop()

        $statusCode = $null
        if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
            $statusCode = [int]$_.Exception.Response.StatusCode
        }

        return [ordered]@{
            endpoint = $Endpoint
            uri = $uri
            ok = $false
            status = $statusCode
            latency_ms = $watch.ElapsedMilliseconds
            error = $_.Exception.Message
        }
    }
}

function Invoke-AuraNetworkRoute {
    $routesPath = "E:\Aura-core\Aura\Config\routes.json"
    $activePath = "E:\Aura-core\Aura\Config\active-route.json"

    if (-not (Test-Path $routesPath)) {
        Write-AuraNetworkLog "No routes config found: $routesPath"
        return
    }

    $routes = Get-Content $routesPath -Raw | ConvertFrom-Json
    $enabledRoutes = @($routes | Where-Object { $_.enabled -eq $true })

    if ($enabledRoutes.Count -eq 0) {
        Write-AuraNetworkLog "No enabled routes found."
        return
    }

    $endpoints = @(
        "/api/health",
        "/api/highway/status",
        "/api/highway/postman"
    )

    $results = @()

    foreach ($route in $enabledRoutes) {
        Write-AuraNetworkLog "Testing route: $($route.name) $($route.url)"

        $checks = @()
        foreach ($endpoint in $endpoints) {
            $check = Test-AuraRouteEndpoint -BaseUrl $route.url -Endpoint $endpoint
            $checks += [pscustomobject]$check

            if ($check.ok) {
                Write-AuraNetworkLog "PASS $($check.uri) HTTP $($check.status) $($check.latency_ms)ms"
            } else {
                Write-AuraNetworkLog "FAIL $($check.uri) HTTP $($check.status) $($check.latency_ms)ms $($check.error)"
            }
        }

        $allOk = -not (@($checks | Where-Object { $_.ok -ne $true }).Count -gt 0)
        $avgLatency = [math]::Round((@($checks | Measure-Object -Property latency_ms -Average).Average), 2)

        $results += [pscustomobject]@{
            name = $route.name
            url = $route.url
            priority = [int]$route.priority
            all_ok = $allOk
            average_latency_ms = $avgLatency
            checks = $checks
        }
    }

    $best = $results |
        Where-Object { $_.all_ok -eq $true } |
        Sort-Object average_latency_ms, priority |
        Select-Object -First 1

    if (-not $best) {
        Write-Host ""
        Write-Host "?? The wind has shifted." -ForegroundColor Yellow
        Write-Host "No configured route passed all health checks." -ForegroundColor Yellow
        Write-Host ""
        $results | Select-Object name,url,priority,all_ok,average_latency_ms | Format-Table -AutoSize
        return
    }

    $active = [ordered]@{
        selected_at = (Get-Date).ToString("o")
        name = $best.name
        url = $best.url
        priority = $best.priority
        average_latency_ms = $best.average_latency_ms
        reason = "Passed all required endpoints with best latency/priority score."
    }

    $active | ConvertTo-Json -Depth 5 | Set-Content $activePath

    Write-Host ""
    Write-Host "?? Road less traveled found." -ForegroundColor Green
    Write-Host "Route: $($best.name)"
    Write-Host "URL:   $($best.url)"
    Write-Host "Avg:   $($best.average_latency_ms) ms"
    Write-Host ""
    Write-Host "Saved active route:"
    Write-Host $activePath
    Write-Host ""

    $results | Select-Object name,url,priority,all_ok,average_latency_ms | Format-Table -AutoSize
}
