import test from "node:test";
import assert from "node:assert/strict";

import {
  findUnsupportedNpmEnv,
  npmConfigNameFromEnvKey,
  sanitizeUnsupportedNpmEnv
} from "../scripts/check-npm-env-config.mjs";

test("normalizes npm config environment variable names", () => {
  assert.equal(
    npmConfigNameFromEnvKey("NPM_CONFIG_NPM_GLOBALCONFIG"),
    "npm-globalconfig"
  );
  assert.equal(
    npmConfigNameFromEnvKey("npm_config_verify_deps_before_run"),
    "verify-deps-before-run"
  );
  assert.equal(
    npmConfigNameFromEnvKey("NPM_CONFIG__JSR_REGISTRY"),
    "_jsr-registry"
  );
  assert.equal(npmConfigNameFromEnvKey("PATH"), null);
});

test("finds only the unsupported inherited npm config variables", () => {
  const env = {
    PATH: "test",
    NPM_CONFIG_CACHE: "/tmp/npm-cache",
    NPM_CONFIG_NPM_GLOBALCONFIG: "1",
    npm_config_verify_deps_before_run: "true",
    NPM_CONFIG__JSR_REGISTRY: "https://npm.jsr.io"
  };

  assert.deepEqual(findUnsupportedNpmEnv(env), [
    {
      envName: "NPM_CONFIG_NPM_GLOBALCONFIG",
      configName: "npm-globalconfig"
    },
    {
      envName: "npm_config_verify_deps_before_run",
      configName: "verify-deps-before-run"
    },
    {
      envName: "NPM_CONFIG__JSR_REGISTRY",
      configName: "_jsr-registry"
    }
  ]);
});

test("sanitizes unsupported variables without removing supported npm config", () => {
  const env = {
    NPM_CONFIG_CACHE: "/tmp/npm-cache",
    NPM_CONFIG_NPM_GLOBALCONFIG: "1",
    NPM_CONFIG_VERIFY_DEPS_BEFORE_RUN: "true",
    NPM_CONFIG__JSR_REGISTRY: "https://npm.jsr.io"
  };

  const removed = sanitizeUnsupportedNpmEnv(env);

  assert.equal(removed.length, 3);
  assert.deepEqual(env, {
    NPM_CONFIG_CACHE: "/tmp/npm-cache"
  });
});
