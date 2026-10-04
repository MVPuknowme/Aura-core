# SKYGRID Privacy-by-Default Development Policy

## Purpose

Security evidence, identity data, financial metadata, receipts, network telemetry, certificates, and other sensitive artifacts are private by default.

## Development boundary

- Keep sensitive working copies outside the Git worktree.
- The dev container uses a private Docker volume at `/home/vscode/.skygrid-private`.
- Do not print raw evidence, secrets, credentials, wallet data, receipt contents, IP histories, or personally identifiable information to stdout/stderr.
- Do not commit evidence folders, credentials, secrets, private keys, or environment files.
- Keep the canonical evidence copy in encrypted private storage with integrity hashes; the dev-container copy is a working copy, not the sole source of truth.
- No automatic external upload, bounty submission, public posting, or third-party disclosure.

## Disclosure boundary

External disclosure requires an explicit authorization gate and a defined destination and purpose.

Permitted purposes:

1. user-requested export;
2. authorized security disclosure;
3. response to a valid legal requirement.

The system must not volunteer private material to government agencies or other third parties without user authorization, except where disclosure is required by applicable law or valid legal process.

## Logging

Application code should construct minimal audit records rather than emit raw objects. Logging is disabled by default for security-sensitive workflows. If explicitly enabled, only allowlisted operational metadata may be emitted.

## Evidence integrity

- Raw evidence is immutable.
- Derivations and analysis are stored separately.
- Record hashes for preserved artifacts when practical.
- Preserve timestamps and provenance.
- Never treat a development working copy as authoritative when the encrypted canonical artifact exists.
