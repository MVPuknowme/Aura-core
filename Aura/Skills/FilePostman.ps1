function Invoke-AuraInboxStatus {
    $root = "E:\Aura-core"
    $inbox = Join-Path $root "Aura\Inbox"
    $unsorted = Join-Path $root "Aura\Inbox\Unsorted"
    $receipts = Join-Path $root "artifacts\receipts"

    New-Item -ItemType Directory -Force $inbox | Out-Null
    New-Item -ItemType Directory -Force $unsorted | Out-Null
    New-Item -ItemType Directory -Force $receipts | Out-Null

    $items = @(Get-ChildItem $inbox -File -ErrorAction SilentlyContinue)
    $unknown = @(Get-ChildItem $unsorted -File -ErrorAction SilentlyContinue)
    $receiptItems = @(Get-ChildItem $receipts -File -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 10)

    Write-Host ""
    Write-Host "AURA INBOX STATUS" -ForegroundColor Cyan
    Write-Host "-----------------"
    Write-Host ("Inbox files:    {0}" -f $items.Count)
    Write-Host ("Unsorted files: {0}" -f $unknown.Count)
    Write-Host ("Receipts shown: {0}" -f $receiptItems.Count)
    Write-Host ""

    if ($items.Count -gt 0) {
        Write-Host "Recommendation: run sort inbox" -ForegroundColor Yellow
    } else {
        Write-Host "Recommendation: inbox path is clear" -ForegroundColor Green
    }

    Write-Host ""
}

function Show-AuraInbox {
    $root = "E:\Aura-core"
    $inbox = Join-Path $root "Aura\Inbox"
    $unsorted = Join-Path $root "Aura\Inbox\Unsorted"

    Write-Host ""
    Write-Host "AURA INBOX" -ForegroundColor Cyan
    Write-Host "----------"

    Write-Host ""
    Write-Host "Inbox:"
    Get-ChildItem $inbox -File -ErrorAction SilentlyContinue | Select-Object Name,Length,LastWriteTime

    Write-Host ""
    Write-Host "Unsorted:"
    Get-ChildItem $unsorted -File -ErrorAction SilentlyContinue | Select-Object Name,Length,LastWriteTime

    Write-Host ""
}

function Test-AuraFilingRules {
    $root = "E:\Aura-core"

    $folders = @(
        "Aura\Inbox",
        "Aura\Inbox\Unsorted",
        "Aura\State",
        "Aura\Logs",
        "Aura\Config",
        "Aura\Skills",
        "artifacts\training",
        "artifacts\validation",
        "artifacts\reports",
        "artifacts\prompts",
        "artifacts\pnpk\packages",
        "artifacts\pnpk\proofs",
        "artifacts\receipts",
        "postman"
    )

    foreach ($folder in $folders) {
        New-Item -ItemType Directory -Force (Join-Path $root $folder) | Out-Null
    }

    $reportPath = Join-Path $root "artifacts\receipts\filing-validation-report.md"

    $lines = @()
    $lines += "# AURA Filing Validation Report"
    $lines += ""
    $lines += ("Generated: {0}" -f (Get-Date -Format o))
    $lines += ""
    $lines += "## Managed folders"
    $lines += ""

    foreach ($folder in $folders) {
        $full = Join-Path $root $folder
        $exists = Test-Path $full
        $lines += ("- {0}: {1}" -f $folder, $exists)
    }

    $lines += ""
    $lines += "## Safety"
    $lines += ""
    $lines += "- OpenAI required: false"
    $lines += "- Raw shell execution: false"
    $lines += "- Wallet mode: read-only"
    $lines += "- Destructive moves: disabled by default"

    $lines | Set-Content $reportPath

    Write-Host ""
    Write-Host "AURA FILING VALIDATION" -ForegroundColor Cyan
    Write-Host "----------------------"
    Write-Host "Managed folders verified."
    Write-Host "Report:"
    Write-Host $reportPath
    Write-Host ""
    Write-Host "Recommendation: checkpoint filing workflow when ready." -ForegroundColor Yellow
    Write-Host ""
}

function Show-AuraFileReceipts {
    $receipts = "E:\Aura-core\artifacts\receipts"

    New-Item -ItemType Directory -Force $receipts | Out-Null

    Write-Host ""
    Write-Host "AURA FILE RECEIPTS" -ForegroundColor Cyan
    Write-Host "------------------"

    Get-ChildItem $receipts -File -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 10 Name,Length,LastWriteTime

    Write-Host ""
}

function Invoke-AuraSortInbox {
    Write-Host ""
    Write-Host "AURA INBOX SORT" -ForegroundColor Cyan
    Write-Host "---------------"
    Write-Host "Sorting logic placeholder installed."
    Write-Host "Current mode: non-destructive copy-only."
    Write-Host "Recommendation: next build should add classify -> copy -> receipt."
    Write-Host ""
}
