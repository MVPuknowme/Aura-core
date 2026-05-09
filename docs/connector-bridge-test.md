# Aura-Core Connector Bridge Test

## Purpose

This document defines a safe bridge pattern for testing AI-assisted network hops between ChatGPT connectors, GitHub Actions, Airtable, Linear-style task routing, and future Aura-Core/SkyGrid automation.

The immediate lesson from the Airtable failure:

- ChatGPT can access Airtable through the ChatGPT connector.
- GitHub Actions cannot automatically inherit that connector access.
- GitHub Actions needs its own explicit route through repository secrets, variables, or a dedicated service token.

This makes the Airtable sync failure a useful test case for the Aura-Core bridge model.

## Bridge Model

```text
Operator intent
  -> ChatGPT connector circle
  -> Planning / routing docs / issue creation
  -> GitHub repository state
  -> GitHub Actions runner
  -> External API token from GitHub Secrets
  -> Airtable / Linear / other system
  -> Status proof back to GitHub
```

## Boundary Rule

A connector available inside ChatGPT is not automatically available inside GitHub, Vercel, Linear, Airtable automations, or any other runner.

Every runner needs its own explicit authentication path.

## Safe Hop Pattern

Each hop should declare:

1. Source system
2. Destination system
3. Credential source
4. Allowed actions
5. Failure mode
6. Proof artifact

Example:

| Hop | Source | Destination | Credential | Allowed Action | Proof |
|---|---|---|---|---|---|
| ChatGPT to Airtable | ChatGPT connector | Airtable | ChatGPT app connection | Read schema, create records | Airtable record ID |
| GitHub to Airtable | GitHub Actions | Airtable API | GitHub secret `AIRTABLE_API_KEY` | Read/write configured tables | Workflow log + artifact |
| ChatGPT to GitHub | GitHub connector | GitHub repo | GitHub app installation | Create docs/issues/commits | Commit SHA / issue URL |
| GitHub to Vercel | GitHub commit status | Vercel deployment | Vercel integration | Build/deploy site | Vercel success status |

## Airtable Test Route

Known working base:

```text
Skygrid IT Project Tracker
appg4cfKNcNqOtOdd
```

Known tables:

```text
Projects
Tasks
Team Members
Milestones
Phenomena Log
```

Recommended workflow route:

```text
AIRTABLE_BASE_ID=appg4cfKNcNqOtOdd
AIRTABLE_TABLE=Projects
```

Required GitHub secret:

```text
AIRTABLE_API_KEY=<Airtable PAT stored only in GitHub Secrets>
```

## Test Criteria

The bridge is considered working when:

1. GitHub Actions receives non-empty Airtable config.
2. The workflow does not print secret values.
3. The workflow calls the configured Airtable table.
4. The workflow writes a small non-sensitive proof artifact, such as `airtable.json` or a sync summary.
5. GitHub reports a successful check.

## Failure Categories

| Failure | Meaning | Fix |
|---|---|---|
| `secrets.X => null` | GitHub secret missing or wrong scope | Add repository secret or environment binding |
| `HTTP 401` | Token invalid | Replace Airtable PAT |
| `HTTP 403` | Token lacks permission | Grant PAT access to base/table |
| `HTTP 404` | Base/table route wrong or hidden by token scope | Confirm base ID and table name |
| `command not found` | Build tool missing | Add dependency or change build command |

## Principle

Connectors are circles. Bridges are routes. Runners need credentials. Proof comes from logs, commits, records, and green checks.
