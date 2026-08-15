/**
 * SKYGRID vault installer policy.
 *
 * This module is intentionally limited to install specs, host capability
 * detection, and canonical command construction. It never executes an install.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);

export type BackendId = "1password" | "bitwarden" | "protonpass";
export type SupportedPlatform = "darwin" | "linux" | "win32";
export type PackageManagerKind = "brew" | "npm";

export type AutomatedInstallMethod =
  | {
      readonly id: string;
      readonly kind: "brew";
      readonly package: string;
      readonly cask: boolean;
      readonly version?: string;
      readonly executable: string;
    }
  | {
      readonly id: string;
      readonly kind: "npm";
      readonly package: string;
      readonly version: string;
      readonly executable: string;
    };

export type ManualInstallMethod = {
  readonly id: string;
  readonly kind: "manual";
  readonly instructions: string;
  readonly url: string;
  readonly executable: string;
};

export type InstallMethod = AutomatedInstallMethod | ManualInstallMethod;

export interface BackendInstallSpec {
  readonly id: BackendId;
  readonly methods: Readonly<
    Partial<Record<SupportedPlatform, readonly InstallMethod[]>>
  >;
}

const BITWARDEN_CLI_VERSION = "2026.7.0";

/**
 * Canonical allowlist. Client requests identify only backendId + methodId;
 * package names, versions, commands, URLs, and argv are never client supplied.
 */
export const BACKEND_INSTALL_SPECS: Readonly<
  Record<BackendId, BackendInstallSpec>
> = {
  "1password": {
    id: "1password",
    methods: {
      darwin: [
        {
          id: "brew-cask",
          kind: "brew",
          package: "1password-cli",
          cask: true,
          executable: "op",
        },
        {
          id: "manual",
          kind: "manual",
          executable: "op",
          instructions:
            "Install the 1Password CLI using the official platform instructions.",
          url: "https://developer.1password.com/docs/cli/get-started/",
        },
      ],
      linux: [
        {
          id: "manual",
          kind: "manual",
          executable: "op",
          instructions:
            "Install the 1Password CLI using the official signed-package instructions.",
          url: "https://developer.1password.com/docs/cli/get-started/",
        },
      ],
      win32: [
        {
          id: "manual",
          kind: "manual",
          executable: "op",
          instructions:
            "Install the 1Password CLI with the official Windows installer or winget instructions.",
          url: "https://developer.1password.com/docs/cli/get-started/",
        },
      ],
    },
  },
  bitwarden: {
    id: "bitwarden",
    methods: {
      darwin: [
        {
          id: "npm-pinned",
          kind: "npm",
          package: "@bitwarden/cli",
          version: BITWARDEN_CLI_VERSION,
          executable: "bw",
        },
        {
          id: "brew",
          kind: "brew",
          package: "bitwarden-cli",
          cask: false,
          executable: "bw",
        },
      ],
      linux: [
        {
          id: "npm-pinned",
          kind: "npm",
          package: "@bitwarden/cli",
          version: BITWARDEN_CLI_VERSION,
          executable: "bw",
        },
      ],
      win32: [
        {
          id: "npm-pinned",
          kind: "npm",
          package: "@bitwarden/cli",
          version: BITWARDEN_CLI_VERSION,
          executable: "bw",
        },
      ],
    },
  },
  protonpass: {
    id: "protonpass",
    methods: {
      darwin: [
        {
          id: "brew-official-tap",
          kind: "brew",
          package: "protonpass/tap/pass-cli",
          cask: false,
          executable: "pass-cli",
        },
        {
          id: "manual",
          kind: "manual",
          executable: "pass-cli",
          instructions:
            "Install Proton Pass CLI with the official installer or verified manual download.",
          url: "https://protonpass.github.io/pass-cli/get-started/installation/",
        },
      ],
      linux: [
        {
          id: "brew-official-tap",
          kind: "brew",
          package: "protonpass/tap/pass-cli",
          cask: false,
          executable: "pass-cli",
        },
        {
          id: "manual",
          kind: "manual",
          executable: "pass-cli",
          instructions:
            "Install Proton Pass CLI with the official installer or verified manual download.",
          url: "https://protonpass.github.io/pass-cli/get-started/installation/",
        },
      ],
      win32: [
        {
          id: "manual",
          kind: "manual",
          executable: "pass-cli.exe",
          instructions:
            "Install Proton Pass CLI using the official PowerShell installer or verified manual download.",
          url: "https://protonpass.github.io/pass-cli/get-started/installation/",
        },
      ],
    },
  },
};

