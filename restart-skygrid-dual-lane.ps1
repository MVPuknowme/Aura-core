[CmdletBinding()]
param(
    [string]$RepoPath,
    [string]$WalletAddress,
    [ValidateRange(1, 65535)][int]$Port = 3000,
    [ValidateRange(5, 180)][int]$HealthTimeoutSeconds = 60,
    [switch]$SkipWalletTests,
    [switch]$NoRouteScan
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Resolve-AuraRepoPath {
    param([string]$Path)

    if ([string]::IsNullOrWhiteSpace($Path)) {
        $Path = $PSScriptRoot
    }

    $resolved = (Resolve-Path -LiteralPath $Path -ErrorAction Stop).Path
    if (-not (Test-Path -LiteralPath (Join-Path $resolved "package.json"))) {
        throw "Aura-Core package.json was not found at: $resolved"
    }
    return $resolved
}

function Read-PackageScripts {
    param([string]$Root)

    $package = Get-Content -LiteralPath (Join-Path $Root "package.json") -Raw |
        ConvertFrom-Json
    return $package.scripts
}

function Assert-RequiredScript {
    param($Scripts, [string]$Name)

    if ($null -eq $Scripts.PSObject.Properties[$Name]) {
        throw "Required package script is missing: $Name"
    }
}

function Get-RecordedRuntime {
    param([string]$PidFile, [string]$ExpectedScript)

    if (-not (Test-Path -LiteralPath $PidFile)) { return $null }

    $text = (Get-Content -LiteralPath $PidFile -Raw).Trim()
    $runtimePid = 0
    if (-not [int]::TryParse($text, [ref]$runtimePid) -or $runtimePid -le 0) {
        throw "invalid_runtime_pid_file"
    }

    $cim = Get-CimInstance Win32_Process -Filter "ProcessId = $runtimePid" -ErrorAction SilentlyContinue
    if ($null -eq $cim) {
        Remove-Item -LiteralPath $PidFile -Force -ErrorAction SilentlyContinue
        return $null
    }

    $commandLine = [string]$cim.CommandLine
    $expectedLeaf = [System.IO.Path]::GetFileName($ExpectedScript)
    if (
        [string]::IsNullOrWhiteSpace($commandLine) -or
        $commandLine.IndexOf($expectedLeaf, [System.StringComparison]::OrdinalIgnoreCase) -lt 0
    ) {
        throw "recorded_pid_is_not_skygrid_runtime"
    }

    return Get-Process -Id $runtimePid -ErrorAction Stop
}

function Stop-RecordedRuntime {
    param([string]$PidFile, [string]$ExpectedScript)

    $runtime = Get-RecordedRuntime -PidFile $PidFile -ExpectedScript $ExpectedScript
    if ($null -eq $runtime) { return }

    Write-Host "Stopping recorded SKYGRID runtime PID $($runtime.Id)"
    Stop-Process -Id $runtime.Id -Force -ErrorAction Stop
    $runtime.WaitForExit(10000) | Out-Null
    Remove-Item -LiteralPath $PidFile -Force -ErrorAction SilentlyContinue
}

function Assert-PortAvailable {
    param([int]$RequestedPort)

    $listener = Get-NetTCPConnection `
        -State Listen `
        -LocalPort $RequestedPort `
        -ErrorAction SilentlyContinue |
        Select-Object -First 1

    if ($listener) {
        throw "port_in_use_by_unmanaged_process:${RequestedPort}:pid=$($listener.OwningProcess)"
    }
}

function Invoke-PnpmScript {
    param([string]$Pnpm, [string]$Root, [string]$Name)

    Write-Host "Running pnpm script: $Name"
    Push-Location $Root
    try {
        & $Pnpm run $Name
        if ($LASTEXITCODE -ne 0) {
            throw "pnpm_script_failed:${Name}:$LASTEXITCODE"
        }
    }
    finally {
        Pop-Location
    }
}

$root = Resolve-AuraRepoPath -Path $RepoPath
$serverScript = Join-Path $root "scripts\skygrid-local-runtime-server.mjs"
$scannerScript = Join-Path $root "Aura\Skills\LocalRouteScanner.ps1"
$pidFile = Join-Path $root ".skygrid-runtime.pid"
$stdout = Join-Path $root ".skygrid-runtime.log"
$stderr = Join-Path $root ".skygrid-runtime-error.log"

if (-not (Test-Path -LiteralPath $serverScript)) {
    throw "SKYGRID local runtime server was not found: $serverScript"
}

if ([string]::IsNullOrWhiteSpace($WalletAddress)) {
    $WalletAddress = [string]$env:SKYGRID_WALLET_ADDRESS
}
if ($WalletAddress -notmatch '^0x[0-9a-fA-F]{40}$') {
    throw "A valid public EVM wallet address is required. Never provide a seed phrase or private key."
}

$scripts = Read-PackageScripts -Root $root
Assert-RequiredScript -Scripts $scripts -Name "local:runtime"
Assert-RequiredScript -Scripts $scripts -Name "aerodrome:rpc:test"
Assert-RequiredScript -Scripts $scripts -Name "wallet:dual-lane:test"
Assert-RequiredScript -Scripts $scripts -Name "wallet:routing:test"

$node = (Get-Command node.exe -ErrorAction Stop).Source
$pnpm = (Get-Command pnpm.cmd -ErrorAction Stop).Source
$previousWallet = [string]$env:SKYGRID_WALLET_ADDRESS
$runtime = $null

try {
    $env:SKYGRID_WALLET_ADDRESS = $WalletAddress

    Stop-RecordedRuntime -PidFile $pidFile -ExpectedScript $serverScript
    Assert-PortAvailable -RequestedPort $Port

    if (-not $SkipWalletTests) {
        Invoke-PnpmScript -Pnpm $pnpm -Root $root -Name "aerodrome:rpc:test"
        Invoke-PnpmScript -Pnpm $pnpm -Root $root -Name "wallet:dual-lane:test"
        Invoke-PnpmScript -Pnpm $pnpm -Root $root -Name "wallet:routing:test"
    }

    Remove-Item $stdout, $stderr -Force -ErrorAction SilentlyContinue
    $runtime = Start-Process `
        -FilePath $node `
        -ArgumentList @($serverScript, "--port", [string]$Port) `
        -WorkingDirectory $root `
        -RedirectStandardOutput $stdout `
        -RedirectStandardError $stderr `
        -PassThru

    [System.IO.File]::WriteAllText(
        $pidFile,
        [string]$runtime.Id + [Environment]::NewLine,
        [System.Text.UTF8Encoding]::new($false)
    )

    $deadline = [DateTimeOffset]::UtcNow.AddSeconds($HealthTimeoutSeconds)
    $healthUri = "http://127.0.0.1:$Port/api/health"
    $healthy = $false

    while ([DateTimeOffset]::UtcNow -lt $deadline) {
        if ($runtime.HasExited) { break }
        try {
            $parameters = @{
                Uri = $healthUri
                Method = "Get"
                TimeoutSec = 3
                UseBasicParsing = $true
                ErrorAction = "Stop"
            }
            if ((Get-Command Invoke-WebRequest).Parameters.ContainsKey("NoProxy")) {
                $parameters.NoProxy = $true
            }
            $response = Invoke-WebRequest @parameters
            if ([int]$response.StatusCode -eq 200) {
                $healthy = $true
                break
            }
        }
        catch {}
        Start-Sleep -Milliseconds 750
    }

    if (-not $healthy) {
        if (Test-Path -LiteralPath $stdout) { Get-Content -LiteralPath $stdout -Tail 100 }
        if (Test-Path -LiteralPath $stderr) { Get-Content -LiteralPath $stderr -Tail 100 }
        Stop-RecordedRuntime -PidFile $pidFile -ExpectedScript $serverScript
        throw "skygrid_runtime_health_check_failed"
    }

    if (-not $NoRouteScan) {
        if (-not (Test-Path -LiteralPath $scannerScript)) {
            throw "LocalRouteScanner was not found: $scannerScript"
        }
        & $scannerScript `
            -RepoPath $root `
            -AllowedHosts @("127.0.0.1") `
            -PortsToTest @($Port)
        if ($LASTEXITCODE -ne 0) {
            throw "local_route_scanner_failed:$LASTEXITCODE"
        }
    }

    [pscustomobject]@{
        product = "SKYGRID Emergency Data On-Ramp"
        status = "ready"
        pid = $runtime.Id
        pid_file = $pidFile
        health = $healthUri
        wallet_address = $WalletAddress
        process_control = "recorded_pid_only"
        arbitrary_port_kill = $false
    }
}
finally {
    if ([string]::IsNullOrWhiteSpace($previousWallet)) {
        Remove-Item Env:SKYGRID_WALLET_ADDRESS -ErrorAction SilentlyContinue
    }
    else {
        $env:SKYGRID_WALLET_ADDRESS = $previousWallet
    }
}
