param(
    [string]$RepoPath,
    [string]$Branch
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($RepoPath)) {
    $RepoPath = $PSScriptRoot
}

if ([string]::IsNullOrWhiteSpace($RepoPath)) {
    throw "Repository path was not supplied and PSScriptRoot is unavailable."
}

$RepoPath = [System.IO.Path]::GetFullPath($RepoPath)

if (-not (Test-Path -LiteralPath (Join-Path $RepoPath ".git"))) {
    throw "Aura-Core repository not found at: $RepoPath"
}

if ([string]::IsNullOrWhiteSpace($Branch)) {
    $BranchOutput = & git.exe -C $RepoPath branch --show-current

    if ($LASTEXITCODE -ne 0) {
        throw "Unable to determine the current Git branch."
    }

    $Branch = ([string]$BranchOutput).Trim()
}

if ([string]::IsNullOrWhiteSpace($Branch)) {
    throw "The repository is in detached-HEAD state. Supply -Branch explicitly."
}

$Port = 3000
$BaseUrl = "http://127.0.0.1:$Port"
Write-Host ""
Write-Host "SKYGRID Emergency Data On-Ramp"
Write-Host "Base + Optimism dual-lane restart"
Write-Host ""

$WalletAddress = (Read-Host "Enter your PUBLIC 0x wallet address").Trim()

if ($WalletAddress -notmatch '^0x[0-9a-fA-F]{40}$') {
    throw "Invalid wallet address. Enter 0x followed by exactly 40 hexadecimal characters."
}

if (-not (Test-Path $RepoPath)) {
    throw "Repository not found: $RepoPath"
}

Set-Location $RepoPath

Write-Host "`n[1/8] Fetching GitHub branches..."
git fetch origin

if ($LASTEXITCODE -ne 0) {
    throw "git fetch failed."
}

$RemoteBranchExists = git branch -r --list "origin/$Branch"

if ([string]::IsNullOrWhiteSpace($RemoteBranchExists)) {
    throw "Remote branch origin/$Branch was not found."
}

$LocalBranchExists = git branch --list $Branch

if ([string]::IsNullOrWhiteSpace($LocalBranchExists)) {
    git switch --track "origin/$Branch"
} else {
    git switch $Branch
}

if ($LASTEXITCODE -ne 0) {
    throw "Unable to switch to $Branch."
}

git pull --ff-only origin $Branch

if ($LASTEXITCODE -ne 0) {
    throw "Unable to update $Branch."
}

Write-Host "`n[2/8] Activating pnpm 10.23.0..."
corepack enable
corepack prepare pnpm@10.23.0 --activate

Write-Host "Node version: $(node --version)"
Write-Host "pnpm version: $(pnpm --version)"

Write-Host "`n[3/8] Installing dependencies..."
pnpm install --frozen-lockfile

if ($LASTEXITCODE -ne 0) {
    throw "pnpm frozen-lockfile installation failed."
}

Write-Host "`n[4/8] Running Base/Aerodrome tests..."
pnpm run aerodrome:rpc:test

if ($LASTEXITCODE -ne 0) {
    throw "Aerodrome RPC tests failed."
}

Write-Host "`n[5/8] Running Base + Optimism dual-lane tests..."
pnpm run wallet:dual-lane:test

if ($LASTEXITCODE -ne 0) {
    throw "Dual-lane tests failed."
}

Write-Host "`n[6/8] Configuring public wallet environment..."

$env:SKYGRID_WALLET_ADDRESS = $WalletAddress
$env:SKYGRID_WALLET_RPC_TIMEOUT_MS = "8000"
$env:SKYGRID_BASE_RPC_TIMEOUT_MS = "8000"
$env:SKYGRID_OPTIMISM_RPC_TIMEOUT_MS = "8000"

Write-Host "`n[7/8] Stopping anything currently listening on port $Port..."

$Listeners = Get-NetTCPConnection `
    -LocalPort $Port `
    -State Listen `
    -ErrorAction SilentlyContinue

$ProcessIds = @(
    $Listeners |
        Select-Object -ExpandProperty OwningProcess -Unique
)

foreach ($ExistingProcessId in $ProcessIds) {
    if ($ExistingProcessId -gt 0) {
        Write-Host "Stopping PID $ExistingProcessId..."
        Stop-Process `
            -Id $ExistingProcessId `
            -Force `
            -ErrorAction SilentlyContinue
    }
}

