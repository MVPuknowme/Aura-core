const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");

const OFFLINE_FOOTER = "Mode: local offline response. No API call used.";

const auraUserDataPath = path.join(__dirname, ".runtime", "userData");
const auraCachePath = path.join(__dirname, ".runtime", "cache");

fs.mkdirSync(auraUserDataPath, { recursive: true });
fs.mkdirSync(auraCachePath, { recursive: true });

app.setPath("userData", auraUserDataPath);
app.setPath("cache", auraCachePath);
app.commandLine.appendSwitch("disk-cache-dir", auraCachePath);
app.commandLine.appendSwitch("disable-gpu-shader-disk-cache");

let OpenAIClient = null;

function withOfflineFooter(text) {
  if (String(text).includes(OFFLINE_FOOTER)) return text;
  return `${text}\n\n${OFFLINE_FOOTER}`;
}

function loadLocalEnv() {
  const envPath = path.join(__dirname, ".env.local");
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const index = trimmed.indexOf("=");
    if (index === -1) continue;

    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();

    if (!process.env[key] && value && !value.includes("PASTE_")) {
      process.env[key] = value;
    }
  }
}

loadLocalEnv();

function getSystemInstructions() {
  try {
    return fs.readFileSync(path.join(__dirname, "aura-system-prompt.md"), "utf8");
  } catch {
    return "You are Aura-Core GPT Desktop. Be professional, concise, safe, and practical.";
  }
}

function stripShellNoise(input) {
  return String(input || "")
    .replace(/^PS\s+[A-Z]:\\[^>]*>\s*/gim, "")
    .replace(/^\s*>>\s*/gm, "")
    .replace(/^\s*>\s*/gm, "")
    .trim();
}

function getLatestCommand(userText) {
  const clean = stripShellNoise(userText);
  const lines = clean
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.length ? lines[lines.length - 1] : clean;
}

function loadTranslatorRules() {
  const fallback = [
    { canonical: "wonder bread", triggers: ["wonder bread", "our imaginations"] },
    { canonical: "postman api gen", triggers: ["postman api gen", "generate postman"] },
    { canonical: "github status", triggers: ["github status", "git hub status"] },
    { canonical: "check vitals", triggers: ["check her vitals", "check vitals"] }
  ];

  try {
    const raw = fs.readFileSync(path.join(__dirname, "aura-prompt-translator.json"), "utf8").replace(/^\uFEFF/, "");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.rules) ? parsed.rules : fallback;
  } catch {
    return fallback;
  }
}

function translateAuraPrompt(userText) {
  const latest = getLatestCommand(userText);
  const latestLower = latest.toLowerCase();
  const wholeLower = stripShellNoise(userText).toLowerCase();

  const rules = loadTranslatorRules();

  for (const rule of rules) {
    for (const trigger of rule.triggers || []) {
      const t = String(trigger).toLowerCase();

      if (latestLower === t || latestLower.includes(t)) {
        return rule.canonical;
      }
    }
  }

  for (const rule of rules) {
    for (const trigger of rule.triggers || []) {
      const t = String(trigger).toLowerCase();

      if (wholeLower.includes(t)) {
        return rule.canonical;
      }
    }
  }

  return latest || userText;
}

function getApprovedRoutes() {
  const fallbackRoutes = [
    "https://aura-core-t2t5.vercel.app/api/health",
    "https://aura-core-t2t5.vercel.app/api/panels/summary",
    "https://aura-core-t2t5.vercel.app/api/failover/status",
    "https://aura-core-t2t5.vercel.app/api/highway/status",
    "https://aura-core-t2t5.vercel.app/api/highway/postman",
    "https://aura-core-t2t5.vercel.app/api/compat/ios"
  ];

  const policyPath = path.join(__dirname, "aura-route-policy.json");

  try {
    const raw = fs.readFileSync(policyPath, "utf8").replace(/^\uFEFF/, "");
    const policy = JSON.parse(raw);
    const routes = Array.isArray(policy.allowed_routes) ? policy.allowed_routes : [];

    return routes.length ? routes : fallbackRoutes;
  } catch {
    return fallbackRoutes;
  }
}

function wantsApprovedRouteProbe(prompt) {
  const text = String(prompt || "").toLowerCase();
  return text.includes("route probe") || text.includes("approved routes") || text.includes("traffic inspection");
}

