[CmdletBinding()]
param(
    [string]$OutFile = (Join-Path (Get-Location) "dsh-asc-0.2.0.tgz")
)

$ErrorActionPreference = "Stop"
$ReleaseUrl = "https://github.com/lmst2/dsh-asc/releases/download/v0.2.0/dsh-asc-0.2.0.tgz"
$ExpectedSha256 = "fbc1325a0167612fef34a0cfb9c79cfcdb60de446f6404f5bd9e7189c8e21b60"

Write-Host "Downloading pinned dsh-asc v0.2.0 release..."
Invoke-WebRequest `
    $ReleaseUrl `
    -OutFile $OutFile

$hash = Get-FileHash $OutFile -Algorithm SHA256
$actualSha256 = $hash.Hash.ToLowerInvariant()

if ($actualSha256 -ne $ExpectedSha256) {
    if (Test-Path $OutFile) {
        Remove-Item $OutFile -Force
    }
    throw "dsh-asc v0.2.0 SHA256 mismatch. Expected $ExpectedSha256 but received $actualSha256. Archive removed."
}

Write-Host "SHA256 verified: $actualSha256"
Write-Host "Archive contents:"
tar -tzf $OutFile
if ($LASTEXITCODE -ne 0) {
    throw "tar could not list the verified archive (exit $LASTEXITCODE)."
}

Write-Host "dsh-asc v0.2.0 verification complete; archive was not installed or extracted."
