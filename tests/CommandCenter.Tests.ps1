$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$root = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
$launcher = Join-Path $root "restart-skygrid-dual-lane.ps1"
$scanner = Join-Path $root "Aura\Skills\LocalRouteScanner.ps1"
$debugServer = Join-Path $root "scripts\skygrid-iphone-debug-server.mjs"

foreach ($path in @($launcher, $scanner, $debugServer)) {
    if (-not (Test-Path -LiteralPath $path)) {
        throw "Required command-center file is missing: $path"
    }
}

function Assert-PowerShellParses {
    param([string]$Path)

    $tokens = $null
    $errors = $null
    [System.Management.Automation.Language.Parser]::ParseFile(
        $Path,
        [ref]$tokens,
        [ref]$errors
    ) | Out-Null

    if ($errors.Count -gt 0) {
        $details = ($errors | ForEach-Object { $_.Message }) -join "; "
        throw "PowerShell parse failed for ${Path}: $details"
    }
}

Assert-PowerShellParses -Path $launcher
Assert-PowerShellParses -Path $scanner

$launcherText = Get-Content -LiteralPath $launcher -Raw
$scannerText = Get-Content -LiteralPath $scanner -Raw
$debugText = Get-Content -LiteralPath $debugServer -Raw

foreach ($required in @(
    ".skygrid-runtime.pid",
    "recorded_pid_is_not_skygrid_runtime",
    "port_in_use_by_unmanaged_process",
    "Get-RecordedRuntime",
    "Get-CimInstance Win32_Process",
    "skygrid-local-runtime-server.mjs",
    'arbitrary_port_kill = $false'
)) {
    if (-not $launcherText.Contains($required)) {
        throw "Launcher is missing required safety marker: $required"
    }
}

$stopCalls = [regex]::Matches($launcherText, "(?im)^\s*Stop-Process\b").Count
if ($stopCalls -ne 1) {
    throw "Launcher must contain exactly one process-stop operation inside the verified PID path."
}

foreach ($required in @(
    "controlled-pilot",
    "FAIL_CLOSED",
    "NoStateWrite",
    "identity_verified",
    "SKYGRID_ROUTE_RECEIPT_HMAC_KEY"
)) {
    if (-not $scannerText.Contains($required)) {
        throw "Route scanner is missing required advisory control: $required"
    }
}

foreach ($required in @(
    'host = process.env.SKYGRID_DEBUG_BIND_HOST || "127.0.0.1"',
    "--allow-lan",
    "SKYGRID_DEBUG_TOKEN",
    "x-skygrid-debug-token",
    "timingSafeEqual"
)) {
    if (-not $debugText.Contains($required)) {
        throw "Debug server is missing required LAN guard: $required"
    }
}

Write-Host "SKYGRID command-center safety tests passed."
