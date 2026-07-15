param(
    [Parameter(Mandatory)]
    [ValidateSet("status", "revoke", "assign")]
    [string]$Action,

    [Parameter(Mandatory)]
    [string]$NodeId,

    [string]$Partition = "diagnostic"
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path $PSScriptRoot -Parent
$evidenceRoot = Join-Path $repoRoot "evidence\node-pilot"

$enrollmentPath = Join-Path $evidenceRoot "node-$NodeId-enrollment.json"
$revocationPath = Join-Path $evidenceRoot "node-$NodeId-revocation.json"

if (-not (Test-Path $enrollmentPath)) {
    throw "Enrollment receipt not found for node $NodeId"
}

$enrollment = Get-Content $enrollmentPath -Raw | ConvertFrom-Json

switch ($Action) {
    "status" {
        $state = if (Test-Path $revocationPath) { "revoked" } else { "active" }

        [ordered]@{
            node_id = $NodeId
            lifecycle_state = $state
            capacity_verified = $enrollment.capacity_verified
            platform = $enrollment.platform
            partition = $enrollment.partition
            centrally_assignable = $state -eq "active"
            ok = $true
        } | ConvertTo-Json -Depth 10
    }

    "revoke" {
        if (Test-Path $revocationPath) {
            throw "Node is already revoked."
        }

        $revocation = [ordered]@{
            schema_version = "1.0"
            service = "SKYGRID Emergency Data On-Ramp"
            mode = "controlled_pilot"
            event_type = "node_revocation"
            node_id = $NodeId
            prior_state = "active"
            lifecycle_state = "revoked"
            centrally_assignable = $false
            heartbeat_status = "disabled"
            revoked_at = (Get-Date).ToString("o")
            revocation_reason = "control-center command"
            enrollment_receipt = Split-Path $enrollmentPath -Leaf
            enrollment_sha256 = (Get-FileHash $enrollmentPath -Algorithm SHA256).Hash
            ok = $true
        }

        [System.IO.File]::WriteAllText(
            $revocationPath,
            ($revocation | ConvertTo-Json -Depth 10),
            [System.Text.UTF8Encoding]::new($false)
        )

        $revocation | ConvertTo-Json -Depth 10
    }

    "assign" {
        if (Test-Path $revocationPath) {
            [ordered]@{
                schema_version = "1.0"
                service = "SKYGRID Emergency Data On-Ramp"
                mode = "controlled_pilot"
                event_type = "workload_assignment_rejection"
                node_id = $NodeId
                requested_partition = $Partition
                assignment_accepted = $false
                reason = "node_revoked"
                workload_executed = $false
                evaluated_at = (Get-Date).ToString("o")
                ok = $true
            } | ConvertTo-Json -Depth 10

            exit 2
        }

        [ordered]@{
            schema_version = "1.0"
            service = "SKYGRID Emergency Data On-Ramp"
            mode = "controlled_pilot"
            event_type = "workload_assignment"
            node_id = $NodeId
            requested_partition = $Partition
            assignment_accepted = $true
            workload_type = "diagnostic_sha256"
            production = $false
            assigned_at = (Get-Date).ToString("o")
            ok = $true
        } | ConvertTo-Json -Depth 10
    }
}