import { createHash } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const DEFAULT_PNPK_PATH = "bridge/skygrid-emergency-onramp.pnpk";
const CANDIDATE_DIRECTORIES = ["target/deploy", "dist/solana"];

function assertSafeSolanaPolicy(pnpk) {
  const platform = pnpk.platforms?.solana_playground;
  const partition = pnpk.partitions?.solana_playground;

  if (
    !platform?.enabled ||
    platform.cluster !== "devnet" ||
    platform.execution_mode !== "artifact_and_policy_validation_only" ||
    platform.wallet_signing_allowed !== false ||
    platform.transaction_broadcast_allowed !== false ||
    platform.program_deployment_allowed !== false
  ) {
    throw new Error("Solana Playground platform policy is unsafe or incomplete");
  }
  if (
    partition?.mode !== "preflight_only" ||
    partition?.sentinel !== "fail_closed" ||
    partition?.wallet_signing_allowed !== false ||
    partition?.transaction_broadcast_allowed !== false ||
    partition?.program_deployment_allowed !== false
  ) {
    throw new Error("Solana Playground partition must remain fail-closed preflight-only");
  }

  return platform;
}

function insideRoot(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative && !relative.startsWith("..") && !path.isAbsolute(relative);
}

async function discoverArtifact(root, explicitPath = "") {
  if (explicitPath) {
    const resolved = path.resolve(root, explicitPath);
    if (!insideRoot(root, resolved) || path.extname(resolved) !== ".so") {
      throw new Error("Solana artifact must be a .so file inside the repository");
    }
    const fileStat = await stat(resolved);
    if (!fileStat.isFile()) throw new Error("Solana artifact path is not a file");
    return resolved;
  }

  for (const directory of CANDIDATE_DIRECTORIES) {
    const absoluteDirectory = path.join(root, directory);
    try {
      const entries = await readdir(absoluteDirectory, { withFileTypes: true });
      const match = entries.find((entry) => entry.isFile() && entry.name.endsWith(".so"));
      if (match) return path.join(absoluteDirectory, match.name);
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
  return null;
}

async function hashArtifact(file) {
  if (!file) return null;
  const bytes = await readFile(file);
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

export async function verifySolanaPlaygroundPreflight(
  pnpk,
  {
    root = process.cwd(),
    artifactPath = process.env.PNPK_SOLANA_BUILD_ARTIFACT || ""
  } = {}
) {
  const platform = assertSafeSolanaPolicy(pnpk);
  const artifact = await discoverArtifact(root, artifactPath);
  const artifactHash = await hashArtifact(artifact);

  return {
    ok: true,
    service: pnpk.service,
    mode: pnpk.mode,
    sentinel: pnpk.sentinel,
    target: "solana_playground",
    cluster: platform.cluster,
    verification_scope: platform.execution_mode,
    artifact: {
      present: Boolean(artifact),
      path: artifact ? path.relative(root, artifact) : null,
      sha256: artifactHash,
      status: artifact ? "hashed_for_playground_preflight" : "artifact_pending"
    },
    playground_validation_ready: Boolean(artifact),
    deployment_ready: false,
    decision: artifact ? "artifact_verified_no_deploy" : "policy_verified_artifact_pending",
    guardrails: [
      "no_wallet_signing",
      "no_transaction_broadcast",
      "no_program_deployment"
    ]
  };
}

async function main() {
  const pnpkPath = process.env.PNPK_PATH || DEFAULT_PNPK_PATH;
  try {
    const pnpk = JSON.parse(await readFile(pnpkPath, "utf8"));
    const report = await verifySolanaPlaygroundPreflight(pnpk);
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    console.error(JSON.stringify({
      ok: false,
      decision: "fail_closed",
      reason: String(error?.message || error)
    }, null, 2));
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
