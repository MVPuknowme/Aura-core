export const SKYGRID_WIN11_REVISION = "c64db11";
export const WINDOWS_11_MIN_BUILD = 22000;
export const WINDOWS_11_SUPPORTED_ARCHITECTURES = Object.freeze(["x64", "arm64"]);
export const WINDOWS_11_MIN_NODE_MAJOR = 24;

function major(version) {
  const value = Number.parseInt(String(version || "").split(".")[0], 10);
  return Number.isFinite(value) ? value : null;
}

function windowsBuild(release) {
  const parts = String(release || "").split(".");
  const value = Number.parseInt(parts.at(-1), 10);
  return Number.isFinite(value) ? value : null;
}

export function evaluateWindows11Compatibility({
  platform,
  release,
  arch,
  nodeVersion
} = {}) {
  const failures = [];
  const build = windowsBuild(release);
  const nodeMajor = major(nodeVersion);

  if (platform !== "win32") failures.push("platform_not_win32");
  if (build === null) failures.push("windows_build_unreadable");
  else if (build < WINDOWS_11_MIN_BUILD) failures.push("windows_build_below_22000");

  if (!WINDOWS_11_SUPPORTED_ARCHITECTURES.includes(arch)) {
    failures.push("unsupported_windows_architecture");
  }

  if (nodeMajor === null) failures.push("node_major_unreadable");
  else if (nodeMajor < WINDOWS_11_MIN_NODE_MAJOR) failures.push("node_major_below_24");

  return Object.freeze({
    ok: failures.length === 0,
    revision: SKYGRID_WIN11_REVISION,
    platform: String(platform || ""),
    release: String(release || ""),
    windows_build: build,
    arch: String(arch || ""),
    node_major: nodeMajor,
    failures
  });
}
