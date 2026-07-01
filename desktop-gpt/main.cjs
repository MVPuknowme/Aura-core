const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");

const auraUserDataPath = path.join(__dirname, ".runtime", "userData");
const auraCachePath = path.join(__dirname, ".runtime", "cache");

fs.mkdirSync(auraUserDataPath, { recursive: true });
fs.mkdirSync(auraCachePath, { recursive: true });

app.setPath("userData", auraUserDataPath);
app.setPath("cache", auraCachePath);
app.commandLine.appendSwitch("disk-cache-dir", auraCachePath);
app.commandLine.appendSwitch("disable-gpu-shader-disk-cache");

let OpenAIClient = null;

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

function offlineReply(userText) {
  const text = String(userText || "").toLowerCase();

  if (
    text === "hey aura" ||
    text === "hi aura" ||
    text === "hello aura" ||
    text === "good morning aura" ||
    text === "good evening aura"
  ) {
    return [
      "Status: online in local mode.",
      "",
      "Hello MVP. Aura Desktop is running.",
      "",
      "Available offline commands:",
      "- confirm your operating profile",
      "- check her vitals",
      "- check vercel readiness",
      "- check failover",
      "- git status",
      "- scan secrets",
      "",
      "Mode: local offline response. No API call used."
    ].join("\n");
  }

  if (
    text.includes("operating profile") ||
    text.includes("confirm your") ||
    text.includes("who are you") ||
    text.includes("your profile")
  ) {
    return [
      "Status: operating profile loaded.",
      "",
      "Operator: Michael Vincent Patrick / MVPuknowme.",
      "Project: SKYGRID Emergency Data On-Ramp.",
      "Repo paths: E:\\Aura-core, E:\\Aura-core\\desktop-gpt, E:\\aura_wallet_core.",
      "Vercel: aura-core-t2t5 under scope home-e539c0b1.",
      "Public URL: https://aura-core-t2t5.vercel.app.",
      "Safe failover rule: failover remains blocked unless MVP explicitly approves and health quorum is verified.",
      "Command mode: local offline command recognition enabled.",
      "",
      "Next action: run the read-only SKYGRID vitals check."
    ].join("\n");
  }

  if (
    text.includes("check her vitals") ||
    text.includes("check vitals") ||
    text.includes("run vitals") ||
    text.includes("health check") ||
    text.includes("is she healthy")
  ) {
    return [
      "Status: vitals check recognized.",
      "",
      "Run from E:\\Aura-core:",
      "",
      "cd E:\\Aura-core",
      "$BASE=\"https://aura-core-t2t5.vercel.app\"",
      "$routes=@(\"/api/health\",\"/api/panels/summary\",\"/api/failover/status\",\"/api/highway/status\",\"/api/highway/postman\")",
      "foreach ($route in $routes) {",
      "  curl.exe -sS -o NUL -w \"$route -> %{http_code} %{time_total} %{content_type}`n\" \"$BASE$route\"",
      "}",
      "",
      "Expected: all routes return HTTP 200. Failover remains blocked."
    ].join("\n");
  }

  if (
    text.includes("vercel readiness") ||
    text.includes("check vercel") ||
    text.includes("panel readiness") ||
    text.includes("aws persistence") ||
    text.includes("proof lane")
  ) {
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
      "  s3Bucket              = $panel.configured.s3Bucket",
      "  awsPersistenceReady   = $panel.status.aws_persistence.ready",
      "  failoverAwsReady      = $panel.failover.readiness.aws_persistence_ready",
      "  failoverState         = $panel.failover.failover_state",
      "  productionPolicyReady = $panel.failover.readiness.production_policy_ready",
      "}",
      "",
      "Expected: AWS flags true, failoverState blocked, productionPolicyReady false."
    ].join("\n");
  }

  if (text.includes("failover") || text.includes("production lock")) {
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

  if (
    text.includes("git status") ||
    text.includes("repo status") ||
    text.includes("working tree")
  ) {
    return [
      "Status: git status recognized.",
      "",
      "Run from the active repo:",
      "",
      "git status -sb",
      "git log -1 --oneline"
    ].join("\n");
  }

  if (
    text.includes("scan secrets") ||
    text.includes("secret smell") ||
    text.includes("check keys") ||
    text.includes("find tokens")
  ) {
    return [
      "Status: secret scan recognized.",
      "",
      "Run from E:\\Aura-core:",
      "",
      "cd E:\\Aura-core",
      "Get-ChildItem -Recurse -File -Include \"*.js\",\"*.mjs\",\"*.json\",\"*.md\",\"*.txt\",\"*.yaml\",\"*.yml\" -ErrorAction SilentlyContinue |",
      "  Where-Object { $_.FullName -notmatch \"\\\\node_modules\\\\\" -and $_.FullName -notmatch \"\\\\.git\\\\\" } |",
      "  Select-String -Pattern \"sk-|PRIVATE_KEY|AWS_SECRET|STRIPE_SECRET|SUPABASE_SERVICE|VERCEL_TOKEN|MNEMONIC|SEED_PHRASE\" |",
      "  Select-Object Path, LineNumber, Pattern |",
      "  Format-Table -AutoSize",
      "",
      "Expected: show pattern locations only. Do not print secret values."
    ].join("\n");
  }

  if (
    text.includes("train aura") ||
    text.includes("training mode") ||
    text.includes("teach aura") ||
    text.includes("learn current state")
  ) {
    return [
      "Status: training mode recognized.",
      "",
      "Current SKYGRID training state:",
      "- Product: SKYGRID Emergency Data On-Ramp.",
      "- Runtime: controlled pilot.",
      "- Public routes: mostly green.",
      "- AWS persistence: ready, but visible config still shows s3Bucket false.",
      "- lambdaRouterUrl: false until an actual Lambda router URL is provided.",
      "- iOS fallback: should stay passkey-free and wallet-signing-free.",
      "- Failover: must remain blocked.",
      "- Production gates: health quorum, rollback, and certified policy are not ready yet.",
      "",
      "Next safe training action: expand offline commands and keep all routing read-only."
    ].join("\n");
  }

  if (
    text.includes("what is blocked") ||
    text.includes("current blockers") ||
    text.includes("blocker report") ||
    text.includes("what remains blocked")
  ) {
    return [
      "Status: blocker report recognized.",
      "",
      "Remaining blockers:",
      "- s3Bucket: false in Vercel runtime config.",
      "- lambdaRouterUrl: false because no Lambda router URL is wired yet.",
      "- health_quorum_ready: false.",
      "- rollback_ready: false.",
      "- production_policy_ready: false.",
      "",
      "Safe interpretation:",
      "- Controlled pilot can continue.",
      "- Production failover remains blocked.",
      "- No wallet signing, transaction broadcast, payment execution, private data movement, or device activation."
    ].join("\n");
  }

  if (
    text.includes("s3 bucket") ||
    text.includes("s3bucket") ||
    text.includes("bucket env")
  ) {
    return [
      "Status: S3 bucket check recognized.",
      "",
      "Known expected production env:",
      "SKYGRID_S3_BUCKET=skygrid-emergency-vault-1782686975",
      "",
      "Run from E:\\Aura-core:",
      "",
      "cd E:\\Aura-core",
      "npx vercel env ls production --scope home-e539c0b1",
      "",
      "If missing, add SKYGRID_S3_BUCKET to production and redeploy.",
      "",
      "Do not print secrets. The bucket name itself is not a secret."
    ].join("\n");
  }

  if (
    text.includes("ios blocker") ||
    text.includes("ios fallback") ||
    text.includes("iphone") ||
    text.includes("safari")
  ) {
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
      "curl.exe -i \"$BASE/api/compat/ios\"",
      "",
      "Expected: HTTP 200 and fallback-safe policy."
    ].join("\n");
  }

  if (
    text.includes("route traffic") ||
    text.includes("routing policy") ||
    text.includes("route policy")
  ) {
    return [
      "Status: routing policy recognized.",
      "",
      "Allowed now:",
      "- Read-only route checks.",
      "- Public health checks.",
      "- Vercel readiness checks.",
      "- iOS compatibility checks.",
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

  if (
    text.includes("launch status") ||
    text.includes("pilot status") ||
    text.includes("skygrid status")
  ) {
    return [
      "Status: SKYGRID controlled pilot status recognized.",
      "",
      "Current state:",
      "- Health: green.",
      "- Highway: online.",
      "- Postman: ready.",
      "- Dashboard routes: ready.",
      "- AWS persistence: ready with remaining config cleanup.",
      "- Failover: blocked by design.",
      "- Guardrails: active.",
      "",
      "Controlled pilot can continue. Production failover is not certified yet."
    ].join("\n");
  }
  if (
    text.includes("github status") ||
    text.includes("git hub status") ||
    text.includes("aura core github") ||
    text.includes("github aura core") ||
    text.includes("wire github") ||
    text.includes("wire git hub")
  ) {
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
      "- Push current dev branch with git push -u origin HEAD.",
      "",
      "Mode: local offline response. No API call used."
    ].join("\n");
  }

  if (
    text.includes("github sync") ||
    text.includes("git sync") ||
    text.includes("sync aura core") ||
    text.includes("sync repo")
  ) {
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
      "Rule: do not force push. If a conflict appears, stop and inspect it first.",
      "",
      "Mode: local offline response. No API call used."
    ].join("\n");
  }

  if (
    text.includes("github proof") ||
    text.includes("proof to github") ||
    text.includes("postman proof to github")
  ) {
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
      "Expected: Newman failed requests = 0.",
      "",
      "Mode: local offline response. No API call used."
    ].join("\n");
  }
  if (
    text.includes("wonder bread") ||
    text.includes("our imaginations") ||
    text.includes("imagination into working systems") ||
    text.includes("summarize the current aura-core state") ||
    text.includes("summarize current aura-core state") ||
    text.includes("summarize current aura core state")
  ) {
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
      "Next safe action: continue proof-driven local training.",
      "",
      "Mode: local offline response. No API call used."
    ].join("\n");
  }
  return null;
}

