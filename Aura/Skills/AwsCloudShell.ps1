function Get-AuraRepositoryRoot {
    [CmdletBinding()]
    param()

    return (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))
}

function New-AuraCloudShellHandoff {
    [CmdletBinding()]
    param(
        [string]$Root = (Get-AuraRepositoryRoot),
        [string]$AwsRegion = "us-west-2",
        [string]$RepositoryUrl = "https://github.com/MVPuknowme/Aura-core.git",
        [string]$Branch = "MVPuknowme"
    )

    $outDir = Join-Path $Root "artifacts\aws\cloudshell"
    New-Item -ItemType Directory -Force -Path $outDir | Out-Null

    $scriptPath = Join-Path $outDir "aura-cloudshell-bootstrap.sh"

    $lines = @(
        '#!/usr/bin/env bash',
        'set -euo pipefail',
        '',
        'echo "AURA / SKYGRID AWS CloudShell handoff"',
        'echo "------------------------------------"',
        '',
        ('export AWS_REGION="${AWS_REGION:-' + $AwsRegion + '}"'),
        ('export AURA_REPO="${AURA_REPO:-' + $RepositoryUrl + '}"'),
        ('export AURA_BRANCH="${AURA_BRANCH:-' + $Branch + '}"'),
        '',
        'echo "Region: $AWS_REGION"',
        'echo "Repo:   $AURA_REPO"',
        'echo "Branch: $AURA_BRANCH"',
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
        'RUN_ID="$(date -u +%Y%m%dT%H%M%SZ)"',
        'PROOF="artifacts/aws/cloudshell/cloudshell-proof-$RUN_ID.json"',
        '',
        'cat > "$PROOF" <<JSON',
        '{',
        '  "format": "aura.aws.cloudshell.proof",',
        '  "version": "0.2.0",',
        '  "run_id": "$RUN_ID",',
        '  "created_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",',
        '  "mode": "aws-cloudshell-read-only",',
        '  "repo": "$AURA_REPO",',
        '  "branch": "$AURA_BRANCH",',
        '  "region": "$AWS_REGION",',
        '  "iam_changes": false,',
        '  "openai_required": false,',
        '  "local_private_keys_required": false,',
        '  "wallet_mode": "read-only",',
        '  "aws_publish": false,',
        '  "status": "cloudshell handoff complete"',
        '}',
        'JSON',
        '',
        'echo "CloudShell proof:"',
        'cat "$PROOF"',
        '',
        'echo "Next safe read-only checks:"',
        'echo "aws cloudformation list-stacks --region $AWS_REGION --max-items 10"',
        'echo "aws lambda list-functions --region $AWS_REGION --max-items 10"',
        'echo "aws apigateway get-rest-apis --region $AWS_REGION --limit 10"',
        'echo "aws iam list-policies --scope Local --output table"',
        '',
        'echo "No IAM policies were created or modified."',
        'echo "AURA CloudShell handoff complete."'
    )

    $lines | Set-Content -LiteralPath $scriptPath -Encoding utf8NoBOM

    Write-Host ""
    Write-Host "AURA AWS CLOUDSHELL HANDOFF" -ForegroundColor Cyan
    Write-Host "---------------------------"
    Write-Host ("Repository root: {0}" -f $Root)
    Write-Host ("Script: {0}" -f $scriptPath)
    Write-Host ""
    Write-Host "This handoff performs read-only discovery and creates no IAM policies." -ForegroundColor Green
    Write-Host "Open AWS Console CloudShell, then paste the bootstrap script contents." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Copy script to clipboard with:" -ForegroundColor Cyan
    Write-Host ("Get-Content -LiteralPath `"{0}`" -Raw | Set-Clipboard" -f $scriptPath)
    Write-Host ""

    return $scriptPath
}

function Show-AuraCloudShellStatus {
    [CmdletBinding()]
    param(
        [string]$Root = (Get-AuraRepositoryRoot)
    )

    $scriptPath = Join-Path $Root "artifacts\aws\cloudshell\aura-cloudshell-bootstrap.sh"

    Write-Host ""
    Write-Host "AURA CLOUDSHELL STATUS" -ForegroundColor Cyan
    Write-Host "----------------------"
    Write-Host ("Repository root: {0}" -f $Root)
    Write-Host ("Bootstrap exists: {0}" -f (Test-Path -LiteralPath $scriptPath))
    Write-Host "AWS credentials stored locally: false"
    Write-Host "OpenAI required: false"
    Write-Host "Recommended mode: read-only CloudShell handoff"
    Write-Host "IAM policy creation included: false"
    Write-Host ""
}