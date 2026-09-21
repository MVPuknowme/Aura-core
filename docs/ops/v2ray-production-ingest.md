# SKYGRID V2Ray Production Ingest

Status: pinned-snapshot read-only ingest, receipt-first, fail-closed.

## Recovery from upstream feed corruption

The default source is the immutable upstream revision
`8a01d90f48a5432b174c714efbc3181903ecf578` (committed September 20, 2026,
15:30:12 UTC), containing 7,617 scheme-accepted entries. Its required SHA-256 is
`abea0ee15ae8e6c7f94ecf6cbc98a02ec7f143a1b0be157ae215d169bcf60936`.
The retrieved tracking feed contained binary-like data after its five metadata
headers. Changing routes cannot repair those bytes. No malformed records are
skipped or converted into accepted entries.

Each scheduled run revalidates this same snapshot; a passing run does **not**
prove the latest upstream feed is healthy or that these proxy nodes still work.
Receipts label the source `pinned_snapshot` and include its revision and original
commit time, separately from the receipt creation time. A digest mismatch fails
before any success receipt is written. There is no automatic fallback.

To promote a newer snapshot, validate the complete candidate feed, review its
origin and counts, and update the revision, digest, commit time, and this document
together in a PR. Only the reviewed revision is allowlisted, not arbitrary SHAs.
The existing `main`/`master` source options remain available explicitly for
diagnosis; their receipts are labeled `tracking_branch` and malformed input
still fails closed:

```powershell
node scripts/skygrid-v2ray-ingest.mjs --source=https://raw.githubusercontent.com/barry-far/V2ray-Config/main/All_Configs_Sub.txt
```

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
