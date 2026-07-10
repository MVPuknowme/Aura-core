function Invoke-AuraSelfCommit {
    param([string]$Message = "Aura checkpoint")

    $changes = git status --short
    if (-not $changes) {
        return "No changes to commit."
    }

    git add .
    git commit -m $Message
    return "Aura committed local changes. Push still requires human confirmation."
}

function Invoke-AuraCommand {
    param([Parameter(Mandatory=$true)][string]$InputText)

    $text = $InputText.ToLower().Trim()

    $intent = @{
        raw_input = $InputText
        intent    = "unknown"
        action    = $null
        target    = $null
        command   = $null
        response  = "I do not recognize that command yet."
        safe      = $true
    }

    switch -Regex ($text) {
        "commit|save changes|self commit|checkpoint" {
            $intent.intent   = "self_commit"
            $intent.action   = "commit"
            $intent.target   = "local git repository"
            $intent.command  = 'Invoke-AuraSelfCommit -Message "Aura checkpoint: translated command update"'
            $intent.response = "Creating a local git checkpoint."
            break
        }

        "git status|repo status|working tree" {
            $intent.intent   = "git_status"
            $intent.action   = "inspect"
            $intent.target   = "repository"
            $intent.command  = "git status"
            $intent.response = "Checking repository working tree."
            break
        }
    }

    return $intent | ConvertTo-Json -Depth 5
}
