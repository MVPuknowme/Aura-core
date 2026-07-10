function Invoke-AuraExportProofReport {
    $root = "E:\Aura-core"
    $reportDir = Join-Path $root "artifacts\reports"
    $reportPath = Join-Path $reportDir "aura-proof-report.md"
    $trainingPath = Join-Path $root "artifacts\training"
    $commandsPath = Join-Path $root "Aura\Config\commands.json"
    $activeRoutePath = Join-Path $root "Aura\State\active-route.json"

    New-Item -ItemType Directory -Force $reportDir | Out-Null

    $branch = git rev-parse --abbrev-ref HEAD 2>$null
    $commit = git rev-parse --short HEAD 2>$null
    $dirty = git status --short 2>$null

    $lines = New-Object System.Collections.Generic.List[string]

    $lines.Add("# AURA Proof Report")
    $lines.Add("")
    $lines.Add(("Generated: {0}" -f (Get-Date -Format o)))
    $lines.Add("")
    $lines.Add("## Runtime")
    $lines.Add("")
    $lines.Add(("- Mode: {0}" -f $env:AURA_MODE))
    $lines.Add(("- OpenAI Mode: {0}" -f $env:AURA_OPENAI_MODE))
    $lines.Add(("- Raw Shell: {0}" -f $env:AURA_RAW_SHELL))
    $lines.Add("- Wallet: read-only")
    $lines.Add("")
    $lines.Add("## Git")
    $lines.Add("")
    $lines.Add(("- Branch: {0}" -f $branch))
    $lines.Add(("- Commit: {0}" -f $commit))

    if ($dirty) {
        $lines.Add("- Working Tree: changes present")
    } else {
        $lines.Add("- Working Tree: clean")
    }

    $lines.Add("")
    $lines.Add("## Commands")

    if (Test-Path $commandsPath) {
        $commands = Get-Content $commandsPath -Raw | ConvertFrom-Json

        foreach ($cmd in $commands) {
            $lines.Add("")
            $lines.Add(("- Phrase: {0}" -f $cmd.phrase))
            $lines.Add(("  - Intent: {0}" -f $cmd.intent))
            $lines.Add(("  - Skill: {0}" -f $cmd.skill))
            $lines.Add(("  - Safety: {0}" -f $cmd.safety_level))
            $lines.Add(("  - Enabled: {0}" -f $cmd.enabled))
        }
    } else {
        $lines.Add("")
        $lines.Add("No command registry found.")
    }

    $lines.Add("")
    $lines.Add("## Active Route")

    if (Test-Path $activeRoutePath) {
        $route = Get-Content $activeRoutePath -Raw | ConvertFrom-Json

        $lines.Add("")
        $lines.Add(("- Name: {0}" -f $route.name))
        $lines.Add(("- URL: {0}" -f $route.url))
        $lines.Add(("- Average Latency: {0} ms" -f $route.average_latency_ms))
        $lines.Add(("- Reason: {0}" -f $route.reason))
    } else {
        $lines.Add("")
        $lines.Add("No active route selected.")
    }

    $lines.Add("")
    $lines.Add("## Training Proof Files")

    if (Test-Path $trainingPath) {
        Get-ChildItem $trainingPath -File |
            Sort-Object LastWriteTime -Descending |
            ForEach-Object {
                $lines.Add("")
                $lines.Add(("- {0}" -f $_.Name))
                $lines.Add(("  - Modified: {0}" -f $_.LastWriteTime))
                $lines.Add(("  - Size: {0} bytes" -f $_.Length))
            }
    } else {
        $lines.Add("")
        $lines.Add("No training proof directory found.")
    }

    $lines | Set-Content $reportPath

    Write-Host "Aura proof report exported:" -ForegroundColor Green
    Write-Host $reportPath
}
