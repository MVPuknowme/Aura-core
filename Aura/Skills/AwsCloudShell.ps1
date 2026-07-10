function New-AuraCloudShellHandoff {
    $root = "E:\Aura-core"
    $outDir = Join-Path $root "artifacts\aws\cloudshell"
    New-Item -ItemType Directory -Force $outDir | Out-Null

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
'  git pull origin "$AURA_BRANCH"',
'else',
'  cd "$HOME"',
'  git clone --branch "$AURA_BRANCH" "$AURA_REPO" Aura-core',
'  cd "$HOME/Aura-core"',
'fi',
'',
'mkdir -p artifacts/aws/cloudshell',
'',
'echo ""',
'echo "Optional IAM setup: SupportConsoleFullAccess"',
'echo "-------------------------------------------"',
'echo "This creates a customer-managed IAM policy allowing support-console:*."',
'echo "Run only if this AWS account should have that support-console policy."',
'',
'cat > support-console-full-access-policy.json <<JSON',
'{',
'  "Version": "2012-10-17",',
'  "Statement": [',
'    {',
'      "Effect": "Allow",',
'      "Action": [',
'        "support-console:*"',
'      ],',
'      "Resource": "*"',
'    }',
'  ]',
'}',
'JSON',
'',
'ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"',
'POLICY_ARN="arn:aws:iam::${ACCOUNT_ID}:policy/SupportConsoleFullAccess"',
'',
'if aws iam get-policy --policy-arn "$POLICY_ARN" >/dev/null 2>&1; then',
'  echo "Policy already exists: SupportConsoleFullAccess"',
'else',
'  aws iam create-policy \',
'    --policy-name "SupportConsoleFullAccess" \',
'    --policy-document file://support-console-full-access-policy.json',
'fi',
'',
'RUN_ID="$(date -u +%Y%m%dT%H%M%SZ)"',
'PROOF="artifacts/aws/cloudshell/cloudshell-proof-$RUN_ID.json"',
'',
'cat > "$PROOF" <<JSON',
'{',
'  "format": "aura.aws.cloudshell.proof",',
'  "version": "0.1.0",',
'  "run_id": "$RUN_ID",',
'  "created_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",',
'  "mode": "aws-cloudshell",',
'  "repo": "$AURA_REPO",',
'  "branch": "$AURA_BRANCH",',
'  "region": "$AWS_REGION",',
'  "policy_name": "SupportConsoleFullAccess",',
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
'echo "Next safe checks:"',
'echo "aws cloudformation list-stacks --region $AWS_REGION --max-items 10"',
'echo "aws lambda list-functions --region $AWS_REGION --max-items 10"',
'echo "aws apigateway get-rest-apis --region $AWS_REGION --limit 10"',
'echo "aws iam list-policies --scope Local --output table"',
'echo ""',
'echo "AURA CloudShell handoff complete."'
    )

    $lines | Set-Content $scriptPath

    Write-Host ""
    Write-Host "AURA AWS CLOUDSHELL HANDOFF" -ForegroundColor Cyan
    Write-Host "---------------------------"
    Write-Host ("Script: {0}" -f $scriptPath)
    Write-Host ""
    Write-Host "Open AWS Console CloudShell, then paste the bootstrap script contents." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Copy script to clipboard with:" -ForegroundColor Cyan
    Write-Host ("Get-Content `"{0}`" -Raw | Set-Clipboard" -f $scriptPath)
    Write-Host ""
}

function Show-AuraCloudShellStatus {
    $root = "E:\Aura-core"
    $scriptPath = Join-Path $root "artifacts\aws\cloudshell\aura-cloudshell-bootstrap.sh"

    Write-Host ""
    Write-Host "AURA CLOUDSHELL STATUS" -ForegroundColor Cyan
    Write-Host "----------------------"
    Write-Host ("Bootstrap exists: {0}" -f (Test-Path $scriptPath))
    Write-Host "AWS credentials stored locally: false"
    Write-Host "OpenAI required: false"
    Write-Host "Recommended mode: CloudShell handoff"
    Write-Host "Policy included: SupportConsoleFullAccess"
    Write-Host ""
}
