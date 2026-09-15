export const SKYGRID_WIN11_REVISION = "c64db11";
export const WINDOWS_11_MIN_BUILD = 22000;
export const WINDOWS_11_SUPPORTED_ARCHITECTURES = Object.freeze(["x64", "arm64"]);
export const WINDOWS_11_NODE_MAJOR = 24;
export const WINDOWS_WORKSTATION_PRODUCT_TYPE = 1;

function nodeMajor(version) {
  const value = String(version || "");
  if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(value)) return null;
  return Number(value.split(".")[0]);
}

function windowsBuild(release) {
  const value = String(release || "");
  if (!/^\d+\.\d+\.\d+$/.test(value)) return null;
  return Number(value.split(".").at(-1));
}

function productType(value) {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value === "string" && /^\d+$/.test(value)) return Number(value);
  return null;
}

export function evaluateWindows11Compatibility({
  platform,
  release,
  arch,
  nodeVersion,
  windowsProductType
} = {}) {
  const failures = [];
  const build = windowsBuild(release);
  const node = nodeMajor(nodeVersion);
  const product = productType(windowsProductType);

  if (platform !== "win32") failures.push("platform_not_win32");
  if (build === null) failures.push("windows_build_unreadable");
  else if (build < WINDOWS_11_MIN_BUILD) failures.push("windows_build_below_22000");

  if (product === null) failures.push("windows_product_type_unreadable");
  else if (product !== WINDOWS_WORKSTATION_PRODUCT_TYPE) failures.push("windows_product_not_workstation");

  if (!WINDOWS_11_SUPPORTED_ARCHITECTURES.includes(arch)) {
    failures.push("unsupported_windows_architecture");
  }

  if (node === null) failures.push("node_major_unreadable");
  else if (node !== WINDOWS_11_NODE_MAJOR) failures.push("node_major_not_24");

  return Object.freeze({
    ok: failures.length === 0,
    revision: SKYGRID_WIN11_REVISION,
    platform: String(platform || ""),
    release: String(release || ""),
    windows_build: build,
    windows_product_type: product,
    arch: String(arch || ""),
    node_major: node,
    failures
  });
}
