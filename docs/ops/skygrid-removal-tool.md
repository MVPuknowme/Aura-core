# SKYGRID Removal Tool

Status: local/devcontainer-first, receipt-first, fail-closed.

This tool remaps deployment design edges into explicit removal targets. It is intended for cleaning platform coupling from the repo without touching live cloud resources, secrets, billing settings, DNS, or payment rails.

## What it removes or verifies

- Vercel public-route rewrites that should not own local or devcontainer proof.
- Vercel automation-bypass header dependency from smoke-test logic.
- CI posture that keeps remote public domains and Vercel disabled unless an operator explicitly opts in.
- App-local Vercel config only through a guarded, explicit delete path.

## Safe default

The default run is a dry-run plan:

```powershell
./scripts/Invoke-SkygridRemovalTool.ps1
```

Equivalent Node command:

```powershell
node scripts/skygrid-removal-tool.mjs --dry-run
```

## Apply a safe target

```powershell
./scripts/Invoke-SkygridRemovalTool.ps1 -Target vercel-public-runtime-edge -Apply -Approved
```

Equivalent Node command:

```powershell
node scripts/skygrid-removal-tool.mjs --target=vercel-public-runtime-edge --apply --approved
```

## Guarded delete path

The app-local Vercel config target is guarded and skipped by default. It requires a specific target, guarded-delete flag, apply mode, and approval:

```powershell
./scripts/Invoke-SkygridRemovalTool.ps1 -Target app-vercel-config-edge -Apply -Approved -IncludeGuardedDeletes
```

## Receipts

Every default run writes a JSON receipt under `artifacts/removal/`. Use `-NoReceipt` or `--no-receipt` only for disposable local checks.

## Boundary

This tool does not delete Vercel projects, remove GitHub integrations, mutate Vercel dashboard settings, rotate secrets, change DNS, or move money. Those remain external operator actions.
