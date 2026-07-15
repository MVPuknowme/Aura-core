import { createHash } from "node:crypto";
import { readdir, readFile, stat, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";

const evidenceRoot = process.argv[2] || "evidence/deployment-broker";
const outputPath = process.argv[3] || "evidence/pilot/skygrid-controlled-pilot-manifest.json";
const excluded = new Set([
  "newman-deployment-broker-results.json",
  "newman-console-output.txt"
]);

async function collect(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "ledger") continue;
      files.push(...await collect(absolute));
    } else if (!excluded.has(entry.name) && entry.name.endsWith(".json")) {
      files.push(absolute);
    }
  }
  return files;
}

const files = await collect(evidenceRoot);
const artifacts = [];
for (const file of files.sort()) {
  const raw = await readFile(file);
  let parsed = null;
  try { parsed = JSON.parse(raw.toString("utf8")); } catch {}
  const details = await stat(file);
  artifacts.push({
    path: file.replaceAll("\\", "/"),
    sha256: createHash("sha256").update(raw).digest("hex").toUpperCase(),
    bytes: details.size,
    event_type: parsed?.event_type || null,
    ok: parsed?.ok ?? null,
    token_redacted: parsed?.token_redacted ?? parsed?.raw_token_excluded ?? parsed?.raw_tokens_excluded_from_receipt ?? null
  });
}

let commit = null;
try { commit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(); } catch {}

const manifest = {
  schema_version: "1.0",
  service: "SKYGRID Emergency Data On-Ramp",
  component: "controlled_pilot_evidence",
  event_type: "controlled_pilot_manifest_built",
  source_commit: commit,
  artifact_count: artifacts.length,
  artifacts,
  exclusions: [
    "raw Newman execution reports",
    "console logs",
    "ledger records",
    "admin keys",
    "enrollment tokens"
  ],
  generated_at: new Date().toISOString(),
  ok: artifacts.length > 0 && artifacts.every((artifact) => artifact.ok !== false)
};

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(JSON.stringify(manifest, null, 2));
if (!manifest.ok) process.exitCode = 1;
