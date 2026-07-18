$ErrorActionPreference = 'Stop'

$repositoryRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
. (Join-Path $repositoryRoot 'Aura\Skills\AwsCloudShell.ps1')

$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("aura-cloudshell-test-{0}" -f [guid]::NewGuid())
New-Item -ItemType Directory -Force -Path $tempRoot | Out-Null

try {
    $scriptPath = New-AuraCloudShellHandoff -RepositoryRoot $tempRoot

    if (-not (Test-Path -LiteralPath $scriptPath)) {
        throw 'CloudShell bootstrap was not created.'
    }

    $expectedRoot = (Resolve-Path -LiteralPath $tempRoot).Path
    if (-not $scriptPath.StartsWith($expectedRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Bootstrap escaped the requested repository root: $scriptPath"
    }

    $content = Get-Content -LiteralPath $scriptPath -Raw

    foreach ($required in @(
        'execution_authority',
        '"iam_provisioning": false',
        'git pull --ff-only',
        'AWS CloudShell handoff'
    )) {
        if (-not $content.Contains($required)) {
            throw "Missing required bootstrap content: $required"
        }
    }

    foreach ($forbidden in @(
        'support-console:*',
        'SupportConsoleFullAccess',
        'aws iam create-policy',
        '"Resource": "*"'
    )) {
        if ($content.Contains($forbidden)) {
            throw "Forbidden IAM provisioning content found: $forbidden"
        }
    }

    $bytes = [System.IO.File]::ReadAllBytes($scriptPath)
    if ($bytes.Length -eq 0 -or $bytes[0] -ne [byte][char]'#') {
        throw 'Bootstrap must begin with the shebang and must not contain a UTF-8 BOM.'
    }

    Write-Host 'AWS CloudShell handoff tests passed.'
}
finally {
    Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
}
