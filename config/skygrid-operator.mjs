export const DEFAULT_SKYGRID_OPERATOR = "MVPuknowme";

const ALLOWED_RUNTIME_MODES = new Set([
  "local",
  "local-container",
  "vercel",
  "vercel-build",
  "ci"
]);

function normalizedFlag(value) {
  return String(value || "").trim().toLowerCase();
}

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "::1"]);
const CONTAINER_HOSTS = new Set([...LOOPBACK_HOSTS, "0.0.0.0", "::"]);

export function resolveOperatorConfig(env = process.env) {
  const operator = String(env.SKYGRID_OPERATOR || DEFAULT_SKYGRID_OPERATOR).trim();
  if (!/^[A-Za-z0-9_.-]{1,64}$/.test(operator)) {
    throw new Error("invalid_skygrid_operator");
  }

  const inferredMode = normalizedFlag(env.VERCEL) === "1" ? "vercel" : "local";
  const runtimeMode = normalizedFlag(env.SKYGRID_RUNTIME_MODE) || inferredMode;
  if (!ALLOWED_RUNTIME_MODES.has(runtimeMode)) {
    throw new Error("invalid_skygrid_runtime_mode");
  }

  const vercelBypass = normalizedFlag(env.SKYGRID_VERCEL_BYPASS);
  if (vercelBypass && vercelBypass !== "local-container") {
    throw new Error("invalid_vercel_bypass_mode");
  }
  if (vercelBypass === "local-container" && runtimeMode !== "local-container") {
    throw new Error("vercel_bypass_requires_local_container_mode");
  }
  if (vercelBypass === "local-container" && normalizedFlag(env.VERCEL) === "1") {
    throw new Error("vercel_bypass_must_run_outside_vercel");
  }

  return Object.freeze({
    operator,
    runtimeMode,
    vercelBypass: vercelBypass === "local-container",
    authorization: "independent_fail_closed_controls"
  });
}

export function resolveRuntimeHost(env = process.env, runtimeMode) {
  const mode = runtimeMode || resolveOperatorConfig(env).runtimeMode;
  const defaultHost = mode === "local-container" ? "0.0.0.0" : "127.0.0.1";
  const host = String(env.HOST || defaultHost).trim();
  const allowedHosts = mode === "local-container" ? CONTAINER_HOSTS : LOOPBACK_HOSTS;

  if (!allowedHosts.has(host)) {
    throw new Error(
      CONTAINER_HOSTS.has(host)
        ? "wildcard_host_requires_local_container_mode"
        : "invalid_local_runtime_host"
    );
  }

  return host;
}

export function applyOperatorMode({ operator, runtimeMode, vercelBypass } = {}) {
  const candidate = { ...process.env };

  if (operator) candidate.SKYGRID_OPERATOR = operator;
  else if (!candidate.SKYGRID_OPERATOR) candidate.SKYGRID_OPERATOR = DEFAULT_SKYGRID_OPERATOR;
  if (runtimeMode) candidate.SKYGRID_RUNTIME_MODE = runtimeMode;

  // Validate inherited bypass state against the requested runtime before any
  // value is replaced or cleared. Invalid operator input must fail closed.
  resolveOperatorConfig(candidate);

  if (vercelBypass === true) candidate.SKYGRID_VERCEL_BYPASS = "local-container";
  else if (vercelBypass === false) delete candidate.SKYGRID_VERCEL_BYPASS;

  const config = resolveOperatorConfig(candidate);
  process.env.SKYGRID_OPERATOR = config.operator;
  process.env.SKYGRID_RUNTIME_MODE = config.runtimeMode;
  if (config.vercelBypass) process.env.SKYGRID_VERCEL_BYPASS = "local-container";
  else delete process.env.SKYGRID_VERCEL_BYPASS;

  return config;
}
