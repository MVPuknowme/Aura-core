function Resolve-AuraRepositoryRoot {
    [CmdletBinding()]
    param(
        [string]$RepositoryRoot
    )

    if ([string]::IsNullOrWhiteSpace($RepositoryRoot)) {
        $RepositoryRoot = Join-Path $PSScriptRoot "..\.."
    }

    return (Resolve-Path -LiteralPath $RepositoryRoot -ErrorAction Stop).Path
}

function New-AuraCloudShellHandoff {
    [CmdletBinding()]
    [OutputType([string])]
    param(
        [string]$RepositoryRoot
    )

    $root = Resolve-AuraRepositoryRoot -RepositoryRoot $RepositoryRoot
    $outDir = Join-Path $root "artifacts\aws\cloudshell"
    New-Item -ItemType Directory -Force -Path $outDir | Out-Null

    $scriptPath = Join-Path $outDir "aura-cloudshell-bootstrap.sh"

    $lines = @(
'#!/usr/bin/env bash',
'set -euo pipefail',
'',
'echo "AURA / SKYGRID AWS CloudShell handoff"',
'echo "------------------------------------"',
'',
'export AWS_REGION="${AWS_REGION:-us-west-2}"',
'export AURA_REPO="${AURA_REPO:-https://github.com/MVPuknowme/Aura-core.git}"',
'export AURA_BRANCH="${AURA_BRANCH:-MVPuknowme}"',
'',
'echo "Region: $AWS_REGION"',
'echo "Repo:   $AURA_REPO"',
'echo "Branch: $AURA_BRANCH"',
'echo ""',
'',
'echo "Checking AWS identity..."',
'aws sts get-caller-identity --output json',
'',
'echo "Preparing Aura-core workspace..."',
'if [ -d "$HOME/Aura-core/.git" ]; then',
'  cd "$HOME/Aura-core"',
'  git fetch origin "$AURA_BRANCH"',
'  git checkout "$AURA_BRANCH"',
'  git pull --ff-only origin "$AURA_BRANCH"',
'else',
'  cd "$HOME"',
'  git clone --branch "$AURA_BRANCH" "$AURA_REPO" Aura-core',
'  cd "$HOME/Aura-core"',
'fi',
'',
'mkdir -p artifacts/aws/cloudshell',
'',
'echo "IAM provisioning: disabled in this bootstrap."',
'echo "Use a separately reviewed, operator-approved least-privilege role or policy when additional AWS permissions are required."',
'',
'RUN_ID="$(date -u +%Y%m%dT%H%M%SZ)"',
'PROOF="artifacts/aws/cloudshell/cloudshell-proof-$RUN_ID.json"',
'',
'cat > "$PROOF" <<JSON',
'{',
'  "format": "aura.aws.cloudshell.proof",',
'  "version": "0.2.0",',
'  "run_id": "$RUN_ID",',
'  "created_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",',
'  "mode": "aws-cloudshell",',
'  "repo": "$AURA_REPO",',
'  "branch": "$AURA_BRANCH",',
'  "region": "$AWS_REGION",',
'  "execution_authority": "none",',
'  "iam_provisioning": false,',
'  "openai_required": false,',
'  "local_private_keys_required": false,',
'  "wallet_mode": "read-only",',
'  "aws_publish": false,',
'  "status": "cloudshell handoff complete"',
'}',
'JSON',
'',
'echo ""',
'echo "CloudShell proof:"',
'cat "$PROOF"',
'',
'echo ""',
'echo "Next read-only checks:"',
'echo "aws cloudformation list-stacks --region $AWS_REGION --max-items 10"',
'echo "aws lambda list-functions --region $AWS_REGION --max-items 10"',
'echo "aws apigateway get-rest-apis --region $AWS_REGION --limit 10"',
'echo ""',
'echo "AURA CloudShell handoff complete."'
    )

    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllLines($scriptPath, [string[]]$lines, $utf8NoBom)

    Write-Host ""
    Write-Host "AURA AWS CLOUDSHELL HANDOFF" -ForegroundColor Cyan
    Write-Host "---------------------------"
    Write-Host ("Repository root: {0}" -f $root)
    Write-Host ("Script: {0}" -f $scriptPath)
    Write-Host "IAM provisioning included: false" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Open AWS Console CloudShell, then paste the bootstrap script contents." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Copy script to clipboard with:" -ForegroundColor Cyan
    Write-Host ("Get-Content `"{0}`" -Raw | Set-Clipboard" -f $scriptPath)
    Write-Host ""

    return $scriptPath
}

function New-AuraBitGoCloudShellHandoff {
    [CmdletBinding()]
    [OutputType([string])]
    param(
        [string]$RepositoryRoot,
        [string]$BitGoRepository = 'https://github.com/BitGo/bitgod.git',
        [string]$HostAddress = '0.0.0.0',
        [ValidateRange(1, 65535)]
        [int]$Port = 3000
    )

    $root = Resolve-AuraRepositoryRoot -RepositoryRoot $RepositoryRoot
    $outDir = Join-Path $root "artifacts\aws\cloudshell"
    New-Item -ItemType Directory -Force -Path $outDir | Out-Null

    $scriptPath = Join-Path $outDir "bitgod-cloudshell-preview.ps1"

    $escapedRepo = $BitGoRepository.Replace("'", "''")
    $escapedHost = $HostAddress.Replace("'", "''")

    $lines = @(
'$ErrorActionPreference = ''Stop''',
'',
'Write-Host ''AURA / BitGo PowerShell Cloud Shell preview'' -ForegroundColor Cyan',
'Write-Host ''-------------------------------------------''',
'',
("`$BitGoRepo = if (`$env:BITGOD_REPO) { `$env:BITGOD_REPO } else { '{0}' }" -f $escapedRepo),
("`$BitGoHost = if (`$env:BITGOD_HOST) { `$env:BITGOD_HOST } else { '{0}' }" -f $escapedHost),
("`$BitGoPort = if (`$env:BITGOD_PORT) { [int]`$env:BITGOD_PORT } else { {0} }" -f $Port),
'$AllowPublicBind = $env:BITGOD_ALLOW_PUBLIC_BIND -eq ''true''',
'$AuthMode = if ($env:BITGOD_AUTH_MODE) { $env:BITGOD_AUTH_MODE } else { ''none'' }',
'',
'if ($BitGoHost -eq ''0.0.0.0'' -and -not $AllowPublicBind) {',
'    throw ''Refusing 0.0.0.0 bind. Set BITGOD_ALLOW_PUBLIC_BIND=true only after network access controls are in place.''',
'}',
'',
'if ($BitGoHost -eq ''0.0.0.0'' -and $AuthMode -eq ''none'') {',
'    throw ''Refusing public bind without an explicit authentication mode. Set BITGOD_AUTH_MODE to the reviewed mode.''',
'}',
'',
'Write-Host (''Repository: {0}'' -f $BitGoRepo)',
'Write-Host (''Host:       {0}'' -f $BitGoHost)',
'Write-Host (''Port:       {0}'' -f $BitGoPort)',
'Write-Host (''Auth mode:  {0}'' -f $AuthMode)',
'',
'$Workspace = Join-Path $HOME ''bitgod''',
'if (Test-Path -LiteralPath (Join-Path $Workspace ''.git'')) {',
'    Set-Location $Workspace',
'    git fetch --all --prune',
'    git pull --ff-only',
'} else {',
'    Set-Location $HOME',
'    git clone $BitGoRepo bitgod',
'    Set-Location $Workspace',
'}',
'',
'if (-not (Test-Path -LiteralPath ''.\package.json'')) {',
'    throw ''package.json not found after clone; refusing to continue.''',
'}',
'',
'$Package = Get-Content -LiteralPath ''.\package.json'' -Raw | ConvertFrom-Json',
'',
'npm install',
'npm run',
'',
'if ($Package.scripts.PSObject.Properties.Name -contains ''build'') {',
'    npm run build',
'} else {',
'    Write-Host ''No build script declared; skipping npm run build.'' -ForegroundColor Yellow',
'}',
'',
'npm install -g .',
'',
'if (-not ($Package.scripts.PSObject.Properties.Name -contains ''start'')) {',
'    throw ''No npm start script declared; install completed but service was not started.''',
'}',
'',
'$env:HOST = $BitGoHost',
'$env:PORT = [string]$BitGoPort',
'',
'Write-Host ''Starting reviewed package with HOST/PORT environment variables.'' -ForegroundColor Yellow',
'Write-Host ''Do not load signing keys or seed phrases into shell history or source files.'' -ForegroundColor Yellow',
'npm start'
    )

    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllLines($scriptPath, [string[]]$lines, $utf8NoBom)

    Write-Host ""
    Write-Host "AURA BITGO CLOUDSHELL HANDOFF" -ForegroundColor Cyan
    Write-Host "-----------------------------"
    Write-Host ("Repository root: {0}" -f $root)
    Write-Host ("Script: {0}" -f $scriptPath)
    Write-Host ("Requested host: {0}:{1}" -f $HostAddress, $Port)
    Write-Host "Public bind requires BITGOD_ALLOW_PUBLIC_BIND=true and an explicit BITGOD_AUTH_MODE." -ForegroundColor Yellow
    Write-Host ""

    return $scriptPath
}

function Show-AuraCloudShellStatus {
    [CmdletBinding()]
    param(
        [string]$RepositoryRoot
    )

    $root = Resolve-AuraRepositoryRoot -RepositoryRoot $RepositoryRoot
    $scriptPath = Join-Path $root "artifacts\aws\cloudshell\aura-cloudshell-bootstrap.sh"
    $bitGoScriptPath = Join-Path $root "artifacts\aws\cloudshell\bitgod-cloudshell-preview.ps1"

    Write-Host ""
    Write-Host "AURA CLOUDSHELL STATUS" -ForegroundColor Cyan
    Write-Host "----------------------"
    Write-Host ("Repository root: {0}" -f $root)
    Write-Host ("Bootstrap exists: {0}" -f (Test-Path -LiteralPath $scriptPath))
    Write-Host ("BitGo preview exists: {0}" -f (Test-Path -LiteralPath $bitGoScriptPath))
    Write-Host "AWS credentials stored locally: false"
    Write-Host "OpenAI required: false"
    Write-Host "Recommended mode: CloudShell handoff"
    Write-Host "IAM provisioning included: false"
    Write-Host "Execution authority: none"
    Write-Host "BitGo public bind: guarded"
    Write-Host ""
}
