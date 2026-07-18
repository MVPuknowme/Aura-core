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

function Show-AuraCloudShellStatus {
    [CmdletBinding()]
    param(
        [string]$RepositoryRoot
    )

    $root = Resolve-AuraRepositoryRoot -RepositoryRoot $RepositoryRoot
    $scriptPath = Join-Path $root "artifacts\aws\cloudshell\aura-cloudshell-bootstrap.sh"

    Write-Host ""
    Write-Host "AURA CLOUDSHELL STATUS" -ForegroundColor Cyan
    Write-Host "----------------------"
    Write-Host ("Repository root: {0}" -f $root)
    Write-Host ("Bootstrap exists: {0}" -f (Test-Path -LiteralPath $scriptPath))
    Write-Host "AWS credentials stored locally: false"
    Write-Host "OpenAI required: false"
    Write-Host "Recommended mode: CloudShell handoff"
    Write-Host "IAM provisioning included: false"
    Write-Host "Execution authority: none"
    Write-Host ""
}
