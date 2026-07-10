function Invoke-AuraConfigDoctor {
    $repo = "E:\Aura-core"
    $checks = New-Object System.Collections.Generic.List[object]

    function Add-AuraConfigCheck {
        param(
            [string]$Name,
            [bool]$Ok,
            [string]$Detail
        )

        $checks.Add([pscustomobject]@{
            Name = $Name
            Ok = $Ok
            Detail = $Detail
        }) | Out-Null
    }

    Add-AuraConfigCheck "Aura mode local" ($env:AURA_MODE -eq "local") ("AURA_MODE={0}" -f $env:AURA_MODE)
    Add-AuraConfigCheck "OpenAI offline mode" ($env:AURA_OPENAI_MODE -eq "offline") ("AURA_OPENAI_MODE={0}" -f $env:AURA_OPENAI_MODE)
    Add-AuraConfigCheck "Raw shell disabled" ($env:AURA_RAW_SHELL -eq "disabled") ("AURA_RAW_SHELL={0}" -f $env:AURA_RAW_SHELL)

    $routesPath = Join-Path $repo "Aura\Config\routes.json"
    $activeRoutePath = Join-Path $repo "Aura\State\active-route.json"
    $awsConnectedPath = Join-Path $repo "Aura\State\aws-connected.json"
    $awsSupportPath = Join-Path $repo "Aura\State\aws-support-bootstrap.json"
    $proofReportPath = Join-Path $repo "artifacts\reports\aura-proof-report.md"
    $pnpkProofPath = Join-Path $repo "artifacts\pnpk\proofs"
    $desktopMain = Join-Path $repo "desktop-gpt\main.cjs"
    $desktopPreload = Join-Path $repo "desktop-gpt\preload.cjs"
    $desktopIndex = Join-Path $repo "desktop-gpt\index.html"
    $gitignorePath = Join-Path $repo ".gitignore"

    Add-AuraConfigCheck "Route config exists" (Test-Path $routesPath) $routesPath
    Add-AuraConfigCheck "Active route selected" (Test-Path $activeRoutePath) $activeRoutePath
    Add-AuraConfigCheck "AWS connected proof exists" (Test-Path $awsConnectedPath) $awsConnectedPath
    Add-AuraConfigCheck "AWS support bootstrap recorded" (Test-Path $awsSupportPath) $awsSupportPath
    Add-AuraConfigCheck "Aura proof report exists" (Test-Path $proofReportPath) $proofReportPath
    Add-AuraConfigCheck "PNPk proof folder exists" (Test-Path $pnpkProofPath) $pnpkProofPath
    Add-AuraConfigCheck "Desktop main exists" (Test-Path $desktopMain) $desktopMain
    Add-AuraConfigCheck "Desktop preload exists" (Test-Path $desktopPreload) $desktopPreload
    Add-AuraConfigCheck "Desktop cockpit UI exists" (Test-Path $desktopIndex) $desktopIndex

    if (Test-Path $gitignorePath) {
        $gitignore = Get-Content $gitignorePath -Raw

        Add-AuraConfigCheck "Aura state ignored" (($gitignore -match "Aura/State") -or ($gitignore -match "Aura\\State")) ".gitignore"
        Add-AuraConfigCheck "Aura logs ignored" (($gitignore -match "Aura/Logs") -or ($gitignore -match "Aura\\Logs")) ".gitignore"
        Add-AuraConfigCheck "CloudShell artifacts ignored" (($gitignore -match "artifacts/aws/cloudshell") -or ($gitignore -match "artifacts\\aws\\cloudshell")) ".gitignore"
    } else {
        Add-AuraConfigCheck ".gitignore exists" $false $gitignorePath
    }

    $gitStatus = git status --porcelain
    Add-AuraConfigCheck "Git working tree clean" ([string]::IsNullOrWhiteSpace($gitStatus)) "git status --porcelain"

    $okCount = ($checks | Where-Object { $_.Ok }).Count
    $needCount = ($checks | Where-Object { -not $_.Ok }).Count
    $checkedAt = Get-Date -Format o

    Write-Host ""
    Write-Host "AURA CONFIG DOCTOR" -ForegroundColor Cyan
    Write-Host "------------------"
    Write-Host ("Repo:      {0}" -f $repo)
    Write-Host ("Checked:   {0}" -f $checkedAt)
    Write-Host ("Passed:    {0}" -f $okCount)
    Write-Host ("Needs:     {0}" -f $needCount)
    Write-Host ""

    foreach ($check in $checks) {
        if ($check.Ok) {
            Write-Host ("[OK]   {0} - {1}" -f $check.Name, $check.Detail) -ForegroundColor Green
        } else {
            Write-Host ("[NEED] {0} - {1}" -f $check.Name, $check.Detail) -ForegroundColor Yellow
        }
    }

    Write-Host ""
    Write-Host "Recommendation" -ForegroundColor Yellow
    Write-Host "--------------"

    if ($needCount -eq 0) {
        Write-Host "Configuration is clean. Safe to continue."
    } else {
        Write-Host "Fix the [NEED] items before the next build or deploy session."
    }

    $reportDir = Join-Path $repo "artifacts\reports"
    New-Item -ItemType Directory -Force $reportDir | Out-Null

    $reportPath = Join-Path $reportDir "aura-config-doctor.md"

    $lines = New-Object System.Collections.Generic.List[string]
    $lines.Add("# Aura Config Doctor") | Out-Null
    $lines.Add("") | Out-Null
    $lines.Add(("- Repo: {0}" -f $repo)) | Out-Null
    $lines.Add(("- Checked: {0}" -f $checkedAt)) | Out-Null
    $lines.Add(("- Passed: {0}" -f $okCount)) | Out-Null
    $lines.Add(("- Needs: {0}" -f $needCount)) | Out-Null
    $lines.Add("") | Out-Null
    $lines.Add("## Checks") | Out-Null
    $lines.Add("") | Out-Null

    foreach ($check in $checks) {
        $mark = "NEED"
        if ($check.Ok) {
            $mark = "OK"
        }

        $lines.Add(("- {0} - {1}: {2}" -f $mark, $check.Name, $check.Detail)) | Out-Null
    }

    $lines | Set-Content $reportPath

    Write-Host ""
    Write-Host ("Report: {0}" -f $reportPath)
}
