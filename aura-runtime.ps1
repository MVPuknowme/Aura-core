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

        default {
            Write-Host "Aura runtime loaded, but command not recognized: $InputText" -ForegroundColor Yellow
        }
    }
}

Write-Host "Aura runtime repaired." -ForegroundColor Green
