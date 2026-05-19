#!/usr/bin/env bash
set -Eeuo pipefail

# SKYGRID / Aura-Core Local Security Audit
# Defensive local audit only. This script redacts secrets by default.
# It writes reports under ~/skygrid-security-audit/reports/<timestamp>/

VERSION="1.0.0"
AUDIT_ROOT="${SKYGRID_AUDIT_ROOT:-$HOME/skygrid-security-audit}"
RUN_ID="$(date -u +%Y%m%dT%H%M%SZ)"
OUT_DIR="$AUDIT_ROOT/reports/$RUN_ID"
SUMMARY="$OUT_DIR/summary.md"
FINDINGS_JSONL="$OUT_DIR/findings.jsonl"
RAW_DIR="$OUT_DIR/raw"
MAX_FIND_DEPTH="${MAX_FIND_DEPTH:-5}"

mkdir -p "$OUT_DIR" "$RAW_DIR"
chmod 700 "$AUDIT_ROOT" "$OUT_DIR" "$RAW_DIR" 2>/dev/null || true

redact() {
  sed -E \
    -e 's#(//[^[:space:]]+:_authToken=)[^[:space:]]+#\1[REDACTED]#g' \
    -e 's#(_authToken=)[^[:space:]]+#\1[REDACTED]#g' \
    -e 's#(authToken[=:][[:space:]]*)[^[:space:]]+#\1[REDACTED]#Ig' \
    -e 's#(token[=:][[:space:]]*)[A-Za-z0-9_./+=:-]{12,}#\1[REDACTED]#Ig' \
    -e 's#(password[=:][[:space:]]*)[^[:space:]]+#\1[REDACTED]#Ig' \
    -e 's#(secret[^=:/]*[=:][[:space:]]*)[A-Za-z0-9_./+=:-]{8,}#\1[REDACTED]#Ig' \
    -e 's#(AWS_SECRET_ACCESS_KEY[=:][[:space:]]*)[^[:space:]]+#\1[REDACTED]#g' \
    -e 's#(AWS_ACCESS_KEY_ID[=:][[:space:]]*)[A-Z0-9]{16,}#\1[REDACTED]#g' \
    -e 's#(gh[pousr]_[A-Za-z0-9_]{20,})#[GITHUB_TOKEN_REDACTED]#g' \
    -e 's#(npm_[A-Za-z0-9]{20,})#[NPM_TOKEN_REDACTED]#g' \
    -e 's#(xox[baprs]-[A-Za-z0-9-]{20,})#[SLACK_TOKEN_REDACTED]#g'
}

write_section() {
  local title="$1"
  printf '\n## %s\n\n' "$title" >> "$SUMMARY"
}

record_finding() {
  local severity="$1" category="$2" message="$3" evidence="${4:-}"
  printf '{"severity":"%s","category":"%s","message":"%s","evidence":"%s","timestamp":"%s"}\n' \
    "$severity" "$category" "$(printf '%s' "$message" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read())[1:-1])' 2>/dev/null || printf '%s' "$message")" \
    "$(printf '%s' "$evidence" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read())[1:-1])' 2>/dev/null || printf '%s' "$evidence")" \
    "$(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "$FINDINGS_JSONL"
}

run_cmd() {
  local name="$1"; shift
  local file="$RAW_DIR/$name.txt"
  {
    echo "$ $*"
    "$@" 2>&1 || true
  } | redact > "$file"
  echo "$file"
}

start_report() {
  cat > "$SUMMARY" <<EOF
# SKYGRID / Aura-Core Local Security Audit

- Version: $VERSION
- Run ID: $RUN_ID
- Host: $(hostname 2>/dev/null || echo unknown)
- User: $(id -un 2>/dev/null || echo unknown)
- Timestamp UTC: $(date -u +%Y-%m-%dT%H:%M:%SZ)
- Output directory: $OUT_DIR

> This audit is defensive and redacts secrets by default. Do not paste raw secret files into chats or tickets.
EOF
  : > "$FINDINGS_JSONL"
}

