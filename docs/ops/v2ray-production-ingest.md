# SKYGRID V2Ray Production Ingest

Status: production read-only ingest, receipt-first, fail-closed.

This integration consumes the public `barry-far/V2ray-Config` subscription feed as **untrusted network data**. It validates structure and protocol schemes, computes a SHA-256 digest, and emits a PNPK-style receipt. It does not connect to any listed proxy node.

## Production boundary

The scheduled workflow runs every 15 minutes with `contents: read` only. No repository write permission, deployment credential, wallet capability, or cloud secret is required.

The ingest explicitly blocks authority for:

- proxy activation
- OS route or DNS changes
- device discovery, Wi-Fi probing, or Bluetooth probing
- wallet signing or transaction broadcasting
- private-data movement

A feed containing an unsupported or malformed URI scheme fails closed. Receipts contain aggregate counts and hashes, not proxy credentials or raw endpoint URIs.

## Commands

Validate a checked-out feed locally:

```powershell
node scripts/skygrid-v2ray-ingest.mjs --file=All_Configs_Sub.txt
```

Run the production allowlisted fetch:

```powershell
node scripts/skygrid-v2ray-ingest.mjs
```

Receipt path:

```text
artifacts/pnpk/v2ray/skygrid-v2ray-ingest-receipt.json
```

## Promotion rule

Passing this ingest gate means the public feed was syntactically accepted at the recorded digest. It does **not** mean the listed nodes are trustworthy, reachable, authorized for sensitive traffic, or approved as SKYGRID transport. Any future node activation requires a separate authorization and network-safety gate.
