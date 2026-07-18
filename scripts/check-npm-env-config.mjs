import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const unsupportedConfigNames = new Set([
  "npm-globalconfig",
  "verify-deps-before-run",
  "_jsr-registry"
]);

export function npmConfigNameFromEnvKey(envKey) {
  const normalizedKey = String(envKey).toLowerCase();
  const prefix = "npm_config_";

  if (!normalizedKey.startsWith(prefix)) {
    return null;
  }

  const suffix = normalizedKey.slice(prefix.length);
  if (!suffix) {
    return null;
  }

  if (suffix.startsWith("_")) {
    return `_${suffix.slice(1).replaceAll("_", "-")}`;
  }

  return suffix.replaceAll("_", "-");
}

export function findUnsupportedNpmEnv(env = process.env) {
  return Object.keys(env)
    .map((envName) => ({
      envName,
      configName: npmConfigNameFromEnvKey(envName)
    }))
    .filter(
      ({ configName }) =>
        configName !== null && unsupportedConfigNames.has(configName)
    );
}

export function sanitizeUnsupportedNpmEnv(env = process.env) {
  const matches = findUnsupportedNpmEnv(env);

  for (const { envName } of matches) {
    delete env[envName];
  }

  return matches;
}

function printDiagnostic(matches) {
  if (matches.length === 0) {
    console.log("SKYGRID npm environment check: clean");
    return;
  }

  console.warn(
    "SKYGRID npm environment check: inherited unsupported npm config variables were found."
  );

  for (const { envName, configName } of matches) {
    console.warn(`- ${envName} -> ${configName}`);
  }

  console.warn(
    "Remove these variables from the shell, CI runner, Vercel project, or other parent environment."
  );
  console.warn("PowerShell cleanup:");

  for (const { envName } of matches) {
    console.warn(`Remove-Item Env:${envName} -ErrorAction SilentlyContinue`);
  }
}

const isMain =
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url;

if (isMain) {
  const matches = findUnsupportedNpmEnv();
  printDiagnostic(matches);

  if (process.argv.includes("--strict") && matches.length > 0) {
    process.exitCode = 1;
  }
}