export interface PackageManagerAvailability {
  readonly brew: boolean;
  readonly npm: boolean;
}

let packageManagerCache: PackageManagerAvailability | null = null;

export function currentPlatform(): SupportedPlatform | null {
  const platform = process.platform;
  return platform === "darwin" || platform === "linux" || platform === "win32"
    ? platform
    : null;
}

function packageManagerCommand(
  kind: PackageManagerKind,
  platform: SupportedPlatform,
): string | null {
  if (kind === "brew") return platform === "win32" ? null : "brew";
  return platform === "win32" ? "npm.cmd" : "npm";
}

async function isPackageManagerRunnable(
  kind: PackageManagerKind,
  platform: SupportedPlatform,
): Promise<boolean> {
  const command = packageManagerCommand(kind, platform);
  if (!command) return false;
  try {
    await exec(command, ["--version"], { timeout: 5_000, windowsHide: true });
    return true;
  } catch {
    return false;
  }
}

export async function detectPackageManagers(
  platform: SupportedPlatform | null = currentPlatform(),
): Promise<PackageManagerAvailability> {
  if (!platform) return { brew: false, npm: false };
  if (packageManagerCache) return packageManagerCache;
  const [brew, npm] = await Promise.all([
    isPackageManagerRunnable("brew", platform),
    isPackageManagerRunnable("npm", platform),
  ]);
  packageManagerCache = { brew, npm };
  return packageManagerCache;
}

export function resetInstallerCache(): void {
  packageManagerCache = null;
}

export async function resolveRunnableMethods(
  backendId: BackendId,
  platform: SupportedPlatform | null = currentPlatform(),
): Promise<readonly InstallMethod[]> {
  if (!platform) return [];
  const candidates = BACKEND_INSTALL_SPECS[backendId].methods[platform] ?? [];
  if (candidates.length === 0) return [];
  const tools = await detectPackageManagers(platform);
  return candidates.filter((method) => {
    if (method.kind === "manual") return true;
    if (method.kind === "brew") return tools.brew;
    return tools.npm;
  });
}

export async function resolveAllowedInstallMethod(
  backendId: BackendId,
  methodId: string,
  platform: SupportedPlatform | null = currentPlatform(),
): Promise<AutomatedInstallMethod> {
  if (!platform) throw new Error(`Unsupported platform: ${process.platform}`);
  const methods = await resolveRunnableMethods(backendId, platform);
  const method = methods.find((candidate) => candidate.id === methodId);
  if (!method) {
    throw new Error(
      `Install method ${backendId}:${methodId} is not allowed or runnable on ${platform}`,
    );
  }
  if (method.kind === "manual") {
    throw new Error(`Install method ${backendId}:${methodId} is manual-only`);
  }
  return method;
}

export function buildInstallCommand(method: AutomatedInstallMethod): {
  readonly command: string;
  readonly args: readonly string[];
} {
  if (method.kind === "brew") {
    return {
      command: "brew",
      args: method.cask
        ? ["install", "--cask", method.package]
        : ["install", method.package],
    };
  }
  return {
    command: process.platform === "win32" ? "npm.cmd" : "npm",
    args: ["install", "-g", `${method.package}@${method.version}`],
  };
}
