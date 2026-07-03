function Invoke-AuraRuntime {
    param([string]$InputText)

    switch -Regex ($InputText.ToLower()) {
        "config|settings" {
            @{ DryRun = $true; AllowGitPush = $false; AllowDeploy = $false } | ConvertTo-Json
            break
        }

        "status|git status" {
            git status
            break
        }

        "checkpoint|commit" {
            git status --short
            Write-Host "Checkpoint available. DryRun safe mode active." -ForegroundColor Yellow
            break
        }
        "training status" {
            . .\Aura\Skills\Training.ps1
            Invoke-AuraTrainingStatus
            break
        }

        "show proof" {
            . .\Aura\Skills\Training.ps1
            Invoke-AuraShowProof
            break
        }

        "validate training" {
            . .\Aura\Skills\Training.ps1
            Invoke-AuraValidateTraining
            break
        }
        "learn phrase" {
            . .\Aura\Skills\Training.ps1
            Invoke-AuraLearnPhrase
            break
        }



        default {
            Write-Host "Aura runtime loaded, but command not recognized: $InputText" -ForegroundColor Yellow
        }
    }
}

Write-Host "Aura runtime repaired." -ForegroundColor Green


