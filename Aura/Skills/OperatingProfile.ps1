function Invoke-AuraOperatingProfile {
    Write-Host ""
    Write-Host "AURA OPERATING PROFILE" -ForegroundColor Cyan
    Write-Host "----------------------"

    $auraMode = if ($env:AURA_MODE) { $env:AURA_MODE } else { "local" }
    $openAiMode = if ($env:AURA_OPENAI_MODE) { $env:AURA_OPENAI_MODE } else { "offline" }
    $rawShell = if ($env:AURA_RAW_SHELL) { $env:AURA_RAW_SHELL } else { "disabled" }

    Write-Host ("Local Runtime: {0}" -f "Active") -ForegroundColor Green
    Write-Host ("Aura Mode:     {0}" -f $auraMode)
    Write-Host ("OpenAI Mode:   {0}" -f $openAiMode)
    Write-Host ("Raw Shell:     {0}" -f $rawShell)
    Write-Host ("Wallet:        read-only")
    Write-Host ("Git Push:      manual only")
    Write-Host ("Deploy:        blocked unless explicitly enabled")
    Write-Host ("Secrets:       never printed")
    Write-Host ""

    Write-Host "Safety Rules" -ForegroundColor Yellow
    Write-Host "------------"
    Write-Host "- Human text does not execute as raw PowerShell."
    Write-Host "- Commands route through allowlisted Aura skills."
    Write-Host "- Unknown commands show help instead of executing."
    Write-Host "- Wallet actions are read-only."
    Write-Host "- OpenAI API is optional; local mode continues without tokens."
    Write-Host ""

    Write-Host "The winds are controlled." -ForegroundColor Green
    Write-Host ""
}

function Invoke-AuraSafeMode {
    $env:AURA_MODE = "local"
    $env:AURA_OPENAI_MODE = "offline"
    $env:AURA_RAW_SHELL = "disabled"

    [Environment]::SetEnvironmentVariable("AURA_MODE", "local", "User")
    [Environment]::SetEnvironmentVariable("AURA_OPENAI_MODE", "offline", "User")
    [Environment]::SetEnvironmentVariable("AURA_RAW_SHELL", "disabled", "User")

    Write-Host "Aura safe mode enabled." -ForegroundColor Green
    Invoke-AuraOperatingProfile
}
