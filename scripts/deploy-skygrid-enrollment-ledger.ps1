param(
    [string]$Region = "us-west-2",
    [string]$StackName = "skygrid-enrollment-ledger",
    [string]$TableName = "skygrid-enrollment-ledger",
    [string]$RuntimeRoleName = "skygrid-deployment-broker-runtime"
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path $PSScriptRoot -Parent
$templatePath = Join-Path $repoRoot "infra\skygrid-enrollment-ledger.yaml"

if (-not (Get-Command aws -ErrorAction SilentlyContinue)) {
    throw "AWS CLI is required."
}

aws sts get-caller-identity --region $Region | Out-Null
if ($LASTEXITCODE -ne 0) {
    throw "AWS identity validation failed."
}

aws cloudformation deploy `
    --region $Region `
    --stack-name $StackName `
    --template-file $templatePath `
    --capabilities CAPABILITY_NAMED_IAM `
    --parameter-overrides `
        "TableName=$TableName" `
        "RuntimeRoleName=$RuntimeRoleName" `
    --no-fail-on-empty-changeset

if ($LASTEXITCODE -ne 0) {
    throw "CloudFormation deployment failed."
}

$outputs = aws cloudformation describe-stacks `
    --region $Region `
    --stack-name $StackName `
    --query "Stacks[0].Outputs" `
    --output json | ConvertFrom-Json

$result = [ordered]@{}
foreach ($output in $outputs) {
    $result[$output.OutputKey] = $output.OutputValue
}

$result["Region"] = $Region
$result["StackName"] = $StackName
$result["DeployedAt"] = (Get-Date).ToString("o")

[pscustomobject]$result | Format-List

Write-Host ""
Write-Host "Set these variables before starting the broker:" -ForegroundColor Cyan
Write-Host ('$env:SKYGRID_ENROLLMENT_DYNAMODB_TABLE = "{0}"' -f $result.EnrollmentLedgerTableName)
Write-Host ('$env:AWS_REGION = "{0}"' -f $Region)
