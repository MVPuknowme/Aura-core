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

export function applyOperatorMode({ operator, runtimeMode, vercelBypass = false } = {}) {
  if (operator) process.env.SKYGRID_OPERATOR = operator;
  else if (!process.env.SKYGRID_OPERATOR) process.env.SKYGRID_OPERATOR = DEFAULT_SKYGRID_OPERATOR;

  if (runtimeMode) process.env.SKYGRID_RUNTIME_MODE = runtimeMode;
  if (vercelBypass) process.env.SKYGRID_VERCEL_BYPASS = "local-container";
  else delete process.env.SKYGRID_VERCEL_BYPASS;

  return resolveOperatorConfig(process.env);
}
