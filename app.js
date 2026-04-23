const isBrowser = typeof window !== "undefined";
const isIOS =
  isBrowser &&
  /iPhone|iPad|iPod/.test(
    window.navigator?.userAgent || navigator?.userAgent || ""
  );

const env = {
  AURA_MODE: process.env.AURA_MODE || "prod",
  SKYGRID_TRACE: process.env.SKYGRID_TRACE || "false",
  SKYGRID_LEVEL: process.env.SKYGRID_LEVEL || "info",
  NODE_ENV: process.env.NODE_ENV || "production"
};

const args = typeof process !== "undefined" ? process.argv.slice(2) : [];

function getArg(name, fallback = null) {
  const prefix = `--${name}=`;
  const found = args.find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
}

const peers = args
  .filter((arg) => arg.startsWith("--peer="))
  .map((arg) => arg.replace("--peer=", ""));

const config = {
  nodeId: getArg("node-id", "node-001"),
  network: getArg("network", "skygrid-main"),
  listen: getArg("listen", "0.0.0.0:7000"),
  peers,
  maxPeers: Number(getArg("max-peers", 16)),
  heartbeatInterval: Number(getArg("heartbeat-interval", 5000)),
  logLevel: getArg("log-level", env.SKYGRID_LEVEL)
};

function log(level, message, meta) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    message,
    ...(meta ? { meta } : {})
  };
  console.log(JSON.stringify(entry));
}

function validateConfig(current) {
  const errors = [];

  if (!current.nodeId) errors.push("Missing nodeId");
  if (!current.network) errors.push("Missing network");
  if (!current.listen || !current.listen.includes(":")) {
    errors.push("Invalid listen address");
  }
  if (!Number.isFinite(current.maxPeers) || current.maxPeers <= 0) {
    errors.push("Invalid maxPeers");
  }
  if (
    !Number.isFinite(current.heartbeatInterval) ||
    current.heartbeatInterval < 250
  ) {
    errors.push("Invalid heartbeatInterval");
  }

  return errors;
}

function getPerplexityUrl() {
  return isIOS
    ? "itms-apps://apps.apple.com/us/app/perplexity-ai-search-chat/id1668000334?eventid=6760367200"
    : "https://apps.apple.com/us/app/perplexity-ai-search-chat/id1668000334?eventid=6760367200";
}

function maybeRedirectToPerplexity() {
  if (!isBrowser) return false;
  const shouldRedirect = args.includes("--open-perplexity");
  if (!shouldRedirect) return false;
  const url = getPerplexityUrl();
  window.location.href = url;
  return true;
}

function startNode() {
  const errors = validateConfig(config);
  if (errors.length) {
    log("error", "SkyGrid configuration invalid", { errors, config, env });
    if (typeof process !== "undefined") process.exit(1);
    return;
  }

  log("info", "SkyGrid node starting", { config, env });

  if (env.SKYGRID_TRACE === "true") {
    log("debug", "SkyGrid trace enabled", { peers: config.peers.length });
  }

  setInterval(() => {
    log("heartbeat", "SkyGrid heartbeat", {
      nodeId: config.nodeId,
      network: config.network,
      peers: config.peers,
      listen: config.listen
    });
  }, config.heartbeatInterval);
}

maybeRedirectToPerplexity();
startNode();
