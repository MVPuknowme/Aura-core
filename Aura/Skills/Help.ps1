function Invoke-AuraHelp {
    $registryPath = "E:\Aura-core\Aura\Config\commands.json"

    Write-Host ""
    Write-Host "AURA COMMANDS" -ForegroundColor Cyan
    Write-Host "-------------"
    Write-Host "Local mode. Raw shell execution disabled."
    Write-Host ""

    if (-not (Test-Path $registryPath)) {
        Write-Host "No command registry found." -ForegroundColor Yellow
        return
    }

    $commands = Get-Content $registryPath -Raw | ConvertFrom-Json

    $commands |
      Where-Object { $_.enabled -eq $true } |
      Sort-Object phrase |
      Select-Object phrase,intent,skill,safety_level |
      Format-Table -AutoSize

    Write-Host ""
    Write-Host "Try:"
    Write-Host "  vitals"
    Write-Host "  where are we"
    Write-Host "  road less traveled"
    Write-Host "  training status"
    Write-Host "  show proof"
    Write-Host "  validate training"
    Write-Host ""
}
