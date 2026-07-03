const PRODUCT = "Aura GPT Desktop Switch Director";
const SERVICE = "SKYGRID Emergency Data On-Ramp";
const SENTINEL = "fail_closed";

function hasEnv(name) {
  return typeof process.env[name] === "string" && process.env[name].trim().length > 0;
}

export function listProviderCandidates() {
  return [
    {
      id: "local_model",
      label: "Local Model Endpoint",
      available: hasEnv("AURA_LOCAL_MODEL_URL"),
      reason: hasEnv("AURA_LOCAL_MODEL_URL")
        ? "AURA_LOCAL_MODEL_URL is configured."
        : "AURA_LOCAL_MODEL_URL is not configured.",
    },
    {
      id: "mcp_bridge",
      label: "MCP Bridge",
      available: hasEnv("AURA_MCP_BRIDGE_URL"),
      reason: hasEnv("AURA_MCP_BRIDGE_URL")
        ? "AURA_MCP_BRIDGE_URL is configured."
        : "AURA_MCP_BRIDGE_URL is not configured.",
    },
    {
      id: "custom_provider",
      label: "Custom Provider",
      available: hasEnv("AURA_CUSTOM_PROVIDER_URL"),
      reason: hasEnv("AURA_CUSTOM_PROVIDER_URL")
        ? "AURA_CUSTOM_PROVIDER_URL is configured."
        : "AURA_CUSTOM_PROVIDER_URL is not configured.",
    },
    {
      id: "openai_responses",
      label: "OpenAI Responses API",
      available: hasEnv("OPENAI_API_KEY"),
      reason: hasEnv("OPENAI_API_KEY")
        ? "OPENAI_API_KEY is configured; execution remains opt-in."
        : "OPENAI_API_KEY is not configured.",
    },
    {
      id: "skygrid_advisory",
      label: "SKYGRID Advisory / Decision Only",
      available: true,
      reason: "Always available as fail-closed advisory mode.",
    },
  ];
}

export function selectProvider({ provider = "auto" } = {}) {
  const candidates = listProviderCandidates();

  if (provider && provider !== "auto") {
    const requested = candidates.find((candidate) => candidate.id === provider);
    if (requested && requested.available) {
      return { selected: requested, candidates, reason: `Requested provider ${provider} is available.` };
    }

    return {
      selected: candidates[candidates.length - 1],
      candidates,
      reason: `Requested provider ${provider} is unavailable; falling back to advisory mode.`,
    };
  }

  const selected = candidates.find((candidate) => candidate.available) ?? candidates[candidates.length - 1];
  return { selected, candidates, reason: `Auto-selected ${selected.id}.` };
}

export function buildDecisionEnvelope(input = {}) {
  const executeRequested = input.execute === true;
  const executionEnabled = process.env.AURA_DIRECTOR_EXECUTE_ENABLED === "true";
  const { selected, candidates, reason } = selectProvider({ provider: input.provider ?? "auto" });
  const executeAllowed = Boolean(executeRequested && executionEnabled && selected.id !== "skygrid_advisory");

  return {
    ok: true,
    product: PRODUCT,
    service: SERVICE,
    mode: "controlled_pilot",
    sentinel: SENTINEL,
    source: input.source ?? "unknown",
    task: input.task ?? "unspecified",
    privacy: input.privacy ?? "normal",
    execute_requested: executeRequested,
    execute_allowed: executeAllowed,
    execution_mode: executeAllowed ? "provider_execution_enabled" : "decision_only_fail_closed",
    selected_provider: selected,
    candidates,
    reason: executeAllowed
      ? reason
      : `${reason} Execution is disabled unless AURA_DIRECTOR_EXECUTE_ENABLED=true and a non-advisory provider is configured.`,
    timestamp: new Date().toISOString(),
  };
}

export function healthEnvelope() {
  return {
    ok: true,
    product: PRODUCT,
    service: SERVICE,
    route: "/api/aura/director",
    mode: "controlled_pilot",
    sentinel: SENTINEL,
    providers: listProviderCandidates(),
    timestamp: new Date().toISOString(),
  };
}
