function Invoke-AuraTrainingStatus {
    $path = "E:\Aura-core\artifacts\training"
    Get-ChildItem $path -File -ErrorAction SilentlyContinue |
      Select-Object Name,Length,LastWriteTime
}

function Invoke-AuraShowProof {
    Get-ChildItem "E:\Aura-core\artifacts\training" -File -ErrorAction SilentlyContinue |
      Sort-Object LastWriteTime -Descending |
      Select-Object -First 5 Name,FullName,LastWriteTime
}

function Invoke-AuraValidateTraining {
    $rules = "E:\Aura-core\artifacts\training\local-training-rules.txt"

    if (Test-Path $rules) {
        Write-Host "Training rules found." -ForegroundColor Green
        Get-Content $rules
    } else {
        Write-Warning "No training rules file found."
    }
}
function New-AuraTrainingProof {
    param(
        [Parameter(Mandatory=$true)][string]$Phrase,
        [Parameter(Mandatory=$true)][string]$Intent,
        [Parameter(Mandatory=$true)][string]$Skill,
        [string]$SafetyLevel = "safe-local",
        [string]$ExpectedOutput = "Command routes to allowlisted local skill."
    )

    $root = "E:\Aura-core"
    $trainingDir = Join-Path $root "artifacts\training"
    New-Item -ItemType Directory -Force $trainingDir | Out-Null

    $slug = ($Phrase.ToLower() -replace "[^a-z0-9]+","-").Trim("-")
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $path = Join-Path $trainingDir "$timestamp-$slug-proof.json"

    $proof = [ordered]@{
        phrase = $Phrase
        intent = $Intent
        skill = $Skill
        safety_level = $SafetyLevel
        proof_file = $path
        expected_output = $ExpectedOutput
        raw_shell_execution = $false
        openai_required = $false
        wallet_mode = "read-only"
        created_at = (Get-Date).ToString("o")
    }

    $proof | ConvertTo-Json -Depth 5 | Set-Content $path

    Write-Host "Aura learned phrase:" -ForegroundColor Green
    Write-Host "  $Phrase"
    Write-Host "Proof saved:"
    Write-Host "  $path"
}

function Invoke-AuraLearnPhrase {
    Write-Host "Aura local phrase trainer" -ForegroundColor Cyan

    $phrase = Read-Host "User phrase"
    $intent = Read-Host "Intent name"
    $skill  = Read-Host "Allowed skill/function"
    $expected = Read-Host "Expected output pattern"

    New-AuraTrainingProof -Phrase $phrase -Intent $intent -Skill $skill -ExpectedOutput $expected
}
function New-AuraTrainingProof {
    param(
        [Parameter(Mandatory=$true)][string]$Phrase,
        [Parameter(Mandatory=$true)][string]$Intent,
        [Parameter(Mandatory=$true)][string]$Skill,
        [string]$SafetyLevel = "safe-local",
        [string]$ExpectedOutput = "Command routes to allowlisted local skill."
    )

    $root = "E:\Aura-core"
    $trainingDir = Join-Path $root "artifacts\training"
    New-Item -ItemType Directory -Force $trainingDir | Out-Null

    $slug = ($Phrase.ToLower() -replace "[^a-z0-9]+","-").Trim("-")
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $path = Join-Path $trainingDir "$timestamp-$slug-proof.json"

    $proof = [ordered]@{
        phrase = $Phrase
        intent = $Intent
        skill = $Skill
        safety_level = $SafetyLevel
        proof_file = $path
        expected_output = $ExpectedOutput
        raw_shell_execution = $false
        openai_required = $false
        wallet_mode = "read-only"
        created_at = (Get-Date).ToString("o")
    }

    $proof | ConvertTo-Json -Depth 5 | Set-Content $path

    Write-Host "Aura learned phrase:" -ForegroundColor Green
    Write-Host "  $Phrase"
    Write-Host "Proof saved:"
    Write-Host "  $path"
}

function Invoke-AuraLearnPhrase {
    Write-Host "Aura local phrase trainer" -ForegroundColor Cyan

    $phrase = Read-Host "User phrase"
    $intent = Read-Host "Intent name"
    $skill  = Read-Host "Allowed skill/function"
    $expected = Read-Host "Expected output pattern"

    New-AuraTrainingProof -Phrase $phrase -Intent $intent -Skill $skill -ExpectedOutput $expected
}
