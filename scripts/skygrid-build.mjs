import { sanitizeUnsupportedNpmEnv } from "./check-npm-env-config.mjs";

const removedConfig = sanitizeUnsupportedNpmEnv();

if (removedConfig.length > 0) {
  console.warn(
    `SKYGRID build removed ${removedConfig.length} unsupported inherited npm config variable(s) before running build steps.`
  );
}

await import("./validate-pnpk.mjs");
await import("./verify-skygrid-manifest-sync.mjs");
await import("./vercel-build.mjs");
