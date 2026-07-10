const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");

let OpenAIClient = null;

function readJson(fileName, fallback) {
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, fileName), "utf8"));
  } catch {
    return fallback;
  }
}

function getSystemInstructions() {
  try {
    return fs.readFileSync(path.join(__dirname, "aura-system-prompt.md"), "utf8");
  } catch {
    return "You are Aura-Core GPT Desktop. Be professional, concise, safe, and practical.";
  }
}

function recognizeCommand(input) {
  const dictionary = readJson("aura-command-dictionary.json", { rules: [] });
  const normalized = String(input || "").toLowerCase();

  for (const rule of dictionary.rules || []) {
    for (const trigger of rule.triggers || []) {
      if (normalized.includes(String(trigger).toLowerCase())) {
        return rule;
      }
    }
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
  const localCommand = recognizeCommand(userText);

  const client = await getClient();

  const input = localCommand
    ? `Recognized local command intent: ${localCommand.intent}

Local command rule:
${localCommand.response}

User request:
${userText}

Respond professionally and concisely. Give the exact next step. Do not execute commands.`
    : userText;

  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL || "gpt-5.5",
    instructions: getSystemInstructions(),
    input,
  });

  return response.output_text || "";
});
