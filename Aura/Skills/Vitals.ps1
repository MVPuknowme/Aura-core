function Invoke-AuraVitals {
    Write-Host ""
    Write-Host "AURA VITALS" -ForegroundColor Cyan
    Write-Host "-----------"

    Write-Host "Runtime:      Local active"
    Write-Host "OpenAI Mode:  $env:AURA_OPENAI_MODE"
    Write-Host "Raw Shell:    $env:AURA_RAW_SHELL"

    $branch = git rev-parse --abbrev-ref HEAD 2>$null
    $dirty = git status --short 2>$null

    Write-Host "Git Branch:   $branch"

    if ($dirty) {
        Write-Host "Git State:    Changes present" -ForegroundColor Yellow
    } else {
        Write-Host "Git State:    Clean" -ForegroundColor Green
    }

    $proofPath = "E:\Aura-core\artifacts\training"
    $proofCount = 0
    if (Test-Path $proofPath) {
        $proofCount = @(Get-ChildItem $proofPath -File -ErrorAction SilentlyContinue).Count
    }

    Write-Host "Proof Files:  $proofCount"

    $activeRoute = "E:\Aura-core\Aura\State\active-route.json"
    if (Test-Path $activeRoute) {
        $route = Get-Content $activeRoute -Raw | ConvertFrom-Json
        Write-Host "Route:        $($route.name)"
        Write-Host "Route URL:    $($route.url)"
    } else {
        Write-Host "Route:        Not selected" -ForegroundColor Yellow
    }

    Write-Host "Wallet:       Read-only"
    Write-Host ""
}