audit_npm() {
  write_section "NPM / Node"

  if [[ -f "$HOME/.npmrc" ]]; then
    redact < "$HOME/.npmrc" > "$RAW_DIR/npmrc.redacted.txt"
    echo "- Found ~/.npmrc. Redacted copy: raw/npmrc.redacted.txt" >> "$SUMMARY"
    if grep -qiE '_authToken|authToken|npm_' "$HOME/.npmrc"; then
      record_finding "high" "npm" "NPM auth token reference found in ~/.npmrc; rotate if exposure is suspected." "~/.npmrc"
    fi
  else
    echo "- No ~/.npmrc found." >> "$SUMMARY"
  fi

  run_cmd "npm-version" npm --version >/dev/null
  run_cmd "node-version" node --version >/dev/null
  run_cmd "npm-global-packages" npm list -g --depth=0 >/dev/null

  echo "- Node version: $(cat "$RAW_DIR/node-version.txt" | tail -n 1 || true)" >> "$SUMMARY"
  echo "- NPM version: $(cat "$RAW_DIR/npm-version.txt" | tail -n 1 || true)" >> "$SUMMARY"
  echo "- Global package list saved: raw/npm-global-packages.txt" >> "$SUMMARY"

  find "$HOME" -maxdepth "$MAX_FIND_DEPTH" \
    \( -path '*/node_modules/*' -o -path '*/.git/*' -o -path '*/Library/*' -o -path '*/.cache/*' \) -prune -o \
    -name package.json -type f -print 2>/dev/null | sort > "$RAW_DIR/package-json-files.txt"
  local pkg_count
  pkg_count=$(wc -l < "$RAW_DIR/package-json-files.txt" | tr -d ' ')
  echo "- package.json files found within depth $MAX_FIND_DEPTH: $pkg_count" >> "$SUMMARY"

  while IFS= read -r pkg; do
    if grep -qE '"(preinstall|install|postinstall|prepare|prepack|postpack)"[[:space:]]*:' "$pkg" 2>/dev/null; then
      printf '%s\n' "$pkg" >> "$RAW_DIR/package-install-script-files.txt"
      record_finding "medium" "npm-scripts" "Lifecycle install script found in package.json; review before npm install/ci." "$pkg"
    fi
  done < "$RAW_DIR/package-json-files.txt"

  if [[ -f "$RAW_DIR/package-install-script-files.txt" ]]; then
    echo "- Lifecycle install scripts detected. See raw/package-install-script-files.txt" >> "$SUMMARY"
  else
    echo "- No package lifecycle install scripts found in scanned depth." >> "$SUMMARY"
  fi
}

audit_git() {
  write_section "Git / GitHub"
  run_cmd "git-global-config" git config --global --list >/dev/null
  echo "- Global Git config saved: raw/git-global-config.txt" >> "$SUMMARY"

  if git config --global --list 2>/dev/null | grep -qiE 'token|password|oauth|credential'; then
    record_finding "medium" "git" "Global Git config contains credential-related entries; redacted report generated." "~/.gitconfig"
  fi

  find "$HOME" -maxdepth "$MAX_FIND_DEPTH" \
    \( -path '*/node_modules/*' -o -path '*/Library/*' -o -path '*/.cache/*' \) -prune -o \
    -name .git -type d -print 2>/dev/null | sort > "$RAW_DIR/git-repositories.txt"
  echo "- Git repositories found within depth $MAX_FIND_DEPTH: $(wc -l < "$RAW_DIR/git-repositories.txt" | tr -d ' ')" >> "$SUMMARY"
}

audit_aws() {
  write_section "AWS Credentials / Config"
  mkdir -p "$RAW_DIR/aws"

  if [[ -d "$HOME/.aws" ]]; then
    ls -la "$HOME/.aws" 2>&1 | redact > "$RAW_DIR/aws/listing.txt" || true
    echo "- ~/.aws directory found. Listing saved: raw/aws/listing.txt" >> "$SUMMARY"

    for f in credentials config; do
      if [[ -f "$HOME/.aws/$f" ]]; then
        awk 'BEGIN{p=""} /^\[/{p=$0; print p; next} /aws_access_key_id/{print "aws_access_key_id=[REDACTED]"; next} /aws_secret_access_key/{print "aws_secret_access_key=[REDACTED]"; next} /aws_session_token/{print "aws_session_token=[REDACTED]"; next} {print}' "$HOME/.aws/$f" > "$RAW_DIR/aws/$f.redacted.txt"
        record_finding "medium" "aws" "AWS $f file exists; confirm profiles are still needed and rotate if exposure is suspected." "~/.aws/$f"
      fi
    done

    if command -v aws >/dev/null 2>&1; then
      run_cmd "aws-configure-list" aws configure list >/dev/null
      run_cmd "aws-profiles" aws configure list-profiles >/dev/null
      echo "- AWS CLI profile metadata saved." >> "$SUMMARY"
    else
      echo "- AWS CLI not installed or not in PATH." >> "$SUMMARY"
    fi
  else
    echo "- No ~/.aws directory found." >> "$SUMMARY"
  fi
}

