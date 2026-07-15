param(
    [string]$NodeOwner = $env:USERNAME,
    [string]$Partition = "diagnostic",
    [int]$MinimumFreeDiskGB = 5,
    [int]$MinimumMemoryGB = 4
)

$ErrorActionPreference = "Stop"

function Get-Sha256Hex {
    param([byte[]]$Bytes)

    $sha256 = [System.Security.Cryptography.SHA256]::Create()

    try {
        $hash = $sha256.ComputeHash($Bytes)
        return ($hash | ForEach-Object {
            $_.ToString("x2")
        }) -join ""
    }
    finally {
        $sha256.Dispose()
    }
}

$repoRoot = Split-Path $PSScriptRoot -Parent
$receiptRoot = Join-Path $repoRoot "evidence\node-pilot"

New-Item `
    -ItemType Directory `
    -Path $receiptRoot `
    -Force | Out-Null

$computer = Get-CimInstance Win32_ComputerSystem
$os = Get-CimInstance Win32_OperatingSystem
$cpu = Get-CimInstance Win32_Processor | Select-Object -First 1
$disk = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'"

$memoryGB = [math]::Round(
    $computer.TotalPhysicalMemory / 1GB,
    2
)

$freeDiskGB = [math]::Round(
    $disk.FreeSpace / 1GB,
    2
)

$capacityApproved =
    $memoryGB -ge $MinimumMemoryGB -and
    $freeDiskGB -ge $MinimumFreeDiskGB

if (-not $capacityApproved) {
    throw "Node failed capacity requirements."
}

$identitySeed = @(
    $computer.Name
    $computer.Manufacturer
    $computer.Model
    $os.Caption
) -join "|"

$nodeId = Get-Sha256Hex `
    -Bytes ([System.Text.Encoding]::UTF8.GetBytes($identitySeed))

$workloadStarted = Get-Date

$diagnosticPayload = @"
SKYGRID controlled-pilot diagnostic workload
Node: $nodeId
Partition: $Partition
Started: $($workloadStarted.ToString("o"))
"@

$workloadHash = Get-Sha256Hex `
    -Bytes ([System.Text.Encoding]::UTF8.GetBytes($diagnosticPayload))

$workloadCompleted = Get-Date

$receipt = [ordered]@{
    schema_version = "1.0"
    service = "SKYGRID Emergency Data On-Ramp"
    mode = "controlled_pilot"
    node_id = $nodeId
    node_owner = $NodeOwner
    hostname = $computer.Name
    platform = "windows"
    operating_system = $os.Caption
    operating_system_version = $os.Version
    manufacturer = $computer.Manufacturer
    model = $computer.Model
    cpu = $cpu.Name
    logical_processors = $computer.NumberOfLogicalProcessors
    memory_gb = $memoryGB
    free_disk_gb = $freeDiskGB
    partition = $Partition
    capacity_verified = $capacityApproved
    workload = [ordered]@{
        type = "diagnostic_sha256"
        production = $false
        started_at = $workloadStarted.ToString("o")
        completed_at = $workloadCompleted.ToString("o")
        output_sha256 = $workloadHash
        success = $true
    }
    heartbeat = [ordered]@{
        status = "healthy"
        timestamp = (Get-Date).ToString("o")
    }
    guardrails = [ordered]@{
        payment_execution = $false
        wallet_signing = $false
        transaction_broadcast = $false
        production_failover = $false
        private_data_movement = $false
    }
    lifecycle_state = "active"
    ok = $true
}

$receiptPath = Join-Path `
    $receiptRoot `
    "node-$nodeId-enrollment.json"

$json = $receipt | ConvertTo-Json -Depth 10

[System.IO.File]::WriteAllText(
    $receiptPath,
    $json,
    [System.Text.UTF8Encoding]::new($false)
)

Write-Host "SKYGRID node enrolled."
Write-Host "Node ID: $nodeId"
Write-Host "Capacity verified: $capacityApproved"
Write-Host "Memory: $memoryGB GB"
Write-Host "Free disk: $freeDiskGB GB"
Write-Host "Receipt: $receiptPath"