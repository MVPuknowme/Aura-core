$ErrorActionPreference = "Stop"

$AuditDir = "E:\Aura-core\.skygrid\social-integrity"
$RegistryPath = Join-Path $AuditDir "photo-verification-registry.csv"
$PolicyPath = "E:\Aura-core\config\social-photo-verification-policy.json"

New-Item -ItemType Directory -Force $AuditDir | Out-Null

if (!(Test-Path $RegistryPath)) {
  "timestamp,platform,sender_hint,photo_sha256,proof_code,decision,reason" |
    Set-Content -Encoding utf8 $RegistryPath
}

function Clean-CsvField {
  param([string]$Value)

  if ($null -eq $Value) { $Value = "" }

  $safe = $Value `
    -replace '"','""' `
    -replace "`r|`n",' '

  if ($safe.Length -gt 600) {
    $safe = $safe.Substring(0, 600)
  }

  return '"' + $safe + '"'
}

function Add-PhotoVerificationRow {
  param(
    [string]$Platform,
    [string]$SenderHint,
    [string]$PhotoSha256,
    [string]$ProofCode,
    [string]$Decision,
    [string]$Reason
  )

  $row = @(
    (Get-Date).ToUniversalTime().ToString("o"),
    $Platform,
    $SenderHint,
    $PhotoSha256,
    $ProofCode,
    $Decision,
    $Reason
  ) | ForEach-Object { Clean-CsvField "$_" }

  ($row -join ",") | Add-Content -Encoding utf8 $RegistryPath
}

function Get-PhotoHashFromFile {
  param([string]$FilePath)

  if (!(Test-Path $FilePath)) {
    throw "Photo file not found: $FilePath"
  }

  return (Get-FileHash -Algorithm SHA256 -Path $FilePath).Hash.ToLower()
}

function Get-SkygridPhotoVerificationDecision {
  param(
    [string]$Platform = "social",
    [string]$SenderHint = "unknown",
    [string]$PhotoSha256 = "",
    [string]$ProofCode = "",
    [string]$ExpectedProofCode = ""
  )

  $policy = $null
  if (Test-Path $PolicyPath) {
    $policy = Get-Content $PolicyPath -Raw | ConvertFrom-Json
  }

  if ([string]::IsNullOrWhiteSpace($ExpectedProofCode)) {
    if ($policy -and $policy.expectedProofCode) {
      $ExpectedProofCode = "$($policy.expectedProofCode)"
    }
    else {
      $ExpectedProofCode = "SKYGRID"
    }
  }

  $decision = "allow-log"
  $score = 85
  $reasons = New-Object System.Collections.Generic.List[string]

  # Verified sender allowlist.
  $isVerifiedSender = $false

  if ($policy -and $policy.verifiedSenders) {
    foreach ($sender in $policy.verifiedSenders) {
      if (
        "$($sender.platform)" -eq "$Platform" -and
        "$($sender.senderHint)" -eq "$SenderHint"
      ) {
        $isVerifiedSender = $true
      }
    }
  }

  if ($isVerifiedSender) {
    $score += 10
    $reasons.Add("verified-sender-allowlist")
  }

  if ([string]::IsNullOrWhiteSpace($PhotoSha256)) {
    $score -= 30
    $decision = "challenge"
    $reasons.Add("missing-photo-hash")
  }
  else {
    $PhotoSha256 = $PhotoSha256.ToLower()

    $existing = @()
    if (Test-Path $RegistryPath) {
      $existing = Import-Csv $RegistryPath | Where-Object {
        $_.photo_sha256 -eq $PhotoSha256
      }
    }

    $otherSenderHits = $existing | Where-Object {
      $_.sender_hint -ne $SenderHint -or $_.platform -ne $Platform
    }

    if ($otherSenderHits.Count -gt 0) {
      $score -= 60
      $decision = "quarantine"
      $reasons.Add("same-photo-used-by-different-sender")
    }
    else {
      $reasons.Add("photo-hash-not-seen-on-different-sender")
    }
  }

  if ([string]::IsNullOrWhiteSpace($ProofCode)) {
    $score -= 20
    if ($decision -eq "allow" -or $decision -eq "allow-log") {
      $decision = "challenge"
    }
    $reasons.Add("missing-proof-code")
  }
  elseif ($ProofCode.Trim() -ne $ExpectedProofCode.Trim()) {
    $score -= 45
    $decision = "quarantine"
    $reasons.Add("invalid-proof-code")
  }
  else {
    $score += 10
    $reasons.Add("valid-proof-code")
  }

  if ($score -lt 0) { $score = 0 }
  if ($score -gt 100) { $score = 100 }

  if ($score -ge 95 -and $decision -eq "allow-log") {
    $decision = "allow"
  }

  $reason = if ($reasons.Count) { $reasons -join "|" } else { "no-photo-risk-signals" }

  Add-PhotoVerificationRow `
    -Platform $Platform `
    -SenderHint $SenderHint `
    -PhotoSha256 $PhotoSha256 `
    -ProofCode $ProofCode `
    -Decision $decision `
    -Reason $reason

  [pscustomobject]@{
    platform = $Platform
    senderHint = $SenderHint
    decision = $decision
    score = $score
    reason = $reason
    photoSha256 = $PhotoSha256
    expectedProofCode = $ExpectedProofCode
    model = "hash-and-proof-code-only-no-face-recognition"
  }
}

Write-Host "Loaded SKYGRID Social Photo Verification Firewall"
Write-Host "Registry: $RegistryPath"