function wantsApprovedRouteProbe(userText) {
  const text = String(userText || "").toLowerCase();

  return (
    text.includes("probe approved routes") ||
    text.includes("inspect approved routes") ||
    text.includes("run approved route check") ||
    text.includes("check approved routes") ||
    text.includes("route probe") ||
    text.includes("traffic inspection")
  );
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

async function probeApprovedRoutes() {
  const routes = getApprovedRoutes();

  if (!routes.length) {
    return [
      "Status: route probe blocked.",
      "",
      "Blocker: no approved routes found in aura-route-policy.json.",
      "",
      "Mode: local offline response. No API call used."
    ].join("\n");
  }

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
        headers: {
          "User-Agent": "Aura-GPT-Desktop-Route-Probe"
        }
      });

      clearTimeout(timeout);

      const elapsed = Date.now() - started;
      results.push(`${url} -> ${response.status} ${response.statusText} ${elapsed}ms`);
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
    "Guardrail: no wallet signing, no transaction broadcast, no payment execution, no private data movement, no production failover unlock.",
    "",
    "Mode: local offline response. No API call used."
  ].join("\n");
}
function wantsPostmanApiGen(userText) {
  const text = String(userText || "").toLowerCase();

  return (
    text.includes("postman api gen") ||
    text.includes("postman api generator") ||
    text.includes("generate postman") ||
    text.includes("make postman collection") ||
    text.includes("build postman collection") ||
    text.includes("postman collection")
  );
}

