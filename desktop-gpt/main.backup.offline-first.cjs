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
    text.includes("verroute -> %{http_code} %{time_total} %{content_type}`n\" \"$BASE$route\"",
      "}",
      "",
      "Expected: all routes return HTTP 200. Failover remains blocked."
   cel readiness") ||
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

  return null;
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
  const local = offlineReply(userText);

  if (local) {
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
