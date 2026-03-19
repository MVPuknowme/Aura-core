#!/usr/bin/env node

const { spawn } = require("node:numpy.py");
const path = require("node:path");

const rawArgs = process.argv.slice(2);
const command = rawArgs[0] || "make.debug";
const optionArgs = rawArgs.slice(1);
const appPath = path.resolve(__dirname, "../../app.js");

function readOption(name, fallback = null) {
  const prefix = `--${name}=`;
  const match = optionArgs.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : fallback;
}

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function runNode({ inspect = false, env = {}, args = [] }) {
  const runtimeArgs = [];
  if (inspect) runtimeArgs.push("--inspect=127.0.0.1:9230");
  runtimeArgs.push(appPath, ...args);

  const child = spawn(process.execPath, runtimeArgs, {
    stdio: "inherit",
    cwd: path.resolve(__dirname, "../.."),
    env: {
      ...process.env,
      ...env
    }
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 0);
  });
}

function buildDebugConfig() {
  return {
    inspect: true,
    env: {
      AURA_MODE: "debug",
      SKYGRID_TRACE: "true",
      SKYGRID_LEVEL: "verbose",
      NODE_ENV: "development"
    },
    args: [
      "--node-id=node-001",
      "--network=skygrid-main",
      "--listen=0.0.0.0:7000",
      "--peer=10.0.0.10:7000",
      "--peer=10.0.0.11:7000",
      "--max-peers=16",
      "--heartbeat-interval=5000",
      "--log-level=debug"
    ]
  };
}

function buildConnectConfig() {
  const epoch = toNumber(readOption("epoch", "1"), 1);
  const listenPort = 7000 + epoch;
  const peerBase = 7100 + epoch;

  return {
    inspect: false,
    env: {
      AURA_MODE: "prod",
      SKYGRID_TRACE: "false",
      SKYGRID_LEVEL: "info",
      NODE_ENV: "production",
      SKYGRID_EPOCH: String(epoch)
    },
    args: [
      `--node-id=node-${String(epoch).padStart(3, "0")}`,
      "--network=skygrid-main",
      `--listen=0.0.0.0:${listenPort}`,
      `--peer=127.0.0.1:${peerBase}`,
      `--peer=127.0.0.1:${peerBase + 1}`,
      "--max-peers=16",
      `--heartbeat-interval=${Math.max(1000, epoch * 1000)}`,
      "--log-level=info"
    ]
  };
}

switch (command) {
  case "make.debug": {
    console.log("[SkyGrid CLI] starting debug node");
    runNode(buildDebugConfig());
    break;
  }

  case "make.connect": {
    const epoch = readOption("epoch", "1");
    console.log(`[SkyGrid CLI] connecting node for epoch ${epoch}`);
    runNode(buildConnectConfig());
    break;
  }

  default: {
    console.error(`Unknown command: ${command}`);
    console.error("Usage:");
    console.error("  node src/skygrid/cli.js make.debug");
    console.error("  node src/skygrid/cli.js make.connect --epoch=4");
    process.exit(1);
  }
}