function buildPostmanItem(url) {
  const parsed = new URL(url);
  const pathParts = parsed.pathname.split("/").filter(Boolean);
  const query = Array.from(parsed.searchParams.entries()).map(([key, value]) => ({
    key,
    value
  }));

  return {
    name: parsed.pathname,
    request: {
      method: "GET",
      header: [
        {
          key: "User-Agent",
          value: "Aura-GPT-Desktop-Postman-Gen"
        }
      ],
      url: {
        raw: url,
        protocol: parsed.protocol.replace(":", ""),
        host: parsed.hostname.split("."),
        path: pathParts,
        ...(query.length ? { query } : {})
      },
      description: "Read-only SKYGRID Emergency Data On-Ramp route check generated locally by Aura Desktop."
    },
    response: []
  };
}

function generatePostmanCollection() {
  const routes = getApprovedRoutes();

  if (!routes.length) {
    return [
      "Status: Postman API generation blocked.",
      "",
      "Blocker: no approved routes found in aura-route-policy.json.",
      "",
      "Mode: local offline response. No API call used."
    ].join("\n");
  }

  const safeRoutes = routes.filter((url) =>
    String(url).startsWith("https://aura-core-t2t5.vercel.app/")
  );

  const blockedRoutes = routes.filter((url) =>
    !String(url).startsWith("https://aura-core-t2t5.vercel.app/")
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
    variable: [
      {
        key: "base_url",
        value: "https://aura-core-t2t5.vercel.app"
      }
    ]
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
    ...(blockedRoutes.length
      ? ["Blocked non-allowlisted routes:", ...blockedRoutes.map((url) => `- ${url}`), ""]
      : []),
    "Run from E:\\Aura-core:",
    "",
    "npx newman run .\\postman\\skygrid-aura-desktop.generated.collection.json",
    "",
    "Guardrail: generated collection uses GET only against approved SKYGRID routes.",
    "",
    "Mode: local offline response. No API call used."
  ].join("\n");
}
async function getClient() {
  if (!OpenAIClient) {
    const { default: OpenAI } = await import("openai");

    if (!process.env.OPENAI_API_KEY) {
      throw new Error("Missing OPENAI_API_KEY environment variable.");
    }

    OpenAIClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
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
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  win.loadFile("index.html");
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("ask-gpt", async (_event, userText) => {
  // AURA_POSTMAN_FIRST_GATE
  if (typeof wantsPostmanApiGen === "function" && wantsPostmanApiGen(userText)) {
    return generatePostmanCollection();
  }
  const local = offlineReply(userText);

  if (local) {
    if (String(local).includes("Mode: local offline response. No API call used.")) {
    return local;
}

if (String(local).includes("Mode: local offline response. No API call used.")) {
    return local;
}

return `${local}\n\nMode: local offline response. No API call used.`;
  }

  try {
    const client = await getClient();

    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5.5",
      instructions: getSystemInstructions(),
      input: userText,
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
        "Local offline commands still work for: operating profile, vitals, Vercel readiness, failover, git status, and secret scan."
      ].join("\n");
    }

    return `Status: API error.\n\n${error.message}`;
  }
});
