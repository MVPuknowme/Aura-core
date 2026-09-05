# CodeMirror preflight contract

`scripts/skygrid-codemirror-preflight.mjs` validates and receipts a bounded
CodeMirror change candidate. It is a preflight-only control: it does not write
candidate files, execute candidate content, deploy software, publish to a
transport, sign wallet data, move funds, or handle deployment credentials.

## Trust boundary

A successful result means only that the supplied intent matches this contract
and that its candidate metadata was normalized and hashed. The
`preflight_verified` decision is not deployment approval and must not be used as
authorization by a later RAKE or deployment stage.

Every success receipt preserves these denials:

```json
{
  "execution_allowed": false,
  "deployment_authorized": false,
  "transport_publish_allowed": false
}
```

Later stages must obtain their own explicit authority and must revalidate their
inputs. They cannot infer execution, deployment, publication, signing, payment,
or credential authority from a candidate ID, candidate hash, or preflight
receipt.

## Accepted intent

The input must be one JSON object with exactly these top-level fields:

```json
{
  "schema": "aura.deploy.intent.v1",
  "action": "prepare",
  "surface": "codemirror",
  "transport": "none",
  "files": [
    {
      "path": "apps/codemirror-console/src/editor.mjs",
      "content": "export const ready = true;\n"
    }
  ]
}
```

| Field | Accepted values |
|---|---|
| `schema` | `aura.deploy.intent.v1` |
| `action` | `verify` or `prepare`; `deploy` is rejected |
| `surface` | `codemirror` |
| `transport` | `none` or `t.me`; this labels the candidate and grants no publication authority |
| `files` | 1–50 objects containing only `path` and string `content` |

Unknown top-level or file fields fail closed. In particular, executable,
command, shell, credential, signing, payment, or deployment fields are not part
of the accepted schema.

## Candidate path and size rules

Paths are converted to forward slashes and normalized before comparison. The
preflight rejects traversal, absolute paths, Windows drive-absolute paths, NUL
bytes, duplicate normalized paths, environment files, and protected repository
areas such as `.git/`, `.github/`, `.vercel/`, and `node_modules/`.

Normalized paths must begin with one of these prefixes:

- `apps/codemirror-console/`
- `api/codemirror/`
- `scripts/skygrid-codemirror-`
- `tests/`

Each file is limited to 256 KiB of UTF-8 content. The complete candidate is
limited to 1 MiB and 50 files.

## Candidate identity

For each file, the preflight records the normalized path, UTF-8 byte length,
and SHA-256 content digest. Files are sorted by normalized path before the
candidate digest is computed.

The candidate digest binds the schema, surface, transport, and normalized file
metadata. The requested `action` is reported separately in the candidate and
receipt; it is not part of the candidate content digest. Consequently, neither
the digest nor `candidate_id` conveys action authority.

The preflight returns metadata and digests, not the original file contents.

## CLI behavior

Run the preflight against a JSON file from PowerShell:

```powershell
node scripts/skygrid-codemirror-preflight.mjs .\intent.json
```

The CLI writes one JSON result to standard output:

- exit code `0` when the intent is verified;
- exit code `1` when the file cannot be read or parsed, or any validation rule
  fails.

Failures return a machine-readable `fail_closed` receipt. File read and JSON
parse failures use the common `intent_file_invalid` reason and do not expose
filesystem or parser details.

## Verification

The contract test is:

```powershell
node --test tests/skygrid-codemirror-preflight.test.mjs
```

The `CodeMirror Preflight` GitHub Actions workflow runs this command under Node
24 on both Ubuntu and Windows. This verification covers preflight behavior
only; it does not validate or authorize a later deployment stage.

## Deferred work

RAKE execution, production deployment, transport publication, wallet signing,
payment execution, private-data movement, and deployment credential handling
are deliberately outside this contract. Adding any of them requires a separate
design, implementation, review, and authorization boundary.
