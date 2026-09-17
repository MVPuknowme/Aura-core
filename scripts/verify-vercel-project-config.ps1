$ErrorActionPreference = "Stop"
$config = Get-Content -Raw -Path "vercel.json" | ConvertFrom-Json
if ($config.installCommand -ne "pnpm install --frozen-lockfile") { throw "Unexpected Vercel installCommand" }
if ($config.buildCommand -ne "pnpm run build") { throw "Unexpected Vercel buildCommand" }
if ($config.buildCommand -match "xmcp\s+build") { throw "XMCP must not be the primary Vercel build command" }
Write-Host "Vercel project config verification passed"
