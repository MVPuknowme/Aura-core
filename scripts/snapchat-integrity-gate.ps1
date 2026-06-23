$ErrorActionPreference = "Stop"

$Port = if ($env:SNAPCHAT_GATE_PORT) { [int]$env:SNAPCHAT_GATE_PORT } else { 8788 }
$Prefix = "http://127.0.0.1:$Port/"

$AuditDir = "E:\Aura-core\.skygrid\snapchat-integrity"
$LedgerPath = Join-Path $AuditDir "snapchat-integrity-ledger.csv"

New-Item -ItemType Directory -Force $AuditDir | Out-Null

if (!(Test-Path $LedgerPath)) {
  "timestamp,platform,decision,score,sender_hint,source,reason,message_preview" |
    Set-Content -Encoding utf8 $LedgerPath
}

function Clean-CsvField {
  param([string]$Value)

  if ($null -eq $Value) { $Value = "" }

  $safe = $Value `
    -replace '"','""' `
    -replace "`r|`n",' '

  if ($safe.Length -gt 500) {
    $safe = $safe.Substring(0, 500)
  }

  return '"' + $safe + '"'
}

function Add-SnapAuditRow {
  param(
    [string]$Decision,
    [int]$Score,
    [string]$SenderHint,
    [string]$Source,
    [string]$Reason,
    [string]$Message
  )

  $preview = if ($Message.Length -gt 160) { $Message.Substring(0,160) } else { $Message }

  $row = @(
    (Get-Date).ToUniversalTime().ToString("o"),
    "snapchat",
    $Decision,
    $Score,
    $SenderHint,
    $Source,
    $Reason,
    $preview
  ) | ForEach-Object { Clean-CsvField "$_" }

  ($row -join ",") | Add-Content -Encoding utf8 $LedgerPath
}

function Send-Json {
  param(
    $Context,
    [int]$StatusCode,
    $Object
  )

  $json = $Object | ConvertTo-Json -Depth 20
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)

  $Context.Response.StatusCode = $StatusCode
  $Context.Response.ContentType = "application/json"
  $Context.Response.Headers.Add("Cache-Control", "no-store")
  $Context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
  $Context.Response.OutputStream.Close()
}

function Read-RequestBody {
  param($Request)

  $reader = New-Object System.IO.StreamReader($Request.InputStream, $Request.ContentEncoding)
  try {
    return $reader.ReadToEnd()
  }
  finally {
    $reader.Close()
  }
}

function Get-SnapScore {
  param(
    [string]$Message,
    [string]$SenderHint,
    [string]$Source
  )

  $text = "$Message"
  $score = 74
  $reasons = New-Object System.Collections.Generic.List[string]

  if ([string]::IsNullOrWhiteSpace($SenderHint) -or $SenderHint -eq "unknown") {
    $score -= 12
    $reasons.Add("missing-sender-hint")
  }

  if ([string]::IsNullOrWhiteSpace($text)) {
    $score -= 35
    $reasons.Add("empty-message")
  }

  if ($text.Length -gt 1000) {
    $score -= 25
    $reasons.Add("very-long-message")
  }

  if ($text.Length -ge 8 -and $text.Length -le 280) {
    $score += 10
    $reasons.Add("normal-human-length")
  }

  if ($text -match "(.)\1{10,}") {
    $score -= 20
    $reasons.Add("repeated-character-flood")
  }

  $linkCount = ([regex]::Matches($text, "https?://\S+", "IgnoreCase")).Count
  if ($linkCount -ge 3) {
    $score -= 30
    $reasons.Add("link-flood")
  }

  if ($text -match "(?i)\b(free followers|snap score boost|premium unlock|crypto giveaway|airdrop claim|wallet verify|seed phrase|investment guaranteed)\b") {
    $score -= 40
    $reasons.Add("known-scam-language")
  }

  if ($text -match "(?i)\b(quote|install|appointment|collab|collaboration|sponsor|business|help|estimate)\b") {
    $score += 8
    $reasons.Add("business-intent")
  }

  if ($text -match "^[\W_]+$" -and $text.Length -gt 16) {
    $score -= 15
    $reasons.Add("symbol-only-noise")
  }

  if ("$Source" -like "*snapchat-lead-form*") {
    $score += 4
    $reasons.Add("controlled-entrypoint")
  }

  if ($score -lt 0) { $score = 0 }
  if ($score -gt 100) { $score = 100 }

  $decision = "allow"

  if ($score -lt 20) {
    $decision = "block"
  }
  elseif ($score -lt 40) {
    $decision = "quarantine"
  }
  elseif ($score -lt 65) {
    $decision = "challenge"
  }
  elseif ($score -lt 90) {
    $decision = "allow-log"
  }

  $reason = if ($reasons.Count) { $reasons -join "|" } else { "no-risk-signals" }

  [pscustomobject]@{
    decision = $decision
    score = $score
    reason = $reason
  }
}

