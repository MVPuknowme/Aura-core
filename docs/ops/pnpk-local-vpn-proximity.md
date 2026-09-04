# PNPK Local VPN Proximity Profile

Status: local-only, VPN-gated, receipt-first, fail-closed.

This profile maps the requested `pnpk 3 miles R sq` posture into a safe local/devcontainer proof. It does **not** scan networks, discover devices, track people, collect GPS, mutate cloud resources, touch Vercel, delete secrets, or move funds.

## Meaning of `3 miles R sq`

The default proximity envelope is:

- radius: `3` miles
- R² metric: `9`
- radius-square side: `6` miles
- bounding-box area: `36` square miles

This is a declared operating envelope for local proof, not a live geolocation or surveillance function.

## Dry-run

```powershell
./scripts/Invoke-PnpkLocalVpnProximity.ps1
```

Equivalent Node command:

```powershell
$env:SKYGRID_LOCAL_VPN_CIDR = "127.0.0.1/32"
node scripts/pnpk-local-vpn-proximity-runner.mjs --dry-run
```

## Apply receipt

Apply mode writes an approved receipt. It still performs no scanning and no cloud mutation.

```powershell
./scripts/Invoke-PnpkLocalVpnProximity.ps1 -Apply -Approved
```

Equivalent Node command:

```powershell
$env:SKYGRID_LOCAL_VPN_CIDR = "127.0.0.1/32"
node scripts/pnpk-local-vpn-proximity-runner.mjs --apply --approved
```

## Use a private VPN CIDR

```powershell
./scripts/Invoke-PnpkLocalVpnProximity.ps1 -VpnCidr "10.8.0.0/24" -AnchorLabel "mvp-local-vpn" -Apply -Approved
```

Allowed CIDR classes are loopback, RFC1918-style private IPv4 ranges, and local IPv6 ranges. Public CIDR input fails closed.

## Receipts

Receipts are written under:

```text
artifacts/pnpk/proximity/
```

Each receipt records radius, R², radius-square area, VPN CIDR class, blocked actions, and the boundary statement.

## Boundary

This is a local configuration/proof wrapper only. It does not replace VPN software, does not establish a tunnel, and does not inspect nearby devices. Use your VPN client/devcontainer runtime to provide the actual local network context, then run this tool to record the PNPK proximity proof.
