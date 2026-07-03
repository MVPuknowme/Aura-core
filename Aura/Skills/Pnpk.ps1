function Invoke-AuraPnpkStatus {
    $root = "E:\Aura-core"
    $packages = Join-Path $root "artifacts\pnpk\packages"
    $proofs = Join-Path $root "artifacts\pnpk\proofs"

    New-Item -ItemType Directory -Force $packages | Out-Null
    New-Item -ItemType Directory -Force $proofs | Out-Null

    $packageItems = @(Get-ChildItem $packages -Filter "*.pnpk" -File -ErrorAction SilentlyContinue)
    $proofItems = @(Get-ChildItem $proofs -File -ErrorAction SilentlyContinue)

    Write-Host ""
    Write-Host "AURA PNPk STATUS" -ForegroundColor Cyan
    Write-Host "----------------"
    Write-Host ("Packages: {0}" -f $packageItems.Count)
    Write-Host ("Proofs:   {0}" -f $proofItems.Count)
    Write-Host ""

    $packageItems |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 5 Name,Length,LastWriteTime

    Write-Host ""
    Write-Host "Recommendation: create pnpk or validate pnpk when ready." -ForegroundColor Yellow
    Write-Host ""
}

function New-AuraPnpkPackage {
    $root = "E:\Aura-core"
    $packages = Join-Path $root "artifacts\pnpk\packages"
    New-Item -ItemType Directory -Force $packages | Out-Null

    Write-Host ""
    Write-Host "AURA PNPk PACKAGE CREATOR" -ForegroundColor Cyan
    Write-Host "-------------------------"

    $name = Read-Host "Package name"
    $purpose = Read-Host "Purpose"
    $permitted = Read-Host "Permitted actions, comma separated"
    $expected = Read-Host "Expected outputs, comma separated"
    $proofFiles = Read-Host "Proof files, comma separated"

    $slug = ($name.ToLower() -replace "[^a-z0-9]+","-").Trim("-")
    if (-not $slug) { $slug = "aura-pnpk-package" }

    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $path = Join-Path $packages "$timestamp-$slug.pnpk"

    $package = [ordered]@{
        format = "aura.pnpk"
        version = "0.1.0"
        name = $name
        purpose = $purpose
        created_at = (Get-Date).ToString("o")
        created_by = "Aura Local Runtime"
        mode = "local"
        openai_required = $false
        raw_shell_execution = $false
        wallet_mode = "read-only"
        permitted_actions = @($permitted -split "," | ForEach-Object { $_.Trim() } | Where-Object { $_ })
        blocked_actions = @(
            "raw_shell",
            "push",
            "deploy",
            "wallet_sign",
            "wallet_send",
            "secret_print"
        )
        inputs = @()
        expected_outputs = @($expected -split "," | ForEach-Object { $_.Trim() } | Where-Object { $_ })
        proof_files = @($proofFiles -split "," | ForEach-Object { $_.Trim() } | Where-Object { $_ })
        checkpoint_recommendation = "Review package proof and checkpoint when ready."
    }

    $package | ConvertTo-Json -Depth 8 | Set-Content $path

    Write-Host ""
    Write-Host "PNPk package created:" -ForegroundColor Green
    Write-Host $path
    Write-Host ""
    Write-Host "Recommendation: validate pnpk, then checkpoint." -ForegroundColor Yellow
    Write-Host ""
}

