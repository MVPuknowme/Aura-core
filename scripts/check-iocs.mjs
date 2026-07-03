#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const iocPath = path.join(root, "security", "iocs", "operation-saffron-first-vpn.iocs.json");

if (!fs.existsSync(iocPath)) {
  console.error("Missing IOC vault file:", iocPath);
  process.exit(2);
}

const iocs = JSON.parse(fs.readFileSync(iocPath, "utf8"));

const terms = [
  ...(iocs.domains || []),
  ...(iocs.defanged_domains || []),
  ...(iocs.emails || []),
  ...(iocs.defanged_emails || []),
  ...(iocs.accounts || []),
  ...(iocs.ips || [])
].filter(Boolean);

const approvedPaths = [
  "security/iocs/operation-saffron-first-vpn.iocs.json",
  "docs/security/operation-saffron-first-vpn.md",
  "docs/security/local-block-guidance-1vpns.md"
];

const allowedExact = new Set(approvedPaths.map((entry) => path.normalize(entry)));

const ignoredDirs = new Set([
  ".git",
  "node_modules",
  ".vercel",
  ".next",
  "dist",
  "build",
  "out",
  "coverage",
  "artifacts"
]);

const textExts = new Set([
  ".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx",
  ".json", ".md", ".txt", ".yml", ".yaml",
  ".env", ".example", ".ps1", ".sh", ".html",
  ".css", ".scss", ".csv", ".xml"
]);

function shouldSkip(filePath) {
  const rel = path.relative(root, filePath);
  const normalized = path.normalize(rel);

  if (allowedExact.has(normalized)) return true;

  const parts = normalized.split(path.sep);
  if (parts.some((part) => ignoredDirs.has(part))) return true;

  const base = path.basename(filePath);
  if (base === "check-iocs.mjs") return true;

  const ext = path.extname(filePath);
  return ext && !textExts.has(ext);
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!ignoredDirs.has(entry.name)) walk(full, out);
    } else if (!shouldSkip(full)) {
      out.push(full);
    }
  }
  return out;
}

const findings = [];

for (const file of walk(root)) {
  let text;
  try {
    text = fs.readFileSync(file, "utf8");
  } catch {
    continue;
  }

  for (const term of terms) {
    if (text.includes(term)) {
      findings.push({
        file: path.relative(root, file),
        term
      });
    }
  }
}

if (findings.length) {
  console.error("\nSKYGRID IOC WATCH FAILED");
  console.error("The First VPN / 1VPNS IOC set appeared outside approved security vault paths.\n");

  for (const finding of findings) {
    console.error(`- ${finding.file} :: ${finding.term}`);
  }

  console.error("\nApproved paths:");
  for (const approvedPath of approvedPaths) {
    console.error(`- ${approvedPath}`);
  }

  console.error("\nReview before committing. If this is evidence, move it into the security vault or an approved security guidance file.");
  process.exit(1);
}

console.log("SKYGRID IOC WATCH PASSED — no First VPN / 1VPNS indicators outside approved security paths.");