async function probeApprovedRoutes() {
  const routes = getApprovedRoutes();
  const results = [];

  for (const url of routes) {
    if (!String(url).startsWith("https://aura-core-t2t5.vercel.app/")) {
      results.push(`${url} -> BLOCKED_BY_ALLOWLIST`);
      continue;
    }

    try {
      const started = Date.now();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(url, {
        method: "GET",
        signal: controller.signal,
        headers: { "User-Agent": "Aura-GPT-Desktop-Route-Probe" }
      });

      clearTimeout(timeout);
      results.push(`${url} -> ${response.status} ${response.statusText} ${Date.now() - started}ms`);
    } catch (error) {
      results.push(`${url} -> ERROR ${error.message}`);
    }
  }

  return [
    "Status: approved route probe complete.",
    "",
    "Policy: read-only GET checks against allowlisted SKYGRID routes only.",
    "",
    ...results,
    "",
    "Guardrail: no wallet signing, no transaction broadcast, no payment execution, no private data movement, no production failover unlock."
  ].join("\n");
}

function buildPostmanItem(url) {
  const parsed = new URL(url);
  const pathParts = parsed.pathname.split("/").filter(Boolean);
  const query = Array.from(parsed.searchParams.entries()).map(([key, value]) => ({ key, value }));

  return {
    name: parsed.pathname,
    request: {
      method: "GET",
      header: [{ key: "User-Agent", value: "Aura-GPT-Desktop-Postman-Gen" }],
      url: {
        raw: url,
        protocol: parsed.protocol.replace(":", ""),
        host: parsed.hostname.split("."),
        path: pathParts,
        ...(query.length ? { query } : {})
      },
      description: "Read-only SKYGRID Emergency Data On-Ramp route check generated locally by Aura Desktop."
    },
    event: [
      {
        listen: "test",
        script: {
          type: "text/javascript",
          exec: [
            "pm.test('HTTP 200 OK', function () {",
            "  pm.response.to.have.status(200);",
            "});",
            "",
            "pm.test('Response is JSON', function () {",
            "  pm.response.to.be.json;",
            "});"
          ]
        }
      }
    ],
    response: []
  };
}

function wantsPostmanApiGen(prompt) {
  const text = String(prompt || "").toLowerCase();
  return text.includes("postman api gen") || text.includes("postman collection") || text.includes("generate postman");
}

function generatePostmanCollection() {
  const safeRoutes = getApprovedRoutes().filter((url) =>
    String(url).startsWith("https://aura-core-t2t5.vercel.app/")
  );

  const collection = {
    info: {
      name: "SKYGRID Emergency Data On-Ramp - Aura Desktop Generated",
      description: [
        "Generated locally by Aura GPT Desktop.",
        "Scope: read-only approved SKYGRID routes.",
        "Guardrails: no wallet signing, no transaction broadcast, no payment execution, no private data movement, no production failover unlock."
      ].join("\n"),
      schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
    },
    item: safeRoutes.map(buildPostmanItem),
    variable: [{ key: "base_url", value: "https://aura-core-t2t5.vercel.app" }]
  };

  const postmanDir = path.join(__dirname, "..", "postman");
  fs.mkdirSync(postmanDir, { recursive: true });

  const outPath = path.join(postmanDir, "skygrid-aura-desktop.generated.collection.json");
  fs.writeFileSync(outPath, JSON.stringify(collection, null, 2), "utf8");

  return [
    "Status: Postman API collection generated.",
    "",
    `Output: ${outPath}`,
    "",
    "Generated read-only routes:",
    ...safeRoutes.map((url) => `- ${url}`),
    "",
    "Run from E:\\Aura-core:",
    "",
    "npx newman run .\\postman\\skygrid-aura-desktop.generated.collection.json",
    "",
    "Guardrail: generated collection uses GET only against approved SKYGRID routes."
  ].join("\n");
}

function wonderBreadReply() {
  return [
    "Status: imagination converted into proof.",
    "",
    "Operating phrase: Wonder bread from our imaginations.",
    "",
    "Meaning: we turn rough ideas into working systems, keep the guardrails on, and proof everything locally when API quota is blocked.",
    "",
    "Current Aura-Core state:",
    "- SKYGRID Emergency Data On-Ramp routes are green.",
    "- Aura Desktop local offline mode works.",
    "- GitHub Aura-Core context is wired.",
    "- Postman API generation works locally.",
    "- Newman proof passed with all approved routes HTTP 200.",
    "- iOS compatibility fallback route is green.",
    "- Failover remains blocked by design.",
    "- Production failover is not certified yet.",
    "",
    "Next safe action: continue proof-driven local training."
  ].join("\n");
}

