# SKYGRID Stop Test Set

Status: stop-first, local-only, receipt-first, fail-closed.

This test set turns the prior removal/proximity work into a controlled **stop posture**. It confirms that cleanup/removal behavior is not sent out to a network and remains controlled by the GitHub-tracked config, runner, test, and docs.

## What it means

- `found` does not mean `broadcast`.
- `remove` does not mean `remote delete`.
- `network` does not mean public scan, device discovery, Wi-Fi probe, Bluetooth probe, GPS collection, or webhook emission.
- GitHub remains the versioned control plane for operator-approved changes.

## Safe default

Dry-run verifies the stop posture and writes a local receipt:

```powershell
./scripts/Invoke-SkygridStopTestSet.ps1
```

Equivalent Node command:

```powershell
node scripts/skygrid-stop-test-set.mjs --dry-run
```

## Approved apply receipt

Apply mode writes an approved stop receipt. It still performs no network transmission, no device removal, no cloud teardown, no DNS mutation, no secret deletion, and no payment-rail mutation.

```powershell
./scripts/Invoke-SkygridStopTestSet.ps1 -Apply -Approved
```

Equivalent Node command:

```powershell
node scripts/skygrid-stop-test-set.mjs --apply --approved
```

## Test command

```powershell
node --test tests/skygrid-stop-test-set.test.mjs
```

## Blocked actions

The stop set fails closed unless these categories remain blocked:

- sending or broadcasting removal payloads
- public IP scanning
- device discovery
- person tracking
- Wi-Fi, Bluetooth, or GPS probing
- remote deletes
- cloud teardown
- DNS mutation
- secret deletion
- payment-rail mutation
- Vercel teardown
- external webhooks

## Boundary

This is a local stop/control proof only. It does not remove external resources or devices. It does not push instructions to nearby networks. It does not replace VPN, endpoint management, MDM, EDR, or cloud provider controls. Use it as the repo-side guardrail before any operator decides what to do manually in an external console.
