/**
 * Guarded execution layer for SKYGRID vault-manager CLI installation.
 *
 * The caller supplies only canonical identifiers. Commands and argv are always
 * reconstructed from packages/vault/src/install.ts.
 */
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  buildInstallCommand,
  currentPlatform,
  type BackendId,
  resetInstallerCache,
  resolveAllowedInstallMethod,
} from "../../vault/src/install.js";

const DEFAULT_TIMEOUT_MS = 5 * 60_000;
const DEFAULT_AUDIT_PATH = ".skygrid/audit/vault-installs.jsonl";

export interface InstallRequest {
  readonly backendId: BackendId;
  readonly methodId: string;
  readonly requestedBy: "OWNER";
}

export interface InstallResult {
  readonly backendId: BackendId;
  readonly methodId: string;
  readonly platform: string;
  readonly executable: string;
  readonly commandHash: string;
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
}

export function isOperatorExecutionHost(): boolean {
  if (process.env.SKYGRID_VAULT_INSTALL_EXECUTION === "disabled") return false;
  if (process.env.CI === "true") return false;
  if (process.env.VERCEL === "1") return false;
  return true;
}

export async function installVaultBackend(
  request: InstallRequest,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<InstallResult> {
  if (!isOperatorExecutionHost()) {
    throw new Error(
      "Vault installation is enabled only on an operator host; execution is blocked in CI/serverless runtimes",
    );
  }

  resetInstallerCache();
  const method = await resolveAllowedInstallMethod(
    request.backendId,
    request.methodId,
  );
  const built = buildInstallCommand(method);
  const platform = currentPlatform() ?? process.platform;
  const commandHash = createHash("sha256")
    .update(JSON.stringify([built.command, ...built.args]))
    .digest("hex");

  const result = await spawnAndCapture(built.command, built.args, timeoutMs);
  const receipt: InstallResult = {
    backendId: request.backendId,
    methodId: request.methodId,
    platform,
    executable: method.executable,
    commandHash,
    exitCode: result.exitCode,
    stdout: truncate(result.stdout),
    stderr: truncate(result.stderr),
  };

  await writeAuditReceipt({
    at: new Date().toISOString(),
    requestedBy: request.requestedBy,
    backendId: receipt.backendId,
    methodId: receipt.methodId,
    platform: receipt.platform,
    executable: receipt.executable,
    commandHash: receipt.commandHash,
    exitCode: receipt.exitCode,
  });

  if (receipt.exitCode !== 0) {
    throw new Error(
      `Vault installer failed for ${request.backendId}:${request.methodId} with exit code ${receipt.exitCode}`,
    );
  }

  return receipt;
}

async function spawnAndCapture(
  command: string,
  args: readonly string[],
  timeoutMs: number,
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });

    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`Vault installer timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    timer.unref();

    child.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once("close", (code) => {
      clearTimeout(timer);
      resolvePromise({ exitCode: code ?? 1, stdout, stderr });
    });
  });
}

async function writeAuditReceipt(receipt: Record<string, unknown>): Promise<void> {
  const target = resolve(
    process.env.SKYGRID_VAULT_INSTALL_AUDIT_PATH ?? DEFAULT_AUDIT_PATH,
  );
  await mkdir(dirname(target), { recursive: true });
  await appendFile(target, `${JSON.stringify(receipt)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
}

function truncate(value: string, max = 8_000): string {
  const cleaned = value.replace(/\u001b\[[0-9;]*m/g, "").trim();
  return cleaned.length > max ? `${cleaned.slice(0, max)}…` : cleaned;
}