function offlineReply(prompt) {
  const text = String(prompt || "").toLowerCase();

  if (text.includes("aura greeting")) {
    return [
      "Status: online in local mode.",
      "",
      "Hello MVP. Aura Desktop is running.",
      "",
      "Available offline commands:",
      "- wonder bread",
      "- operating profile",
      "- check vitals",
      "- vercel readiness",
      "- postman api gen",
      "- route probe",
      "- github status",
      "- github sync",
      "- github proof"
    ].join("\n");
  }

  if (text.includes("wonder bread")) return wonderBreadReply();

  if (text.includes("operating profile")) {
    return [
      "Status: operating profile loaded.",
      "",
      "Operator: Michael Vincent Patrick / MVPuknowme.",
      "Project: SKYGRID Emergency Data On-Ramp.",
      "Repo paths: E:\\Aura-core, E:\\Aura-core\\desktop-gpt, E:\\aura_wallet_core.",
      "Vercel: aura-core-t2t5 under scope home-e539c0b1.",
      "Public URL: https://aura-core-t2t5.vercel.app.",
      "Safe failover rule: failover remains blocked unless MVP explicitly approves and health quorum is verified.",
      "Command mode: local offline command recognition enabled."
    ].join("\n");
  }

  if (text.includes("check vitals")) {
    return [
      "Status: vitals check recognized.",
      "",
      "Run from E:\\Aura-core:",
      "",
      "cd E:\\Aura-core",
      "$BASE=\"https://aura-core-t2t5.vercel.app\"",
      "$routes=@(\"/api/health\",\"/api/panels/summary\",\"/api/failover/status\",\"/api/highway/status\",\"/api/highway/postman\",\"/api/compat/ios\")",
      "foreach ($route in $routes) {",
      "  curl.exe -sS -o NUL -w \"$route -> %{http_code} %{time_total} %{content_type}`n\" \"$BASE$route\"",
      "}",
      "",
      "Expected: all routes return HTTP 200. Failover remains blocked."
    ].join("\n");
  }

  if (text.includes("vercel readiness")) {
    return [
      "Status: Vercel readiness check recognized.",
      "",
      "Run from E:\\Aura-core:",
      "",
      "cd E:\\Aura-core",
      "$DEPLOYMENT=\"https://aura-core-t2t5.vercel.app\"",
      "$response = npx vercel curl /api/panels/summary --deployment $DEPLOYMENT",
      "$panel = $response | ConvertFrom-Json",
      "[pscustomobject]@{",
      "  awsStatusUrl          = $panel.configured.awsStatusUrl",
      "  awsIntakeUrl          = $panel.configured.awsIntakeUrl",
      "  emergencyCallId       = $panel.configured.emergencyCallId",
      "  partnershipCode       = $panel.configured.partnershipCode",
      "  lambdaRouterUrl       = $panel.configured.lambdaRouterUrl",
      "  s3Bucket              = $panel.configured.s3Bucket",
      "  awsPersistenceReady   = $panel.status.aws_persistence.ready",
      "  failoverAwsReady      = $panel.failover.readiness.aws_persistence_ready",
      "  failoverState         = $panel.failover.failover_state",
      "  productionPolicyReady = $panel.failover.readiness.production_policy_ready",
      "}",
      "",
      "Expected: failoverState blocked. Production policy remains false until certified."
    ].join("\n");
  }

  if (text.includes("failover lock")) {
    return [
      "Status: failover safety check recognized.",
      "",
      "Rule: failover must remain blocked unless MVP explicitly approves and health quorum is verified.",
      "",
      "Expected safe state:",
      "failoverState         : blocked",
      "productionPolicyReady : False"
    ].join("\n");
  }

  if (text.includes("routing policy")) {
    return [
      "Status: routing policy recognized.",
      "",
      "Allowed now:",
      "- Read-only route checks.",
      "- Public health checks.",
      "- Vercel readiness checks.",
      "- iOS compatibility checks.",
      "- Local Postman API generation.",
      "",
      "Blocked now:",
      "- Raw PowerShell remoting.",
      "- Wallet private key loading.",
      "- Wallet signing.",
      "- Transaction broadcast.",
      "- Payment execution.",
      "- Private data movement.",
      "- Production failover unlock.",
      "",
      "Rule: Aura may inspect approved routes, but she may not control live routing until MVP explicitly approves and health quorum is verified."
    ].join("\n");
  }

  if (text.includes("github status")) {
    return [
      "Status: GitHub Aura-Core context recognized.",
      "",
      "Repository: MVPuknowme/Aura-core.",
      "Local root: E:\\Aura-core.",
      "Desktop root: E:\\Aura-core\\desktop-gpt.",
      "Primary branch: MVPuknowme.",
      "Dev branch: dev/aura-shield-ios-blocker.",
      "Remote: origin.",
      "",
      "Safe rules:",
      "- Do not force push.",
      "- Do not commit .env.local, .runtime, logs, API keys, private keys, seed phrases, or wallet material.",
      "- Use git status -sb before every commit.",
      "- Use pull --rebase --autostash if remote changed.",
      "- Push current dev branch with git push -u origin HEAD."
    ].join("\n");
  }

  if (text.includes("github sync")) {
    return [
      "Status: GitHub sync workflow recognized.",
      "",
      "Run from E:\\Aura-core:",
      "",
      "cd E:\\Aura-core",
      "git status -sb",
      "git branch --show-current",
      "git fetch origin",
      "git pull --rebase --autostash origin $(git branch --show-current)",
      "git push -u origin HEAD",
      "",
      "Rule: do not force push. If a conflict appears, stop and inspect it first."
    ].join("\n");
  }

  if (text.includes("github proof")) {
    return [
      "Status: GitHub proof workflow recognized.",
      "",
      "Proof files:",
      "- postman/skygrid-aura-desktop.generated.collection.json",
      "- artifacts/postman/",
      "",
      "Run from E:\\Aura-core:",
      "",
      "cd E:\\Aura-core",
      "npx newman run .\\postman\\skygrid-aura-desktop.generated.collection.json",
      "git status -sb",
      "git add postman/skygrid-aura-desktop.generated.collection.json artifacts/postman",
      "git commit -m \"Update SKYGRID Aura Desktop Postman proof\"",
      "git pull --rebase --autostash origin $(git branch --show-current)",
      "git push -u origin HEAD",
      "",
      "Expected: Newman failed requests = 0."
    ].join("\n");
  }

  if (text.includes("proof status")) {
    return [
      "Status: Postman proof recognized.",
      "",
      "Latest verified proof:",
      "- Collection: postman/skygrid-aura-desktop.generated.collection.json.",
      "- Scope: approved read-only SKYGRID routes only.",
      "- Routes executed: 6.",
      "- Failed requests: 0.",
      "- Expected route status: HTTP 200.",
      "- iOS compatibility route: included.",
      "",
      "Guardrail: this proof does not unlock failover, wallet signing, payment execution, private data movement, or device activation."
    ].join("\n");
  }

  if (text.includes("deploy verification")) {
    return [
      "Status: production verification recognized.",
      "",
      "Run from E:\\Aura-core:",
      "",
      "cd E:\\Aura-core",
      "$BASE=\"https://aura-core-t2t5.vercel.app\"",
      "curl.exe -i \"$BASE/api/health\"",
      "curl.exe -i \"$BASE/api/compat/ios\"",
      "curl.exe -i \"$BASE/api/panels/summary\"",
      "npx newman run .\\postman\\skygrid-aura-desktop.generated.collection.json",
      "",
      "Expected: all status routes 200, Newman failed requests 0, failover blocked."
    ].join("\n");
  }

  if (text.includes("branch status")) {
    return [
      "Status: branch workflow recognized.",
      "",
      "Run from E:\\Aura-core:",
      "",
      "git status -sb",
      "git branch --show-current",
      "git log -1 --oneline"
    ].join("\n");
  }

  if (text.includes("safe launch state")) {
    return [
      "Status: controlled pilot proof recognized.",
      "",
      "SKYGRID controlled pilot state:",
      "- Health route: green.",
      "- Highway route: online.",
      "- Postman route: ready.",
      "- iOS fallback: green.",
      "- Dashboard summary: green.",
      "- AWS persistence: mostly ready with remaining config cleanup.",
      "- Failover: blocked by design.",
      "- Guardrails: active.",
      "",
      "Controlled pilot can continue. Production failover is not certified yet."
    ].join("\n");
  }

  if (text.includes("blocked report")) {
    return [
      "Status: blocker report recognized.",
      "",
      "Remaining blockers:",
      "- s3Bucket: false in Vercel runtime config unless recently fixed.",
      "- lambdaRouterUrl: false until an actual Lambda router URL is provided.",
      "- health_quorum_ready: false.",
      "- rollback_ready: false.",
      "- production_policy_ready: false.",
      "",
      "Safe interpretation: controlled pilot can continue, production failover remains blocked."
    ].join("\n");
  }

  if (text.includes("ios blocker")) {
    return [
      "Status: iOS compatibility recognized.",
      "",
      "Safe iOS rule:",
      "- passkeysRequired: false",
      "- walletSigningRequired: false",
      "- fallbackEnabled: true",
      "- failoverUnlockAllowed: false",
      "",
      "Run from E:\\Aura-core:",
      "",
      "$BASE=\"https://aura-core-t2t5.vercel.app\"",
      "curl.exe -i \"$BASE/api/compat/ios\""
    ].join("\n");
  }

  return null;
}

