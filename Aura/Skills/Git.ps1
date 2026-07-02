function Invoke-AuraGitStatus {
    git status
}

function Invoke-AuraGitCheckpoint {
    git status --short
    Write-Host "Git checkpoint available. DryRun safe mode active." -ForegroundColor Yellow
}
