import { applyOperatorMode } from "../config/skygrid-operator.mjs";

const args = process.argv.slice(2);
const command = args[0] || "status";

function argumentValue(name) {
  const prefix = `${name}=`;
  const direct = args.find((value) => value.startsWith(prefix));
  if (direct) return direct.slice(prefix.length);
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

const operator = argumentValue("--operator");

if (command === "status") {
  const config = applyOperatorMode({ operator });
  console.log(JSON.stringify({ ok: true, ...config }, null, 2));
} else if (command === "local") {
  const config = applyOperatorMode({ operator, runtimeMode: "local" });
  console.log(`SKYGRID operator ${config.operator} starting local runtime`);
  await import("./skygrid-local-runtime-server.mjs");
} else if (command === "local-container") {
  const vercelBypass = String(process.env.SKYGRID_VERCEL_BYPASS || "") === "local-container" ||
    args.includes("--vercel-bypass");
  const config = applyOperatorMode({
    operator,
    runtimeMode: "local-container",
    vercelBypass
  });
  process.env.HOST ||= "0.0.0.0";
  console.log(
    `SKYGRID operator ${config.operator} starting local container${config.vercelBypass ? " as Vercel hosting fallback" : ""}`
  );
  await import("./skygrid-local-runtime-server.mjs");
} else if (command === "vercel-build") {
  const config = applyOperatorMode({ operator, runtimeMode: "vercel-build" });
  console.log(`SKYGRID operator ${config.operator} building Vercel artifact`);
  await import("./vercel-build.mjs");
} else {
  console.error(`Unknown operator command: ${command}`);
  process.exitCode = 2;
}
