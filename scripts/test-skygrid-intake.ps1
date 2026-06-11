param(
  [Parameter(Mandatory=$true)]
  [string]$Base
)

$ErrorActionPreference = "Stop"

function Invoke-SkygridIntake {
  param(
    [Parameter(Mandatory=$true)]
    [hashtable]$Payload,

    [Parameter(Mandatory=$true)]
    [string]$Label
  )

  $uri = "$Base/api/skygrid/intake"
  $body = $Payload | ConvertTo-Json -Depth 8

  Write-Host ""
  Write-Host "=== $Label ===" -ForegroundColor Cyan
  Write-Host "POST $uri"
  Write-Host $body

  try {
    $response = Invoke-RestMethod $uri -Method POST -ContentType "application/json" -Body $body
    $response | ConvertTo-Json -Depth 12
    return $response
  }
  catch {
    Write-Host "Request failed for $Label" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    if ($_.ErrorDetails -and $_.ErrorDetails.Message) {
      Write-Host $_.ErrorDetails.Message -ForegroundColor Yellow
    }
    throw
  }
}

Write-Host "SKYGRID Emergency Data On-Ramp local intake test" -ForegroundColor Green
Write-Host "Base: $Base"

Write-Host ""
Write-Host "Checking GET route..." -ForegroundColor Cyan
Invoke-RestMethod "$Base/api/skygrid/intake" -Method GET | ConvertTo-Json -Depth 8

$providerPayload = @{
  source = "local-powershell"
  customer_type = "provider"
  need = "provider capacity lease"
  severity = "normal"
  capacity_type = "compute"
  capacity_status = "available"
  approval = "manual"
  provider_verified = $false
  region = "us-west-2"
  message = "Provider wants to provide SKYGRID capacity"
  mirror_loop = $true
  timestamp = (Get-Date).ToString("o")
}

$utilizerPayload = @{
  source = "local-powershell"
  customer_type = "utilizer"
  need = "outage failover continuity"
  severity = "high"
  region = "us-west-2"
  message = "Utilizer needs emergency continuity routing"
  mirror_loop = $true
  timestamp = (Get-Date).ToString("o")
}

$bothPayload = @{
  source = "local-powershell"
  customer_type = "both"
  need = "provide and utilize failover capacity"
  severity = "normal"
  capacity_type = "relay"
  capacity_status = "available"
  approval = "manual"
  provider_verified = $false
  region = "us-west-2"
  message = "Partner wants dual-mode provide and utilize access"
  mirror_loop = $true
  timestamp = (Get-Date).ToString("o")
}

Invoke-SkygridIntake -Label "Provider / holding verification" -Payload $providerPayload | Out-Null
Invoke-SkygridIntake -Label "Utilizer / emergency off-ramp" -Payload $utilizerPayload | Out-Null
Invoke-SkygridIntake -Label "Both / partner dual-mode" -Payload $bothPayload | Out-Null

Write-Host ""
Write-Host "SKYGRID intake tests complete." -ForegroundColor Green