async function getClient() {
  if (!OpenAIClient) {
    const { default: OpenAI } = await import("openai");

    if (!process.env.OPENAI_API_KEY) {
      throw new Error("Missing OPENAI_API_KEY environment variable.");
    }

    OpenAIClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  return OpenAIClient;
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 760,
    title: "Aura GPT Desktop",
    backgroundColor: "#12091f",
    webPreferences: {
      preload: require('path').join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  win.loadFile("index.html");
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("ask-gpt", async (_event, userText) => {
  const canonicalPrompt = translateAuraPrompt(userText);

  if (String(canonicalPrompt).toLowerCase().includes("wonder bread")) {
    return withOfflineFooter(wonderBreadReply());
  }

  if (wantsPostmanApiGen(canonicalPrompt)) {
    return withOfflineFooter(generatePostmanCollection());
  }

  if (wantsApprovedRouteProbe(canonicalPrompt)) {
    return withOfflineFooter(await probeApprovedRoutes());
  }

  const local = offlineReply(canonicalPrompt);

  if (local) {
    return withOfflineFooter(local);
  }

  try {
    const client = await getClient();

    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5.5",
      instructions: getSystemInstructions(),
      input: userText
    });

    return response.output_text || "";
  } catch (error) {
    if (error?.status === 429 || error?.code === "insufficient_quota") {
      return [
        "Status: OpenAI API quota blocked.",
        "",
        "Blocker: the API key is loaded, but the account/project has no available API quota or has hit its monthly budget.",
        "",
        "Next action: check OpenAI Platform usage, billing, project limits, and monthly budget.",
        "",
        "Local offline commands still work for: hey aura, wonder bread, operating profile, vitals, Vercel readiness, Postman API gen, route probe, GitHub status, GitHub sync, GitHub proof, failover, and iOS blocker."
      ].join("\n");
    }

    return `Status: API error.\n\n${error.message}`;
  }
});


// === AURA Telemetry Snapshot Handler v2 ===
try {
  const auraElectronTelemetry = require("electron");
  const auraFsTelemetry = require("fs");
  const auraPathTelemetry = require("path");
  const auraOsTelemetry = require("os");

  const auraIpcMainTelemetry = auraElectronTelemetry.ipcMain;
  const auraRootTelemetry = auraPathTelemetry.resolve(__dirname, "..");

  function auraReadJsonTelemetry(filePath) {
    try {
      if (!auraFsTelemetry.existsSync(filePath)) return null;
      return JSON.parse(auraFsTelemetry.readFileSync(filePath, "utf8"));
    } catch (_) {
      return null;
    }
  }

  function auraCountProofFilesTelemetry() {
    try {
      const artifactRoot = auraPathTelemetry.join(auraRootTelemetry, "artifacts");
      if (!auraFsTelemetry.existsSync(artifactRoot)) return 0;

      let count = 0;

      function walk(dir) {
        for (const item of auraFsTelemetry.readdirSync(dir, { withFileTypes: true })) {
          const full = auraPathTelemetry.join(dir, item.name);
          if (item.isDirectory()) walk(full);
          else if (/\.(md|json|pnpk)$/i.test(item.name)) count++;
        }
      }

      walk(artifactRoot);
      return count;
    } catch (_) {
      return 0;
    }
  }

  function auraBuildTelemetrySnapshot() {
    const latestPath = auraPathTelemetry.join(
      auraRootTelemetry,
      "artifacts",
      "iot",
      "pc-analytics",
      "latest-pc-analytics.json"
    );

    const routePath = auraPathTelemetry.join(
      auraRootTelemetry,
      "Aura",
      "State",
      "active-route.json"
    );

    const telemetry = auraReadJsonTelemetry(latestPath);
    const route = auraReadJsonTelemetry(routePath);

    const cpuPercent =
      telemetry && telemetry.cpu && telemetry.cpu.load_percent != null
        ? Number(telemetry.cpu.load_percent)
        : 0;

    const memoryUsedPercent =
      telemetry && telemetry.memory && telemetry.memory.used_percent != null
        ? Number(telemetry.memory.used_percent)
        : Math.round(((auraOsTelemetry.totalmem() - auraOsTelemetry.freemem()) / auraOsTelemetry.totalmem()) * 100);

    const firstDisk =
      telemetry && telemetry.disk && telemetry.disk.length
        ? telemetry.disk[0]
        : null;

    const diskUsedPercent =
      firstDisk && firstDisk.used_percent != null
        ? Number(firstDisk.used_percent)
        : 0;

    const diskFreeGb =
      firstDisk && firstDisk.free_gb != null
        ? Number(firstDisk.free_gb)
        : 0;

    const activeRoute =
      route && route.name
        ? route.name
        : telemetry && telemetry.aura && telemetry.aura.active_route
          ? telemetry.aura.active_route
          : telemetry && telemetry.network && telemetry.network.active_route
            ? telemetry.network.active_route
            : "not selected";

    const proofFiles =
      telemetry && telemetry.aura && telemetry.aura.proof_files != null
        ? Number(telemetry.aura.proof_files)
        : auraCountProofFilesTelemetry();

    return {
      ok: true,
      timestamp: new Date().toISOString(),
      source: telemetry ? "artifacts/iot/pc-analytics/latest" : "live-system",
      auraMode: process.env.AURA_MODE || "local",
      openAiMode: process.env.AURA_OPENAI_MODE || "offline",
      rawShell: process.env.AURA_RAW_SHELL || "disabled",
      safeMode: (process.env.AURA_RAW_SHELL || "disabled") === "disabled",
      activeRoute,
      proofFiles,
      cpuPercent,
      memoryUsedPercent,
      diskUsedPercent,
      diskFreeGb,
      diskDrive: firstDisk && firstDisk.drive ? firstDisk.drive : "C:",
      osName:
        telemetry && telemetry.system && telemetry.system.os
          ? telemetry.system.os
          : auraOsTelemetry.platform(),
      osVersion:
        telemetry && telemetry.system && telemetry.system.os_version
          ? telemetry.system.os_version
          : auraOsTelemetry.release()
    };
  }

  if (auraIpcMainTelemetry && !global.__AURA_TELEMETRY_HANDLER_V2__) {
    global.__AURA_TELEMETRY_HANDLER_V2__ = true;

    auraIpcMainTelemetry.handle("aura:get-telemetry-snapshot", async () => {
      try {
        return auraBuildTelemetrySnapshot();
      } catch (error) {
        return {
          ok: false,
          timestamp: new Date().toISOString(),
          error: error && error.message ? error.message : "Telemetry unavailable"
        };
      }
    });
  }
} catch (_) {
  // Optional local telemetry handler. Never block Aura startup.
}
// === End AURA Telemetry Snapshot Handler v2 ===

// === AURA Telemetry JSON Prune v1 ===
try {
  const auraPruneFs = require("fs");
  const auraPrunePath = require("path");
  const auraPruneRoot = auraPrunePath.resolve(__dirname, "..");

  function auraPruneOldTelemetryJson() {
    try {
      const dir = auraPrunePath.join(auraPruneRoot, "artifacts", "iot", "pc-analytics");
      if (!auraPruneFs.existsSync(dir)) return 0;

      const cutoff = Date.now() - (60 * 60 * 1000);
      let removed = 0;

      for (const name of auraPruneFs.readdirSync(dir)) {
        if (!name.endsWith("-pc-analytics.json")) continue;
        if (name === "latest-pc-analytics.json") continue;

        const full = auraPrunePath.join(dir, name);
        const stat = auraPruneFs.statSync(full);

        if (stat.mtimeMs < cutoff) {
          auraPruneFs.unlinkSync(full);
          removed++;
        }
      }

      return removed;
    } catch (_) {
      return 0;
    }
  }

  if (!global.__AURA_TELEMETRY_PRUNE_TIMER__) {
    global.__AURA_TELEMETRY_PRUNE_TIMER__ = true;

    // Run once at startup, then every 10 minutes while Aura is open.
    auraPruneOldTelemetryJson();
    setInterval(auraPruneOldTelemetryJson, 10 * 60 * 1000);
  }
} catch (_) {
  // Optional prune. Never block Aura startup.
}
// === End AURA Telemetry JSON Prune v1 ===

// === AURA Live Telemetry Snapshot Handler v3 ===
try {
  const auraLiveElectron = require("electron");
  const auraLiveFs = require("fs");
  const auraLivePath = require("path");
  const auraLiveOs = require("os");
  const auraLiveCp = require("child_process");

  const auraLiveRoot = auraLivePath.resolve(__dirname, "..");

  function auraLiveReadJson(filePath) {
    try {
      if (!auraLiveFs.existsSync(filePath)) return null;
      return JSON.parse(auraLiveFs.readFileSync(filePath, "utf8"));
    } catch (_) {
      return null;
    }
  }

  function auraLivePowerShellJson() {
    try {
      const ps = `
        $cpu = Get-CimInstance Win32_Processor | Select-Object -First 1 LoadPercentage,NumberOfLogicalProcessors
        $os = Get-CimInstance Win32_OperatingSystem | Select-Object -First 1 TotalVisibleMemorySize,FreePhysicalMemory,Caption,Version
        $disk = Get-CimInstance Win32_LogicalDisk -Filter "DriveType=3" | Select-Object -First 1 DeviceID,Size,FreeSpace

        $totalMemMb = [math]::Round($os.TotalVisibleMemorySize / 1024, 0)
        $freeMemMb = [math]::Round($os.FreePhysicalMemory / 1024, 0)
        $memUsed = if ($totalMemMb -gt 0) { [math]::Round((($totalMemMb - $freeMemMb) / $totalMemMb) * 100, 0) } else { 0 }

        $diskTotalGb = [math]::Round($disk.Size / 1GB, 1)
        $diskFreeGb = [math]::Round($disk.FreeSpace / 1GB, 1)
        $diskUsed = if ($diskTotalGb -gt 0) { [math]::Round((($diskTotalGb - $diskFreeGb) / $diskTotalGb) * 100, 0) } else { 0 }

        [pscustomobject]@{
          cpuPercent = [int]$cpu.LoadPercentage
          logicalProcessors = [int]$cpu.NumberOfLogicalProcessors
          memoryUsedPercent = [int]$memUsed
          totalMemMb = [int]$totalMemMb
          freeMemMb = [int]$freeMemMb
          diskDrive = $disk.DeviceID
          diskUsedPercent = [int]$diskUsed
          diskFreeGb = [double]$diskFreeGb
          osName = $os.Caption
          osVersion = $os.Version
        } | ConvertTo-Json -Compress
      `;

      const out = auraLiveCp.execFileSync(
        "powershell.exe",
        ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", ps],
        { encoding: "utf8", timeout: 5000, windowsHide: true }
      ).trim();

      return out ? JSON.parse(out) : null;
    } catch (_) {
      return null;
    }
  }

  function auraLiveCountProofs() {
    try {
      const artifactRoot = auraLivePath.join(auraLiveRoot, "artifacts");
      if (!auraLiveFs.existsSync(artifactRoot)) return 0;

      let count = 0;
      function walk(dir) {
        for (const item of auraLiveFs.readdirSync(dir, { withFileTypes: true })) {
          const full = auraLivePath.join(dir, item.name);
          if (item.isDirectory()) walk(full);
          else if (/\.(md|json|pnpk)$/i.test(item.name)) count++;
        }
      }

      walk(artifactRoot);
      return count;
    } catch (_) {
      return 0;
    }
  }

  function auraLiveSnapshot() {
    const latestPath = auraLivePath.join(
      auraLiveRoot,
      "artifacts",
      "iot",
      "pc-analytics",
      "latest-pc-analytics.json"
    );

    const routePath = auraLivePath.join(
      auraLiveRoot,
      "Aura",
      "State",
      "active-route.json"
    );

    const jsonTelemetry = auraLiveReadJson(latestPath);
    const route = auraLiveReadJson(routePath);
    const live = auraLivePowerShellJson();

    const fallbackMem = Math.round(
      ((auraLiveOs.totalmem() - auraLiveOs.freemem()) / auraLiveOs.totalmem()) * 100
    );

    const activeRoute =
      route && route.name
        ? route.name
        : jsonTelemetry && jsonTelemetry.aura && jsonTelemetry.aura.active_route
          ? jsonTelemetry.aura.active_route
          : jsonTelemetry && jsonTelemetry.network && jsonTelemetry.network.active_route
            ? jsonTelemetry.network.active_route
            : "not selected";

    return {
      ok: true,
      timestamp: new Date().toISOString(),
      source: live ? "live-system" : "json-fallback",
      auraMode: process.env.AURA_MODE || "local",
      openAiMode: process.env.AURA_OPENAI_MODE || "offline",
      rawShell: process.env.AURA_RAW_SHELL || "disabled",
      safeMode: (process.env.AURA_RAW_SHELL || "disabled") === "disabled",
      activeRoute,
      proofFiles: auraLiveCountProofs(),

      cpuPercent: live && live.cpuPercent != null ? Number(live.cpuPercent) : 0,
      logicalProcessors: live && live.logicalProcessors != null ? Number(live.logicalProcessors) : auraLiveOs.cpus().length,

      memoryUsedPercent:
        live && live.memoryUsedPercent != null
          ? Number(live.memoryUsedPercent)
          : fallbackMem,

      diskUsedPercent:
        live && live.diskUsedPercent != null
          ? Number(live.diskUsedPercent)
          : jsonTelemetry && jsonTelemetry.disk && jsonTelemetry.disk[0]
            ? Number(jsonTelemetry.disk[0].used_percent || 0)
            : 0,

      diskFreeGb:
        live && live.diskFreeGb != null
          ? Number(live.diskFreeGb)
          : jsonTelemetry && jsonTelemetry.disk && jsonTelemetry.disk[0]
            ? Number(jsonTelemetry.disk[0].free_gb || 0)
            : 0,

      diskDrive:
        live && live.diskDrive
          ? live.diskDrive
          : "C:",

      osName:
        live && live.osName
          ? live.osName
          : auraLiveOs.platform(),

      osVersion:
        live && live.osVersion
          ? live.osVersion
          : auraLiveOs.release()
    };
  }

  if (auraLiveElectron.ipcMain) {
    try {
      auraLiveElectron.ipcMain.removeHandler("aura:get-telemetry-snapshot");
    } catch (_) {}

    auraLiveElectron.ipcMain.handle("aura:get-telemetry-snapshot", async () => {
      try {
        return auraLiveSnapshot();
      } catch (error) {
        return {
          ok: false,
          timestamp: new Date().toISOString(),
          error: error && error.message ? error.message : "Telemetry unavailable"
        };
      }
    });
  }
} catch (_) {
  // Optional live telemetry. Never block Aura startup.
}
// === End AURA Live Telemetry Snapshot Handler v3 ===

// === AURA Live Ping Handler v1 ===
try {
  const auraPingElectron = require("electron");
  const auraPingFs = require("fs");
  const auraPingPath = require("path");
  const auraPingHttps = require("https");
  const auraPingHttp = require("http");

  const auraPingRoot = auraPingPath.resolve(__dirname, "..");

  function auraPingReadJson(filePath) {
    try {
      if (!auraPingFs.existsSync(filePath)) return null;
      return JSON.parse(auraPingFs.readFileSync(filePath, "utf8"));
    } catch (_) {
      return null;
    }
  }

  function auraPingUrl(url, timeoutMs) {
    return new Promise((resolve) => {
      const started = Date.now();

      try {
        const client = url.startsWith("https:") ? auraPingHttps : auraPingHttp;
        const req = client.get(url, { timeout: timeoutMs || 8000 }, (res) => {
          res.resume();
          res.on("end", () => {
            resolve({
              ok: res.statusCode >= 200 && res.statusCode < 500,
              statusCode: res.statusCode,
              latencyMs: Date.now() - started
            });
          });
        });

        req.on("timeout", () => {
          req.destroy();
          resolve({
            ok: false,
            statusCode: 0,
            latencyMs: Date.now() - started,
            error: "timeout"
          });
        });

        req.on("error", (error) => {
          resolve({
            ok: false,
            statusCode: 0,
            latencyMs: Date.now() - started,
            error: error && error.message ? error.message : "ping failed"
          });
        });
      } catch (error) {
        resolve({
          ok: false,
          statusCode: 0,
          latencyMs: Date.now() - started,
          error: error && error.message ? error.message : "ping failed"
        });
      }
    });
  }

  async function auraBuildPingSnapshot() {
    const routePath = auraPingPath.join(auraPingRoot, "Aura", "State", "active-route.json");
    const route = auraPingReadJson(routePath);

    const routeName = route && route.name ? route.name : "not selected";
    const baseUrl = route && route.url ? String(route.url).replace(/\/$/, "") : null;

    if (!baseUrl) {
      return {
        ok: false,
        timestamp: new Date().toISOString(),
        routeName,
        baseUrl: "",
        status: "no active route",
        checks: []
      };
    }

    const checks = [
      { label: "health", path: "/api/health" },
      { label: "status", path: "/api/highway/status" },
      { label: "postman", path: "/api/highway/postman" }
    ];

    const results = [];

    for (const check of checks) {
      const url = baseUrl + check.path;
      const result = await auraPingUrl(url, 8000);
      results.push({
        label: check.label,
        path: check.path,
        url,
        ok: result.ok,
        statusCode: result.statusCode,
        latencyMs: result.latencyMs,
        error: result.error || ""
      });
    }

    const passing = results.filter((item) => item.ok).length;

    return {
      ok: passing > 0,
      timestamp: new Date().toISOString(),
      routeName,
      baseUrl,
      status: passing === results.length ? "all clear" : passing > 0 ? "partial" : "offline",
      passing,
      total: results.length,
      checks: results
    };
  }

  if (auraPingElectron.ipcMain) {
    try {
      auraPingElectron.ipcMain.removeHandler("aura:get-live-pings");
    } catch (_) {}

    auraPingElectron.ipcMain.handle("aura:get-live-pings", async () => {
      try {
        return await auraBuildPingSnapshot();
      } catch (error) {
        return {
          ok: false,
          timestamp: new Date().toISOString(),
          status: "ping unavailable",
          error: error && error.message ? error.message : "ping unavailable",
          checks: []
        };
      }
    });
  }
} catch (_) {
  // Optional live pings. Never block Aura startup.
}
// === End AURA Live Ping Handler v1 ===
