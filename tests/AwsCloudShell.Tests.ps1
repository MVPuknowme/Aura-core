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

    $bitGoScriptPath = New-AuraBitGoCloudShellHandoff -RepositoryRoot $tempRoot -HostAddress '0.0.0.0' -Port 3000

    if (-not (Test-Path -LiteralPath $bitGoScriptPath)) {
        throw 'BitGo PowerShell Cloud Shell handoff was not created.'
    }

    if (-not $bitGoScriptPath.StartsWith($expectedRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "BitGo handoff escaped the requested repository root: $bitGoScriptPath"
    }

    $bitGoContent = Get-Content -LiteralPath $bitGoScriptPath -Raw

    foreach ($required in @(
        'BITGOD_ALLOW_PUBLIC_BIND',
        'BITGOD_AUTH_MODE',
        'Refusing 0.0.0.0 bind',
        'npm install -g .',
        '$env:HOST = $BitGoHost',
        '$env:PORT = [string]$BitGoPort',
        'package.json not found after clone',
        'Do not load signing keys or seed phrases'
    )) {
        if (-not $bitGoContent.Contains($required)) {
            throw "Missing required BitGo guardrail content: $required"
        }
    }

    foreach ($forbidden in @(
        'sudo npm',
        'npm install -G.',
        'BITGOD_ALLOW_PUBLIC_BIND=true`n',
        'BITGOD_AUTH_MODE=none`n'
    )) {
        if ($bitGoContent.Contains($forbidden)) {
            throw "Unsafe or invalid BitGo bootstrap content found: $forbidden"
        }
    }

    $bitGoBytes = [System.IO.File]::ReadAllBytes($bitGoScriptPath)
    if ($bitGoBytes.Length -eq 0) {
        throw 'BitGo handoff script is empty.'
    }

    Write-Host 'AWS CloudShell handoff tests passed.'
}
finally {
    Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
}
