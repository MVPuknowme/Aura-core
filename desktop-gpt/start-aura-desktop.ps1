# Aura GPT Desktop starter
# Controlled-pilot local launcher for the Aura/SKYGRID switch director.
# OpenAI is optional provider plumbing, not the desktop director.

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Resolve-Path (Join-Path $ScriptDir "..")
$LogDir = Join-Path $ScriptDir "logs"
$RunId = "{0}-{1}" -f (Get-Date).ToString("yyyyMMdd-HHmmss"), $PID
$LogPath = Join-Path $LogDir "aura-desktop-$RunId.log"
$LatestLogPath = Join-Path $LogDir "aura-desktop.latest.log"

New-Item -ItemType Directory -Force $LogDir | Out-Null

function Write-AuraLog {
  param([string]$Message)
  $line = "[{0}] {1}" -f (Get-Date).ToString("s"), $Message

  try {
    Add-Content -Path $LogPath -Value $line -Encoding UTF8 -ErrorAction Stop
  } catch {
    Write-Host "[log-warning] Could not write run log: $($_.Exception.Message)"
  }

  try {
    Set-Content -Path $LatestLogPath -Value $line -Encoding UTF8 -ErrorAction Stop
  } catch {
    # latest log is best-effort only; never fail launch because a viewer has the log open.
  }

  Write-Host $line
}

function Test-CommandExists {
  param([string]$Name)
  return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

$DirectorBase = if ($env:AURA_DIRECTOR_BASE_URL) { $env:AURA_DIRECTOR_BASE_URL.TrimEnd('/') } else { "https://aurcore.skygrid-protocol.net" }
$DirectorUrl = "$DirectorBase/api/aura/director"

# Backward-compatible env reads. Do not write secrets into this file.
$env:OPENAI_API_KEY = [Environment]::GetEnvironmentVariable("OPENAI_API_KEY", "User")
$env:AURA_OPENAI_MODEL = [Environment]::GetEnvironmentVariable("AURA_OPENAI_MODEL", "User")
$env:AURA_LOCAL_MODEL_URL = [Environment]::GetEnvironmentVariable("AURA_LOCAL_MODEL_URL", "User")
$env:AURA_MCP_BRIDGE_URL = [Environment]::GetEnvironmentVariable("AURA_MCP_BRIDGE_URL", "User")
$env:AURA_CUSTOM_PROVIDER_URL = [Environment]::GetEnvironmentVariable("AURA_CUSTOM_PROVIDER_URL", "User")
$env:AURA_DIRECTOR_BASE_URL = $DirectorBase

Write-AuraLog "Aura GPT Desktop starter online."
Write-AuraLog "ScriptDir=$ScriptDir"
Write-AuraLog "RepoRoot=$RepoRoot"
Write-AuraLog "LogPath=$LogPath"
Write-AuraLog "DirectorUrl=$DirectorUrl"

Set-Location -LiteralPath $ScriptDir

if (-not (Test-CommandExists "node")) {
  Write-AuraLog "ERROR: Node.js is not available in PATH. Install Node 24 or open from the configured dev shell."
  Read-Host "Press Enter to close"
  exit 1
}

try {
  $nodeVersion = node --version
  Write-AuraLog "Node=$nodeVersion"
} catch {
  Write-AuraLog "ERROR: Could not read Node version: $($_.Exception.Message)"
  Read-Host "Press Enter to close"
  exit 1
}

# Decision-only director check. execute=false prevents provider calls.
$Payload = @{
  source = "aura-gpt-desktop"
  task = "desktop-launch"
  prompt = "Aura GPT Desktop startup route check. Decision only."
  provider = "auto"
  privacy = "normal"
  execute = $false
} | ConvertTo-Json -Depth 8

try {
  $Response = Invoke-RestMethod -Method Post -Uri $DirectorUrl -ContentType "application/json" -Body $Payload -TimeoutSec 20
  $Selected = $Response.selected_provider.id
  $Reason = $Response.reason
  Write-AuraLog "Director route OK. selected_provider=$Selected reason=$Reason"
} catch {
  Write-AuraLog "WARNING: Director route check failed: $($_.Exception.Message)"
  Write-AuraLog "Fallback posture: fail_closed_advisory_only"
}

# Start desktop app only if package scripts are available.
$PackageJson = Join-Path $ScriptDir "package.json"
if (Test-Path $PackageJson) {
  Write-AuraLog "Starting Aura GPT Desktop app with npm start."
  npm start *>> $LogPath
  exit $LASTEXITCODE
}

# Fallback: open director status route so the operator sees the switch director.
try {
  Start-Process "$DirectorBase/api/aura/director"
  Write-AuraLog "No desktop package.json found; opened Aura director status in browser."
} catch {
  Write-AuraLog "WARNING: Could not open browser: $($_.Exception.Message)"
}

Write-AuraLog "Aura GPT Desktop starter complete."
