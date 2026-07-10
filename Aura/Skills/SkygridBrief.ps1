function Invoke-AuraSkygridBrief {
    Write-Host ""
    Write-Host "SKYGRID BRIEF" -ForegroundColor Cyan
    Write-Host "-------------"
    Write-Host "System: SKYGRID Emergency Data On-Ramp"
    Write-Host "Mode:   Aura local proof-driven runtime"
    Write-Host ""

    Write-Host "Runtime" -ForegroundColor Yellow
    Write-Host "-------"
    Write-Host ("Aura Mode:     {0}" -f $(if ($env:AURA_MODE) { $env:AURA_MODE } else { "local" }))
    Write-Host ("OpenAI Mode:   {0}" -f $(if ($env:AURA_OPENAI_MODE) { $env:AURA_OPENAI_MODE } else { "offline" }))
    Write-Host ("Raw Shell:     {0}" -f $(if ($env:AURA_RAW_SHELL) { $env:AURA_RAW_SHELL } else { "disabled" }))
    Write-Host "Wallet:        read-only"
    Write-Host ""

    Write-Host "Git" -ForegroundColor Yellow
    Write-Host "---"
    $branch = git branch --show-current 2>$null
    $dirty = git status --short 2>$null
    Write-Host ("Branch:        {0}" -f $branch)

    if ($dirty) {
        Write-Host "Working Tree:  changes present" -ForegroundColor Yellow
    } else {
        Write-Host "Working Tree:  clean" -ForegroundColor Green
    }

    Write-Host ""

    Write-Host "Route" -ForegroundColor Yellow
    Write-Host "-----"
    $activeRoute = "E:\Aura-core\Aura\State\active-route.json"
    if (Test-Path $activeRoute) {
        $route = Get-Content $activeRoute -Raw | ConvertFrom-Json
        Write-Host ("Active Route:  {0}" -f $route.name)
        Write-Host ("URL:           {0}" -f $route.url)
        Write-Host ("Latency:       {0} ms" -f $route.average_latency_ms)
    } else {
        Write-Host "Active Route:  not selected" -ForegroundColor Yellow
        Write-Host 'Recommendation: run road less traveled'
    }

    Write-Host ""

    Write-Host "Proof" -ForegroundColor Yellow
    Write-Host "-----"
    $postmanProof = "E:\Aura-core\artifacts\validation\aura-postman-proof.md"
    $proofReport = "E:\Aura-core\artifacts\reports\aura-proof-report.md"
    $pnpkReport = "E:\Aura-core\artifacts\pnpk\proofs\pnpk-proof-report.md"

    Write-Host ("Postman Proof: {0}" -f $(if (Test-Path $postmanProof) { "present" } else { "missing" }))
    Write-Host ("Proof Report:  {0}" -f $(if (Test-Path $proofReport) { "present" } else { "missing" }))
    Write-Host ("PNPk Report:   {0}" -f $(if (Test-Path $pnpkReport) { "present" } else { "missing" }))

    Write-Host ""
    Write-Host ""
    Write-Host "AWS" -ForegroundColor Yellow
    Write-Host "---"

    $awsConnectionPath = "E:\Aura-core\Aura\State\aws-connected.json"
    $awsSupportPath = "E:\Aura-core\Aura\State\aws-support-bootstrap.json"

    if (Test-Path $awsConnectionPath) {
        $aws = Get-Content $awsConnectionPath -Raw | ConvertFrom-Json
        Write-Host ("Connected:     {0}" -f $aws.connected)
        Write-Host ("Account:       {0}" -f $aws.account)
        Write-Host ("Caller:        {0}" -f $aws.arn)
        Write-Host "Aura keys:     not stored"
    } else {
        Write-Host "Connected:     not checked"
    }

    if (Test-Path $awsSupportPath) {
        $support = Get-Content $awsSupportPath -Raw | ConvertFrom-Json
        Write-Host ("Support User:  {0}" -f $support.iam_user)
        Write-Host ("Support Group: {0}" -f $support.support_group)
        Write-Host ("Policies:      {0}, {1}" -f $support.aws_managed_policy, $support.custom_policy)
        Write-Host ("Bootstrap:     {0}" -f $support.status)
    } else {
        Write-Host "Support Setup: not recorded"
    }


    Write-Host "Recommendation" -ForegroundColor Yellow
    Write-Host "--------------"
    if ($dirty) {
        Write-Host "Checkpoint local changes before the next build session."
    } else {
        Write-Host "Path is clear. Good place to pause."
    }

    Write-Host ""
}

