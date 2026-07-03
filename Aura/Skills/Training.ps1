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
