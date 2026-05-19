# SKYGRID / Aura-Core Local Security Audit

Defensive local audit toolkit for checking a personal development device for risky Node/NPM, GitHub, AWS, SSH, process, and scheduled-job signals.

The audit is intentionally **redaction-first**. It detects secret locations and risky patterns without printing raw secrets into terminal output.

## What it checks

- `~/.npmrc` presence and redacted token references
- Node and NPM versions
- Global NPM packages
- Local `package.json` files under the home directory
- Package lifecycle scripts such as `preinstall`, `install`, `postinstall`, `prepare`, `prepack`, and `postpack`
- Global Git config with redaction
- Git repositories under the home directory
- AWS config and credentials metadata with redacted values
- SSH key candidates, fingerprints, and file permissions
- Running Node/NPM/NPX processes
- User crontab
- macOS `launchctl` user services when available
- Redacted environment variables
- Listening TCP ports when `lsof` or `ss` is available

## Install / run locally

From the repo root:

```bash
chmod +x tools/security-audit/skygrid-security-audit.sh
tools/security-audit/skygrid-security-audit.sh
```

Or copy to a personal device:

```bash
mkdir -p ~/skygrid-security-audit
cp tools/security-audit/skygrid-security-audit.sh ~/skygrid-security-audit/
chmod +x ~/skygrid-security-audit/skygrid-security-audit.sh
~/skygrid-security-audit/skygrid-security-audit.sh
```

## Output

Reports are written to:

```text
~/skygrid-security-audit/reports/<timestamp>/
```

Main files:

```text
summary.md          Human-readable audit summary
findings.jsonl      Machine-readable findings
raw/                Redacted raw command outputs
```

A compressed bundle is also generated:

```text
~/skygrid-security-audit/skygrid-security-audit-<timestamp>.tar.gz
```

## Safety rules

- Do not paste raw `~/.npmrc`, `~/.aws/credentials`, private SSH keys, or environment dumps into chats or tickets.
- Share `summary.md` first.
- If a token appears in any non-redacted context, rotate it immediately.
- Review package lifecycle scripts before running `npm install`, `npm ci`, or `npx`.
- Keep SSH private keys at `chmod 600` or `chmod 400`.

## Useful environment options

Limit scan depth:

```bash
MAX_FIND_DEPTH=4 tools/security-audit/skygrid-security-audit.sh
```

Change output root:

```bash
SKYGRID_AUDIT_ROOT=/tmp/skygrid-security-audit tools/security-audit/skygrid-security-audit.sh
```

## Interpreting findings

Severity guide:

- `high`: token-like credential reference or likely exposure point
- `medium`: persistence, lifecycle script, credentials file, broad SSH permissions, or suspicious environment signal
- `low`: informational hardening recommendation

This tool does not prove compromise by itself. It produces a local evidence packet for review and cleanup.