audit_ssh() {
  write_section "SSH Keys"
  mkdir -p "$RAW_DIR/ssh"
  if [[ -d "$HOME/.ssh" ]]; then
    ls -la "$HOME/.ssh" 2>&1 | redact > "$RAW_DIR/ssh/listing.txt" || true
    echo "- ~/.ssh directory found. Listing saved: raw/ssh/listing.txt" >> "$SUMMARY"

    find "$HOME/.ssh" -maxdepth 1 -type f ! -name '*.pub' ! -name 'known_hosts*' ! -name 'config' -print 2>/dev/null | sort > "$RAW_DIR/ssh/private-key-candidates.txt"
    while IFS= read -r key; do
      [[ -z "$key" ]] && continue
      perms=$(stat -c '%a' "$key" 2>/dev/null || stat -f '%Lp' "$key" 2>/dev/null || echo unknown)
      fp=$(ssh-keygen -lf "$key" 2>/dev/null | redact || echo "fingerprint unavailable")
      printf '%s | perms=%s | %s\n' "$key" "$perms" "$fp" >> "$RAW_DIR/ssh/key-fingerprints.txt"
      if [[ "$perms" != "600" && "$perms" != "400" ]]; then
        record_finding "medium" "ssh" "SSH private key permissions are broader than recommended 600/400." "$key perms=$perms"
      fi
    done < "$RAW_DIR/ssh/private-key-candidates.txt"
    echo "- SSH key metadata saved: raw/ssh/key-fingerprints.txt" >> "$SUMMARY"
  else
    echo "- No ~/.ssh directory found." >> "$SUMMARY"
  fi
}

audit_processes_and_jobs() {
  write_section "Running Processes / Scheduled Jobs"
  run_cmd "node-processes" bash -lc "ps aux | grep -E '[n]ode|[n]pm|[n]px'" >/dev/null
  echo "- Node/NPM process snapshot saved: raw/node-processes.txt" >> "$SUMMARY"

  if crontab -l >/tmp/skygrid_cron.$$ 2>/dev/null; then
    redact < /tmp/skygrid_cron.$$ > "$RAW_DIR/crontab.txt"
    rm -f /tmp/skygrid_cron.$$
    echo "- User crontab saved: raw/crontab.txt" >> "$SUMMARY"
    if grep -qiE 'curl|wget|node|npm|npx|bash|sh|python|base64' "$RAW_DIR/crontab.txt"; then
      record_finding "medium" "cron" "Cron contains executable/network command patterns; review for persistence or unexpected jobs." "raw/crontab.txt"
    fi
  else
    echo "- No user crontab found or access denied." >> "$SUMMARY"
  fi

  if command -v launchctl >/dev/null 2>&1; then
    run_cmd "launchctl-user-services" launchctl list >/dev/null
    echo "- macOS launchctl user service list saved." >> "$SUMMARY"
  fi
}

audit_env_and_network() {
  write_section "Environment / Network Snapshot"
  env | sort | redact > "$RAW_DIR/environment.redacted.txt"
  echo "- Redacted environment saved: raw/environment.redacted.txt" >> "$SUMMARY"
  if env | grep -qiE 'TOKEN|SECRET|PASSWORD|AWS_|GITHUB|NPM'; then
    record_finding "medium" "environment" "Secret-like environment variables are present; redacted report generated." "raw/environment.redacted.txt"
  fi

  if command -v lsof >/dev/null 2>&1; then
    run_cmd "listening-ports" bash -lc "lsof -nP -iTCP -sTCP:LISTEN" >/dev/null
    echo "- Listening TCP ports saved: raw/listening-ports.txt" >> "$SUMMARY"
  elif command -v ss >/dev/null 2>&1; then
    run_cmd "listening-ports" ss -tulpn >/dev/null
    echo "- Listening ports saved: raw/listening-ports.txt" >> "$SUMMARY"
  else
    echo "- No lsof or ss available for port snapshot." >> "$SUMMARY"
  fi
}

finalize_report() {
  write_section "Findings Summary"
  if [[ -s "$FINDINGS_JSONL" ]]; then
    awk -F'"' '/"severity"/{count[$4]++} END{for (s in count) print "- " s ": " count[s]}' "$FINDINGS_JSONL" >> "$SUMMARY"
    echo "" >> "$SUMMARY"
    echo "Detailed findings: findings.jsonl" >> "$SUMMARY"
  else
    echo "- No findings generated by these checks." >> "$SUMMARY"
  fi

  write_section "Recommended Immediate Actions"
  cat >> "$SUMMARY" <<'EOF'
1. If any token file was unexpectedly present, rotate that token from the provider dashboard.
2. Review package lifecycle scripts before running `npm install`, `npm ci`, or `npx` in unknown repos.
3. Keep private SSH keys at chmod 600 or 400.
4. Remove unused AWS profiles and prefer short-lived SSO/session credentials where possible.
5. Review cron/launchctl jobs for unexpected persistence.
6. Do not share raw reports publicly; share `summary.md` and redacted files only.
EOF

  tar -czf "$AUDIT_ROOT/skygrid-security-audit-$RUN_ID.tar.gz" -C "$OUT_DIR" . 2>/dev/null || true

  echo ""
  echo "SKYGRID security audit complete."
  echo "Report: $SUMMARY"
  echo "Findings: $FINDINGS_JSONL"
  echo "Bundle: $AUDIT_ROOT/skygrid-security-audit-$RUN_ID.tar.gz"
}

main() {
  start_report
  audit_npm
  audit_git
  audit_aws
  audit_ssh
  audit_processes_and_jobs
  audit_env_and_network
  finalize_report
}

main "$@"
