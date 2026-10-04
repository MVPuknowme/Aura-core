# SKYGRID privacy-by-default evidence handling

## Purpose

Security evidence, personal data, network metadata, credentials, and incident artifacts are private by default.

The implementation must minimize collection, avoid accidental logging, and fail closed on export.

## Storage model

The canonical evidence source should be encrypted and access-controlled.

A dev container may receive an ephemeral working copy for analysis. The dev container is not the sole evidence archive and should not be treated as durable storage.

The strict privacy dev container runs without network access and uses an ephemeral `/workspaces/private-evidence` tmpfs mount.

The mount starts with mode `0700`. On every start, the privileged lifecycle command
sets ownership to the explicit `node` remote user and enforces mode `0700` before
checking write access. Stop/start discards the working copy; initialization must
also succeed after a restart.

VS Code telemetry is configured with `telemetry.telemetryLevel: off`. Use a clean
VS Code profile with that user setting already applied before opening evidence.
The image's inherited ESLint extension is explicitly removed. Other inherited/local extensions
can have independent telemetry: disable them for evidence review, or verify each
extension's telemetry controls first. Container network isolation does not isolate
the host editor, and policy environment variables do not enforce application logging.

## Logging

Sensitive evidence must not be printed to stdout, application logs, CI logs, or debugging output.

Audit events should record only operational metadata needed to prove that a review occurred, such as event name, timestamp, record count, and status.

## Export boundary

Exports fail closed by default.

User-directed exports and authorized security disclosures require explicit operator approval and a defined destination.

A required legal response is a separate path. The requirement and recipient must be verified, the scope must be minimized, and unrelated data must not be included.

`mayExport` requires literal `true` values for `legalRequirementVerified`,
`recipientVerified`, and `scopeMinimized` on that path. These are caller attestations,
not automatic legal or recipient validation; the trusted caller must bind its
verification to the actual destination and selected evidence. Destinations must be
nonblank strings without control characters. This gate does not transmit evidence.

The existing `lib/security/privacy-boundary.mjs` delegates to this shared gate,
while retaining its additional operator approval and legal-basis requirements.
Its audit emission remains disabled by default and re-sanitizes enabled output.
The general development profile uses a separate persistent working volume at
`/home/vscode/.skygrid-private`; select `.devcontainer/privacy/devcontainer.json`
for strict offline ephemeral evidence review.

Audit events are limited to `evidence.review`, `export.allowed`, and `export.denied`;
statuses are limited to `ok`, `denied`, and `error`. Other values become `unknown`.
Counts must be nonnegative safe integers. Redaction returns only `[REDACTED]`,
including for structured values, so keys and secret fragments are not retained.

The system does not voluntarily submit private information to a government agency or other third party without user direction.

## Repository boundary

Do not commit raw evidence, private keys, certificate private material, environment files, credentials, or other sensitive artifacts.

Tracked repository files may define policy, schemas, tests, sanitized examples, and hashes that do not reveal the underlying private evidence.

## Review checklist

- Private by default.
- Telemetry disabled for evidence analysis.
- No sensitive stdout or debug logging.
- No secret material in Git.
- Ephemeral dev-container working copy.
- No network in strict evidence-analysis mode.
- Explicit approval before user-directed export.
- Verified and minimized handling for a valid legal requirement.
- Raw evidence remains immutable.

## Required approval checks

- `Privacy Evidence Boundary / privacy-tests`: run `npm run privacy:test` on Node 24,
  covering all export gates, invalid destinations, audit fields, complete redaction,
  ignore patterns, and devcontainer configuration.
- `Privacy Evidence Boundary / privacy-devcontainer-smoke`: create the actual
  privacy configuration, verify the remote user is `node`, tmpfs ownership/mode
  is `node:node:700`, writes succeed as `node`, and `nobody` has no read/write access;
  verify no default network route and run the same privacy tests offline.
- Restart the privacy container, reopen it through the Dev Containers lifecycle,
  and repeat the ownership, access, tmpfs, and network checks before introducing
  evidence. Confirm the host editor's effective telemetry setting is `off` and
  independent extensions are disabled or verified. Static tests cannot prove this.
- Resolve the PR's merge conflicts and require passing repository checks on the
  resulting head. Review all eight findings against that head before approval.

Ignore rules prevent accidental additions of untracked files, not forced additions
or leaks from files already tracked. Review the staged diff before committing.
