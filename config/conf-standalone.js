// config/conf-standalone.js
//
// SKYGRID / Aura-Core standalone security + CVE config.
// Safe for repo commit: no private keys, no wallet seeds, no OAuth tokens,
// no API secrets, and no device credentials.

const env = process.env;

function bool(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

function number(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const config = {
  app: {
    name: "SKYGRID",
    poweredBy: "Aura-Core",
    operator: "MVPuknowme",
    mode: env.NODE_ENV || "standalone",
    version: env.SKYGRID_VERSION || "0.1.0",
  },

  security: {
    cveScanEnabled: bool(env.CVE_SCAN_ENABLED, true),
    dependencyAuditEnabled: bool(env.DEPENDENCY_AUDIT_ENABLED, true),
    secretScanEnabled: bool(env.SECRET_SCAN_ENABLED, true),
    failOnCritical: bool(env.FAIL_ON_CRITICAL_CVE, true),
    failOnHigh: bool(env.FAIL_ON_HIGH_CVE, false),

    severityThresholds: {
      critical: number(env.CVE_CRITICAL_THRESHOLD, 0),
      high: number(env.CVE_HIGH_THRESHOLD, 5),
      medium: number(env.CVE_MEDIUM_THRESHOLD, 25),
    },

    allowlist: {
      cves: (env.CVE_ALLOWLIST || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),

      packages: (env.CVE_PACKAGE_ALLOWLIST || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    },

    blockedPatterns: [
      "PRIVATE KEY",
      "BEGIN RSA PRIVATE KEY",
      "BEGIN OPENSSH PRIVATE KEY",
      "wallet seed",
      "mnemonic",
      "oauth_token",
      "api_secret",
      "cloudflare tunnel token",
    ],
  },

  skygrid: {
    publicSiteUrl:
      env.SKYGRID_PUBLIC_SITE_URL || "https://skygrid-gs3e.b12sites.com",

    protocolPreviewUrl:
      env.SKYGRID_PROTOCOL_PREVIEW_URL ||
      "https://aura-core-t2t5.vercel.app",

    healthPath: env.SKYGRID_HEALTH_PATH || "/health",

    edge: {
      provider: env.SKYGRID_EDGE_PROVIDER || "cloudflare",
      workerEnabled: bool(env.SKYGRID_WORKER_ENABLED, true),
      expectedHealthStatus: "ok",
    },
  },

  validationMarketplace: {
    enabled: bool(env.VALIDATION_MARKETPLACE_ENABLED, true),
    requireExplicitConsent: true,
    requireDeviceReadinessCheck: true,
    allowSilentMining: false,
    allowThirdPartyForceQuit: false,

    auraCoreFeeRate: number(env.AURACORE_FEE_RATE, 0.03),

    payoutFormula: "net = gross - gross * 0.03",

    serviceTypes: [
      "base-l2-readiness",
      "eip-compatibility-testing",
      "wallet-startup-support",
      "rpc-edge-support",
      "testnet-validation",
      "compute-lease",
      "uptime-failover-testing",
    ],
  },

  network: {
    preferredChains: [
      "base",
      "base-sepolia",
      "scroll",
      "ethereum",
      "optimism",
    ],

    defaultNetwork: env.DEFAULT_NETWORK || "base-sepolia",

    rpcTimeoutMs: number(env.RPC_TIMEOUT_MS, 12000),
    healthCheckTimeoutMs: number(env.HEALTH_CHECK_TIMEOUT_MS, 8000),
  },

  runtime: {
    dryRun: bool(env.DRY_RUN, true),
    logLevel: env.LOG_LEVEL || "info",

    safeReset: {
      enabled: bool(env.SAFE_RESET_ENABLED, true),
      dryRunDefault: true,
      allowlistedServices: [
        "skygrid",
        "aura-core",
        "cloudflared",
        "docker-compose",
      ],
      forbiddenTargets: [
        ".env",
        ".env.local",
        "wallet",
        "seed",
        "private-key",
        "oauth",
        "token",
      ],
    },
  },
};

function getPublicHealthUrl() {
  return `${config.skygrid.publicSiteUrl}${config.skygrid.healthPath}`;
}

function getProtocolHealthUrl() {
  return `${config.skygrid.protocolPreviewUrl}${config.skygrid.healthPath}`;
}

function calculateNetPayout(grossAmount) {
  const gross = Number(grossAmount);

  if (!Number.isFinite(gross) || gross < 0) {
    throw new Error("grossAmount must be a non-negative number");
  }

  const fee = gross * config.validationMarketplace.auraCoreFeeRate;
  const net = gross - fee;

  return {
    gross,
    feeRate: config.validationMarketplace.auraCoreFeeRate,
    fee,
    net,
  };
}

module.exports = {
  config,
  getPublicHealthUrl,
  getProtocolHealthUrl,
  calculateNetPayout,
};
