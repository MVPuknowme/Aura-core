function Invoke-AuraPostmanProof {
    $root = "E:\Aura-core"
    $activeRoutePath = Join-Path $root "Aura\State\active-route.json"
    $collectionPath = Join-Path $root "postman\skygrid-aura-desktop.generated.collection.json"
    $validationDir = Join-Path $root "artifacts\validation"
    $jsonProof = Join-Path $validationDir "aura-postman-proof.json"
    $mdProof = Join-Path $validationDir "aura-postman-proof.md"

    New-Item -ItemType Directory -Force $validationDir | Out-Null

    Write-Host ""
    Write-Host "AURA POSTMAN PROOF" -ForegroundColor Cyan
    Write-Host "------------------"

    if (-not (Test-Path $activeRoutePath)) {
        Write-Host "Active Route: not found" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Recommendation:"
        Write-Host 'Run: Invoke-AuraRuntime "road less traveled"'
        Write-Host ""
        return
    }

    $route = Get-Content $activeRoutePath -Raw | ConvertFrom-Json
    $baseUrl = $route.url

    if (-not (Test-Path $collectionPath)) {
        Write-Host "Collection: missing" -ForegroundColor Red
        Write-Host $collectionPath
        Write-Host ""
        Write-Host "Recommendation:"
        Write-Host "Regenerate or restore the Postman collection before running proof."
        Write-Host ""
        return
    }

    $newmanVersion = $null
    try {
        $newmanVersion = (newman --version 2>$null | Out-String).Trim()
    }
    catch {
        Write-Host "Newman: not available" -ForegroundColor Red
        Write-Host ""
        Write-Host "Recommendation:"
        Write-Host "Install Newman with: npm install -g newman"
        Write-Host ""
        return
    }

    Write-Host ("Active Route: {0}" -f $baseUrl)
    Write-Host ("Collection:   {0}" -f $collectionPath)
    Write-Host ("Newman:       {0}" -f $newmanVersion)
    Write-Host ""

    $started = Get-Date
    $exitCode = 0

    & newman run $collectionPath `
        --env-var "base_url=$baseUrl" `
        --reporters cli,json `
        --reporter-json-export $jsonProof

    $exitCode = $LASTEXITCODE
    $ended = Get-Date

    $resultText = if ($exitCode -eq 0) { "PASS" } else { "FAIL" }

    $lines = @()
    $lines += "# AURA Postman Proof"
    $lines += ""
    $lines += ("Generated: {0}" -f (Get-Date -Format o))
    $lines += ""
    $lines += "## Route"
    $lines += ""
    $lines += ("- Name: {0}" -f $route.name)
    $lines += ("- URL: {0}" -f $baseUrl)
    $lines += ("- Average Latency: {0} ms" -f $route.average_latency_ms)
    $lines += ""
    $lines += "## Collection"
    $lines += ""
    $lines += ("- Path: {0}" -f $collectionPath)
    $lines += ""
    $lines += "## Newman"
    $lines += ""
    $lines += ("- Version: {0}" -f $newmanVersion)
    $lines += ("- Started: {0}" -f $started.ToString("o"))
    $lines += ("- Ended: {0}" -f $ended.ToString("o"))
    $lines += ("- Exit Code: {0}" -f $exitCode)
    $lines += ("- Result: {0}" -f $resultText)
    $lines += ""
    $lines += "## Proof Files"
    $lines += ""
    $lines += ("- JSON: {0}" -f $jsonProof)
    $lines += ("- Markdown: {0}" -f $mdProof)
    $lines += ""
    $lines += "## Safety"
    $lines += ""
    $lines += "- OpenAI required: false"
    $lines += "- Raw shell execution from user text: false"
    $lines += "- Push: not performed"
    $lines += "- Deploy: not performed"
    $lines += "- Wallet: read-only"
    $lines += ""

    if ($exitCode -eq 0) {
        $lines += "## Recommendation"
        $lines += ""
        $lines += "Checkpoint validation artifacts when ready."
    } else {
        $lines += "## Recommendation"
        $lines += ""
        $lines += "Review the failing route or Postman collection before checkpoint."
    }

    $lines | Set-Content $mdProof

    Write-Host ""
    Write-Host ("Result:         {0}" -f $resultText) -ForegroundColor $(if ($exitCode -eq 0) { "Green" } else { "Red" })
    Write-Host ("JSON Proof:     {0}" -f $jsonProof)
    Write-Host ("Markdown Proof: {0}" -f $mdProof)
    Write-Host ""

    if ($exitCode -eq 0) {
        Write-Host "Recommendation: checkpoint validation artifacts when ready." -ForegroundColor Green
    } else {
        Write-Host "Recommendation: review failing collection or route before checkpoint." -ForegroundColor Yellow
    }

    Write-Host ""
}