function Test-AuraPnpkPackage {
    $root = "E:\Aura-core"
    $packages = Join-Path $root "artifacts\pnpk\packages"
    $proofs = Join-Path $root "artifacts\pnpk\proofs"
    $proofPath = Join-Path $proofs "pnpk-validation-proof.json"

    New-Item -ItemType Directory -Force $packages | Out-Null
    New-Item -ItemType Directory -Force $proofs | Out-Null

    $required = @(
        "format",
        "version",
        "name",
        "purpose",
        "created_at",
        "mode",
        "openai_required",
        "raw_shell_execution",
        "wallet_mode",
        "permitted_actions",
        "blocked_actions",
        "expected_outputs",
        "proof_files",
        "checkpoint_recommendation"
    )

    $requiredBlocked = @(
        "raw_shell",
        "push",
        "deploy",
        "wallet_sign",
        "wallet_send",
        "secret_print"
    )

    $files = @(Get-ChildItem $packages -Filter "*.pnpk" -File -ErrorAction SilentlyContinue)
    $results = @()

    foreach ($file in $files) {
        $ok = $true
        $errors = New-Object System.Collections.Generic.List[string]

        try {
            $pkg = Get-Content $file.FullName -Raw | ConvertFrom-Json

            foreach ($field in $required) {
                if (-not ($pkg.PSObject.Properties.Name -contains $field)) {
                    $ok = $false
                    $errors.Add("Missing field: $field")
                }
            }

            if ($pkg.format -ne "aura.pnpk") {
                $ok = $false
                $errors.Add("format must be aura.pnpk")
            }

            if ($pkg.openai_required -ne $false) {
                $ok = $false
                $errors.Add("openai_required must be false")
            }

            if ($pkg.raw_shell_execution -ne $false) {
                $ok = $false
                $errors.Add("raw_shell_execution must be false")
            }

            if ($pkg.wallet_mode -ne "read-only") {
                $ok = $false
                $errors.Add("wallet_mode must be read-only")
            }

            foreach ($blocked in $requiredBlocked) {
                if ($pkg.blocked_actions -notcontains $blocked) {
                    $ok = $false
                    $errors.Add("Missing blocked action: $blocked")
                }
            }
        }
        catch {
            $ok = $false
            $errors.Add($_.Exception.Message)
        }

        $results += [pscustomobject]@{
            file = $file.FullName
            ok = $ok
            errors = @($errors)
        }
    }

    $proof = [ordered]@{
        format = "aura.pnpk.validation"
        version = "0.1.0"
        generated_at = (Get-Date).ToString("o")
        package_count = $files.Count
        passed = (@($results | Where-Object { $_.ok -eq $false }).Count -eq 0)
        results = $results
    }

    $proof | ConvertTo-Json -Depth 10 | Set-Content $proofPath

    Write-Host ""
    Write-Host "AURA PNPk VALIDATION" -ForegroundColor Cyan
    Write-Host "--------------------"
    Write-Host ("Packages checked: {0}" -f $files.Count)
    Write-Host ("Passed: {0}" -f $proof.passed)
    Write-Host ("Proof: {0}" -f $proofPath)
    Write-Host ""
}

function Show-AuraPnpkPackages {
    $packages = "E:\Aura-core\artifacts\pnpk\packages"

    New-Item -ItemType Directory -Force $packages | Out-Null

    Write-Host ""
    Write-Host "AURA PNPk PACKAGES" -ForegroundColor Cyan
    Write-Host "------------------"

    Get-ChildItem $packages -Filter "*.pnpk" -File -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending |
        Select-Object Name,Length,LastWriteTime,FullName

    Write-Host ""
}

function Export-AuraPnpkProof {
    $root = "E:\Aura-core"
    $packages = Join-Path $root "artifacts\pnpk\packages"
    $proofs = Join-Path $root "artifacts\pnpk\proofs"
    $report = Join-Path $proofs "pnpk-proof-report.md"
    $validation = Join-Path $proofs "pnpk-validation-proof.json"

    New-Item -ItemType Directory -Force $packages | Out-Null
    New-Item -ItemType Directory -Force $proofs | Out-Null

    $packageItems = @(Get-ChildItem $packages -Filter "*.pnpk" -File -ErrorAction SilentlyContinue)

    $lines = @()
    $lines += "# AURA PNPk Proof Report"
    $lines += ""
    $lines += ("Generated: {0}" -f (Get-Date -Format o))
    $lines += ""
    $lines += "## Summary"
    $lines += ""
    $lines += ("- Package count: {0}" -f $packageItems.Count)
    $lines += ("- Validation proof exists: {0}" -f (Test-Path $validation))
    $lines += "- OpenAI required: false"
    $lines += "- Raw shell execution: false"
    $lines += "- Wallet mode: read-only"
    $lines += ""
    $lines += "## Latest packages"

    foreach ($item in ($packageItems | Sort-Object LastWriteTime -Descending | Select-Object -First 10)) {
        $lines += ""
        $lines += ("- {0}" -f $item.Name)
        $lines += ("  - Modified: {0}" -f $item.LastWriteTime)
        $lines += ("  - Size: {0} bytes" -f $item.Length)
    }

    $lines += ""
    $lines += "## Recommendation"
    $lines += ""
    $lines += "Review package proof and checkpoint when ready."

    $lines | Set-Content $report

    Write-Host ""
    Write-Host "AURA PNPk PROOF REPORT" -ForegroundColor Cyan
    Write-Host "----------------------"
    Write-Host $report
    Write-Host ""
}
