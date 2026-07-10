function Invoke-AuraWhereAreWe {
    Write-Host ""
    Write-Host "---------------------------------------" -ForegroundColor Cyan
    Write-Host "        ??  A U R A" -ForegroundColor Cyan
    Write-Host "        The Wind of Change" -ForegroundColor Cyan
    Write-Host "---------------------------------------" -ForegroundColor Cyan
    Write-Host ""

    Write-Host "Mission" -ForegroundColor Yellow
    Write-Host "-------"
    Write-Host "Maintain SKYGRID Emergency Data On-Ramp"
    Write-Host ""

    Write-Host "Runtime" -ForegroundColor Yellow
    Write-Host "-------"
    Write-Host "Local Runtime: Active"
    Write-Host "OpenAI Mode:   $env:AURA_OPENAI_MODE"
    Write-Host "Raw Shell:     $env:AURA_RAW_SHELL"
    Write-Host ""

    Write-Host "Git" -ForegroundColor Yellow
    Write-Host "---"
    $branch = git rev-parse --abbrev-ref HEAD 2>$null
    $status = git status --short 2>$null
    Write-Host "Branch: $branch"

    if ($status) {
        Write-Host "State:  Working tree has changes" -ForegroundColor Yellow
    } else {
        Write-Host "State:  Working tree clean" -ForegroundColor Green
    }

    Write-Host ""

    Write-Host "Training" -ForegroundColor Yellow
    Write-Host "--------"
    $proofPath = "E:\Aura-core\artifacts\training"
    if (Test-Path $proofPath) {
        $proofCount = @(Get-ChildItem $proofPath -File -ErrorAction SilentlyContinue).Count
        Write-Host "Proof files: $proofCount"
    } else {
        Write-Host "Proof files: 0"
    }

    Write-Host ""

    Write-Host "Network" -ForegroundColor Yellow
    Write-Host "-------"
    $activeRoute = "E:\Aura-core\Aura\State\active-route.json"
    if (Test-Path $activeRoute) {
        $route = Get-Content $activeRoute -Raw | ConvertFrom-Json
        Write-Host "Active route: $($route.name)"
        Write-Host "URL:          $($route.url)"
        Write-Host "Avg latency:  $($route.average_latency_ms) ms"
    } else {
        Write-Host "Active route: not selected yet" -ForegroundColor Yellow
    }

    Write-Host ""

    Write-Host "Recommendation" -ForegroundColor Yellow
    Write-Host "--------------"
    if ($status) {
        Write-Host "Review local changes, then checkpoint when ready."
    } else {
        Write-Host "The path is clear. Continue building or run: road less traveled"
    }

    Write-Host ""
}

