# Adds the pre-installed MSYS2 toolchain to PATH on GitHub-hosted Windows runners.
# GitHub Actions Windows images include MSYS2 at C:\msys64, but it is not always on PATH.

$ErrorActionPreference = "Stop"

$MsysRoot = "C:\msys64"
$CandidatePaths = @(
    "$MsysRoot\usr\bin",
    "$MsysRoot\mingw64\bin",
    "$MsysRoot\ucrt64\bin"
)

if (-not (Test-Path $MsysRoot)) {
    Write-Host "MSYS2 root not found at $MsysRoot. Skipping PATH update."
    exit 0
}

$ExistingPaths = $CandidatePaths | Where-Object { Test-Path $_ }

if (-not $ExistingPaths -or $ExistingPaths.Count -eq 0) {
    throw "MSYS2 root exists at $MsysRoot, but no expected bin directories were found."
}

foreach ($PathEntry in $ExistingPaths) {
    if ($env:GITHUB_PATH) {
        Add-Content -Path $env:GITHUB_PATH -Value $PathEntry
    }

    if (($env:PATH -split ';') -notcontains $PathEntry) {
        $env:PATH = "$PathEntry;$env:PATH"
    }

    Write-Host "Added MSYS2 path: $PathEntry"
}

Write-Host "MSYS2 PATH bootstrap complete."

$Bash = Get-Command bash -ErrorAction SilentlyContinue
if ($Bash) {
    Write-Host "bash resolved to: $($Bash.Source)"
    bash --version | Select-Object -First 1
} else {
    Write-Host "bash was not resolved in this step; it should be available in following steps through GITHUB_PATH."
}
