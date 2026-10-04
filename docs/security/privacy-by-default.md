# SKYGRID privacy-by-default evidence handling

## Purpose

Security evidence, personal data, network metadata, credentials, and incident artifacts are private by default.

The implementation must minimize collection, avoid accidental logging, and fail closed on export.

## Storage model

The canonical evidence source should be encrypted and access-controlled.

A dev container may receive an ephemeral working copy for analysis. The dev container is not the sole evidence archive and should not be treated as durable storage.

The strict privacy dev container runs without network access and uses an ephemeral `/workspaces/private-evidence` tmpfs mount.

## Logging

Sensitive evidence must not be printed to stdout, application logs, CI logs, or debugging output.

Audit events should record only operational metadata needed to prove that a review occurred, such as event name, timestamp, record count, and status.

## Export boundary

Exports fail closed by default.

User-directed exports and authorized security disclosures require explicit operator approval and a defined destination.

A required legal response is a separate path. The requirement and recipient must be verified, the scope must be minimized, and unrelated data must not be included.

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
