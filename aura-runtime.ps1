
function Get-AuraCommandRegistry {
    $registryPath = "E:\Aura-core\Aura\Config\commands.json"

    if (-not (Test-Path $registryPath)) {
        Write-Host "Aura command registry not found: $registryPath" -ForegroundColor Yellow
        return @()
    }

    try {
        $commands = Get-Content $registryPath -Raw | ConvertFrom-Json
        return @($commands)
    }
    catch {
        Write-Host "Aura command registry failed to load: $($_.Exception.Message)" -ForegroundColor Red
        return @()
    }
}

function Invoke-AuraRegistryCommand {
    param(
        [Parameter(Mandatory=$true)]
        [string]$InputText
    )

    $normalized = $InputText.ToLower().Trim()
    $commands = Get-AuraCommandRegistry

    $match = $commands | Where-Object {
        $_.enabled -eq $true -and $_.phrase.ToLower().Trim() -eq $normalized
    } | Select-Object -First 1

    if (-not $match) {
        return $false
    }

    Write-Host "Aura registry matched phrase: $($match.phrase)" -ForegroundColor Cyan
    Write-Host "Intent: $($match.intent)"
    Write-Host "Skill: $($match.skill)"
    Write-Host "Safety: $($match.safety_level)"

    switch ($match.skill) {
        "Invoke-AuraTrainingStatus" {
            . .\Aura\Skills\Training.ps1
            Invoke-AuraTrainingStatus
            return $true
        }

        "Invoke-AuraShowProof" {
            . .\Aura\Skills\Training.ps1
            Invoke-AuraShowProof
            return $true
        }

        "Invoke-AuraValidateTraining" {
            . .\Aura\Skills\Training.ps1
            Invoke-AuraValidateTraining
            return $true
        }

        "Invoke-AuraRuntime" {
            . .\Aura\Skills\Diagnostics.ps1
            Invoke-AuraWhereAreWe
            return $true
        }

        "Invoke-AuraNetworkRoute" {
            . .\Aura\Skills\NetworkRoute.ps1
            Invoke-AuraNetworkRoute
            return $true
        }
        "vitals" {
            . .\Aura\Skills\Vitals.ps1
            Invoke-AuraVitals
            break
        }
        "help|commands|what can you do" {
            . .\Aura\Skills\Help.ps1
            Invoke-AuraHelp
            break
        }
        "export proof report|proof report|export training proof" {
            . .\Aura\Skills\ProofReport.ps1
            Invoke-AuraExportProofReport
            break
        }
        "operating profile|safe mode status|profile" {
            . .\Aura\Skills\OperatingProfile.ps1
            Invoke-AuraOperatingProfile
            break
        }

        "safe mode|enable safe mode|local mode" {
            . .\Aura\Skills\OperatingProfile.ps1
            Invoke-AuraSafeMode
            break
        }





        default {
            if (Invoke-AuraRegistryCommand -InputText $InputText) {
                break
            }

            Write-Host "Registered skill is not allowlisted: $($match.skill)" -ForegroundColor Red
            return $true
        }
    }
}

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
        "vitals" {
            . .\Aura\Skills\Vitals.ps1
            Invoke-AuraVitals
            break
        }
        "help|commands|what can you do" {
            . .\Aura\Skills\Help.ps1
            Invoke-AuraHelp
            break
        }
        "export proof report|proof report|export training proof" {
            . .\Aura\Skills\ProofReport.ps1
            Invoke-AuraExportProofReport
            break
        }
        "operating profile|safe mode status|profile" {
            . .\Aura\Skills\OperatingProfile.ps1
            Invoke-AuraOperatingProfile
            break
        }

        "safe mode|enable safe mode|local mode" {
            . .\Aura\Skills\OperatingProfile.ps1
            Invoke-AuraSafeMode
            break
        }







        default {
            if (Invoke-AuraRegistryCommand -InputText $InputText) {
                break
            }

            Write-Host "Aura runtime loaded, but command not recognized: $InputText" -ForegroundColor Yellow
        }
    }
}

Write-Host "Aura runtime repaired." -ForegroundColor Green









