param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("User","Group","Role")]
    [string]$TargetType,

    [Parameter(Mandatory=$true)]
    [string]$TargetName
)

$ErrorActionPreference = "Stop"

function Invoke-AwsChecked {
    param(
        [Parameter(Mandatory=$true)]
        [string[]]$AwsArgs
    )

    $output = & aws @AwsArgs 2>&1
    $exit = $LASTEXITCODE

    if ($exit -ne 0) {
        Write-Host ""
        Write-Host "AWS CLI command failed:" -ForegroundColor Red
        Write-Host ("aws {0}" -f ($AwsArgs -join " "))
        Write-Host ""
        Write-Host $output
        throw "AWS CLI failed with exit code $exit"
    }

    return ($output -join "`n")
}

$policyName = "SupportConsoleFullAccess"

Write-Host ""
Write-Host "AURA AWS IAM POLICY ATTACHMENT" -ForegroundColor Cyan
Write-Host "--------------------------------"
Write-Host ("Target type: {0}" -f $TargetType)
Write-Host ("Target name: {0}" -f $TargetName)

Write-Host ""
Write-Host "Checking AWS credentials..." -ForegroundColor Yellow

$identityJson = Invoke-AwsChecked -AwsArgs @("sts","get-caller-identity","--output","json")
$identity = $identityJson | ConvertFrom-Json

$accountId = $identity.Account
$policyArn = "arn:aws:iam::$accountId`:policy/$policyName"

Write-Host ("AWS Account: {0}" -f $accountId)
Write-Host ("Caller ARN:   {0}" -f $identity.Arn)
Write-Host ("Policy ARN:   {0}" -f $policyArn)

Write-Host ""
Write-Host "Checking policy exists..." -ForegroundColor Yellow
Invoke-AwsChecked -AwsArgs @("iam","get-policy","--policy-arn",$policyArn) | Out-Null

Write-Host ""
Write-Host "Attaching policy..." -ForegroundColor Yellow

switch ($TargetType) {
    "User" {
        Invoke-AwsChecked -AwsArgs @("iam","attach-user-policy","--user-name",$TargetName,"--policy-arn",$policyArn) | Out-Null
        $verifyArgs = @("iam","list-attached-user-policies","--user-name",$TargetName,"--output","table")
    }

    "Group" {
        Invoke-AwsChecked -AwsArgs @("iam","attach-group-policy","--group-name",$TargetName,"--policy-arn",$policyArn) | Out-Null
        $verifyArgs = @("iam","list-attached-group-policies","--group-name",$TargetName,"--output","table")
    }

    "Role" {
        Invoke-AwsChecked -AwsArgs @("iam","attach-role-policy","--role-name",$TargetName,"--policy-arn",$policyArn) | Out-Null
        $verifyArgs = @("iam","list-attached-role-policies","--role-name",$TargetName,"--output","table")
    }
}

Write-Host ""
Write-Host "Policy attached." -ForegroundColor Green

Write-Host ""
Write-Host "Verification:"
Invoke-AwsChecked -AwsArgs $verifyArgs