function Get-SnapMessages {
  param($Body)

  $messages = New-Object System.Collections.Generic.List[object]

  if ($Body.message -or $Body.text) {
    $messages.Add([pscustomobject]@{
      senderHint = if ($Body.sender_hint) { "$($Body.sender_hint)" } elseif ($Body.snap_username) { "$($Body.snap_username)" } else { "unknown" }
      source = if ($Body.source) { "$($Body.source)" } else { "snapchat-lead-form" }
      message = if ($Body.message) { "$($Body.message)" } else { "$($Body.text)" }
    })
  }

  if ($Body.events -and $Body.events.Count -gt 0) {
    foreach ($event in $Body.events) {
      $messages.Add([pscustomobject]@{
        senderHint = if ($event.sender_hint) { "$($event.sender_hint)" } elseif ($event.creator_profile_id) { "$($event.creator_profile_id)" } elseif ($event.id) { "$($event.id)" } else { "unknown" }
        source = if ($event.source) { "$($event.source)" } else { "snapchat-event" }
        message = if ($event.message) { "$($event.message)" } elseif ($event.text) { "$($event.text)" } elseif ($event.text_message) { "$($event.text_message)" } else { "" }
      })
    }
  }

  return $messages
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($Prefix)
$listener.Start()

Write-Host "SKYGRID Snapchat Integrity Gate running at $Prefix"
Write-Host "Health:  $Prefix`health"
Write-Host "Webhook: $Prefix`webhooks/snapchat"
Write-Host "Ledger:  $LedgerPath"
Write-Host "Press Ctrl+C to stop."

while ($listener.IsListening) {
  $context = $listener.GetContext()
  $request = $context.Request
  $path = $request.Url.AbsolutePath

  try {
    if ($request.HttpMethod -eq "GET" -and $path -eq "/health") {
      Send-Json $context 200 @{
        ok = $true
        service = "SKYGRID Snapchat Integrity Gate"
        runtime = "PowerShell HttpListener"
        mode = "local-dev"
        port = $Port
        auditPath = $LedgerPath
      }
      continue
    }

    if ($request.HttpMethod -eq "GET" -and $path -eq "/snapchat/checklist") {
      Send-Json $context 200 @{
        ok = $true
        productionChecklist = @(
          "Use a Snapchat Public Profile / business workflow.",
          "Do not scrape private Snapchat DMs.",
          "Use approved Snap API access where available.",
          "Start in log-only or quarantine mode before blocking.",
          "Never store passwords, cookies, session tokens, or private Snaps.",
          "Use a controlled lead form, webhook, or approved API callback."
        )
      }
      continue
    }

    if ($request.HttpMethod -eq "POST" -and $path -eq "/webhooks/snapchat") {
      $raw = Read-RequestBody $request

      try {
        $body = $raw | ConvertFrom-Json
      }
      catch {
        Add-SnapAuditRow `
          -Decision "reject" `
          -Score 0 `
          -SenderHint "unknown" `
          -Source "webhook" `
          -Reason "invalid-json" `
          -Message "bad body"

        Send-Json $context 400 @{ ok = $false; error = "invalid-json" }
        continue
      }

      $items = Get-SnapMessages $body
      $results = New-Object System.Collections.Generic.List[object]

      foreach ($item in $items) {
        $score = Get-SnapScore `
          -Message $item.message `
          -SenderHint $item.senderHint `
          -Source $item.source

        Add-SnapAuditRow `
          -Decision $score.decision `
          -Score $score.score `
          -SenderHint $item.senderHint `
          -Source $item.source `
          -Reason $score.reason `
          -Message $item.message

        $results.Add([pscustomobject]@{
          senderHint = $item.senderHint
          source = $item.source
          decision = $score.decision
          score = $score.score
          reason = $score.reason
        })
      }

      Send-Json $context 200 @{
        ok = $true
        service = "SKYGRID Snapchat Integrity Gate"
        processed = $results.Count
        results = $results
      }
      continue
    }

    Send-Json $context 404 @{
      ok = $false
      error = "not-found"
      available = @(
        "GET /health",
        "GET /snapchat/checklist",
        "POST /webhooks/snapchat"
      )
    }
  }
  catch {
    Send-Json $context 500 @{
      ok = $false
      error = "server-error"
      message = $_.Exception.Message
    }
  }
}
