function Invoke-AuraAwsConnected {
    $root = "E:\Aura-core"
    $stateDir = Join-Path $root "Aura\State"
    $statePath = Join-Path $stateDir "aws-connected.json"

    New-Item -ItemType Directory -Force $stateDir | Out-Null

    Write-Host ""
    Write-Host "AURA AWS CONNECTION" -ForegroundColor Cyan
    Write-Host "-------------------"

    try {
        $identityRaw = aws sts get-caller-identity --output json 2>&1

        if ($LASTEXITCODE -ne 0) {
            throw $identityRaw
        }

        $identity = $identityRaw | ConvertFrom-Json

        $status = [ordered]@{
            format = "aura.aws.connection"
            version = "0.1.0"
            connected = $true
            checked_at = (Get-Date).ToString("o")
            account = $identity.Account
            arn = $identity.Arn
            user_id = $identity.UserId
            credentials_stored_by_aura = $false
            mode = "aws-cli-session"
            support_console_policy = "check separately"
        }

        $status | ConvertTo-Json -Depth 8 | Set-Content $statePath

        Write-Host "AWS Connected: true" -ForegroundColor Green
        Write-Host ("Account:       {0}" -f $identity.Account)
        Write-Host ("ARN:           {0}" -f $identity.Arn)
        Write-Host ("UserId:        {0}" -f $identity.UserId)
        Write-Host ("State:         {0}" -f $statePath)
        Write-Host ""
        Write-Host "Aura did not store AWS keys. It only verified the current AWS CLI session." -ForegroundColor Yellow
        Write-Host ""
    }
    catch {
        $status = [ordered]@{
            format = "aura.aws.connection"
            version = "0.1.0"
            connected = $false
            checked_at = (Get-Date).ToString("o")
            error = "$_"
            credentials_stored_by_aura = $false
            mode = "aws-cli-session"
        }

        $status | ConvertTo-Json -Depth 8 | Set-Content $statePath

        Write-Host "AWS Connected: false" -ForegroundColor Red
        Write-Host $_
        Write-Host ""
    }
}

function Show-AuraAwsConnection {
    $statePath = "E:\Aura-core\Aura\State\aws-connected.json"

    Write-Host ""
    Write-Host "AURA AWS STATUS" -ForegroundColor Cyan
    Write-Host "---------------"

    if (-not (Test-Path $statePath)) {
        Write-Host "AWS state: not checked yet" -ForegroundColor Yellow
        Write-Host "Run: Invoke-AuraRuntime `"aws connected`""
        Write-Host ""
        return
    }

    $state = Get-Content $statePath -Raw | ConvertFrom-Json

    Write-Host ("Connected: {0}" -f $state.connected)
    Write-Host ("Checked:   {0}" -f $state.checked_at)
    Write-Host ("Account:   {0}" -f $state.account)
    Write-Host ("ARN:       {0}" -f $state.arn)
    Write-Host "Keys stored by Aura: false"
    Write-Host ""
}

function Test-AuraAwsSupportPolicies {
    Write-Host ""
    Write-Host "AURA AWS SUPPORT POLICY CHECK" -ForegroundColor Cyan
    Write-Host "-----------------------------"

    try {
        $identity = aws sts get-caller-identity --output json | ConvertFrom-Json
        Write-Host ("Account: {0}" -f $identity.Account)
        Write-Host ("Caller:  {0}" -f $identity.Arn)
        Write-Host ""

        if ($identity.Arn -match ":user\/(.+)$") {
            $userName = $Matches[1]
            Write-Host ("IAM User: {0}" -f $userName)

            aws iam list-attached-user-policies `
              --user-name $userName `
              --query "AttachedPolicies[].[PolicyName,PolicyArn]" `
              --output table
        }
        elseif ($identity.Arn -match ":assumed-role\/([^\/]+)\/") {
            $roleName = $Matches[1]
            Write-Host ("Assumed Role: {0}" -f $roleName)

            aws iam list-attached-role-policies `
              --role-name $roleName `
              --query "AttachedPolicies[].[PolicyName,PolicyArn]" `
              --output table
        }
        else {
            Write-Host "Could not infer IAM user or role from caller ARN." -ForegroundColor Yellow
        }
    }
    catch {
        Write-Host "Support policy check failed." -ForegroundColor Red
        Write-Host $_
    }

    Write-Host ""
}