Start-Sleep -Seconds 2

$RuntimeLog = Join-Path $RepoPath "runtime.log"
$RuntimeErrorLog = Join-Path $RepoPath "runtime-error.log"
$PidFile = Join-Path $RepoPath ".skygrid-runtime.pid"

Remove-Item $RuntimeLog -Force -ErrorAction SilentlyContinue
Remove-Item $RuntimeErrorLog -Force -ErrorAction SilentlyContinue
Remove-Item $PidFile -Force -ErrorAction SilentlyContinue

Write-Host "`n[8/8] Starting SKYGRID local runtime..."

$RuntimeProcess = Start-Process `
    -FilePath "pnpm.cmd" `
    -ArgumentList @("run", "local:runtime") `
    -WorkingDirectory $RepoPath `
    -RedirectStandardOutput $RuntimeLog `
    -RedirectStandardError $RuntimeErrorLog `
    -PassThru

$RuntimeProcess.Id |
    Set-Content `
        -Path $PidFile `
        -Encoding ascii

Write-Host "Runtime PID: $($RuntimeProcess.Id)"
Write-Host "Waiting for $BaseUrl/api/health ..."

$Healthy = $false

for ($Attempt = 1; $Attempt -le 60; $Attempt++) {
    if ($RuntimeProcess.HasExited) {
        break
    }

    try {
        $Health = Invoke-RestMethod `
            -Method Get `
            -Uri "$BaseUrl/api/health" `
            -TimeoutSec 5

        $Healthy = $true
        break
    } catch {
        Start-Sleep -Seconds 2
    }
}

if (-not $Healthy) {
    Write-Host "`nSKYGRID did not become healthy."

    if (Test-Path $RuntimeLog) {
        Write-Host "`n--- runtime.log ---"
        Get-Content $RuntimeLog -Tail 200
    }

    if (Test-Path $RuntimeErrorLog) {
        Write-Host "`n--- runtime-error.log ---"
        Get-Content $RuntimeErrorLog -Tail 200
    }

    throw "Local runtime startup failed."
}

Write-Host "`nSKYGRID health:"
$Health | ConvertTo-Json -Depth 10

$EncodedWallet = [System.Uri]::EscapeDataString($WalletAddress)

Write-Host "`nTesting Base lane..."

try {
    $BaseLane = Invoke-RestMethod `
        -Method Get `
        -Uri "$BaseUrl/api/wallet/dual-lane?address=$EncodedWallet&lane=base" `
        -TimeoutSec 30

    $BaseLane | ConvertTo-Json -Depth 20
} catch {
    Write-Warning "Base lane failed."

    if ($_.ErrorDetails.Message) {
        Write-Host $_.ErrorDetails.Message
    } else {
        Write-Host $_.Exception.Message
    }
}

Write-Host "`nTesting Optimism lane..."

try {
    $OptimismLane = Invoke-RestMethod `
        -Method Get `
        -Uri "$BaseUrl/api/wallet/dual-lane?address=$EncodedWallet&lane=optimism" `
        -TimeoutSec 30

    $OptimismLane | ConvertTo-Json -Depth 20
} catch {
    Write-Warning "Optimism lane failed."

    if ($_.ErrorDetails.Message) {
        Write-Host $_.ErrorDetails.Message
    } else {
        Write-Host $_.Exception.Message
    }
}

Write-Host "`nTesting both lanes..."

try {
    $DualLane = Invoke-RestMethod `
        -Method Get `
        -Uri "$BaseUrl/api/wallet/dual-lane?address=$EncodedWallet&lane=both" `
        -TimeoutSec 30

    $DualLane | ConvertTo-Json -Depth 20

    if ($DualLane.ok -eq $true) {
        Write-Host "`nSUCCESS: Base and Optimism lanes verified."
    } else {
        Write-Warning "The response reported one or more unhealthy lanes."
    }
} catch {
    Write-Warning "Dual-lane verification failed closed."

    if ($_.ErrorDetails.Message) {
        Write-Host $_.ErrorDetails.Message
    } else {
        Write-Host $_.Exception.Message
    }
}

Write-Host ""
Write-Host "SKYGRID restart completed."
Write-Host "Runtime URL: $BaseUrl"
Write-Host "Runtime PID: $($RuntimeProcess.Id)"
Write-Host ""
Write-Host "Stop command:"
Write-Host "Stop-Process -Id $($RuntimeProcess.Id)"
