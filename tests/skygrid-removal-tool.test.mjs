import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { run } from "../scripts/skygrid-removal-tool.mjs";

async function makeFixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "skygrid-removal-"));
  await mkdir(path.join(root, "config"), { recursive: true });
  await mkdir(path.join(root, "scripts"), { recursive: true });
  await mkdir(path.join(root, ".github/workflows"), { recursive: true });

  await writeFile(path.join(root, "config/skygrid-removal-map.v1.json"), JSON.stringify({
    schema_version: "1.0.0",
    tool: "skygrid-removal-tool",
    principles: ["fail_closed", "receipt_first"],
    targets: {
      "vercel-public-runtime-edge": {
        safe_default: true,
        operations: [
          {
            type: "prune_json_array_items",
            path: "vercel.json",
            array_path: "rewrites",
            match_any: [{ source: "/" }, { source: "/health.json" }]
          }
        ]
      },
      "remote-public-ci-edge": {
        safe_default: true,
        operations: [
          {
            type: "assert_text",
            path: ".github/workflows/skygrid-ramp-smoke.yml",
            patterns: ["SKYGRID_CHECK_VERCEL: \"false\""]
          },
          {
            type: "assert_absent_text",
            path: "scripts/skygrid-ramp-smoke.sh",
            patterns: ["VERCEL_AUTOMATION_BYPASS_SECRET"]
          }
        ]
      }
    }
  }, null, 2));

  await writeFile(path.join(root, "vercel.json"), JSON.stringify({
    rewrites: [
      { source: "/", destination: "/api/runtime" },
      { source: "/health.json", destination: "/api/runtime" },
      { source: "/dispatch", destination: "/api/runtime" }
    ]
  }, null, 2));

  await writeFile(path.join(root, ".github/workflows/skygrid-ramp-smoke.yml"), "SKYGRID_CHECK_VERCEL: \"false\"\n");
  await writeFile(path.join(root, "scripts/skygrid-ramp-smoke.sh"), "#!/usr/bin/env bash\necho local\n");
  return root;
}

test("dry-run plans removal without mutating vercel.json", async () => {
  const root = await makeFixture();
  const logger = { log() {}, warn() {}, error() {} };

  const receipt = await run(["--dry-run"], root, logger);
  const parsed = JSON.parse(await readFile(path.join(root, "vercel.json"), "utf8"));

  assert.equal(receipt.ok, true);
  assert.equal(receipt.mode, "dry-run");
  assert.equal(parsed.rewrites.length, 3);
  assert.equal(receipt.results.some((result) => result.status === "would_remove"), true);
});

test("apply removes only mapped rewrites and leaves local route", async () => {
  const root = await makeFixture();
  const logger = { log() {}, warn() {}, error() {} };

  const receipt = await run(["--apply", "--approved", "--target=vercel-public-runtime-edge"], root, logger);
  const parsed = JSON.parse(await readFile(path.join(root, "vercel.json"), "utf8"));

  assert.equal(receipt.ok, true);
  assert.deepEqual(parsed.rewrites, [
    { source: "/dispatch", destination: "/api/runtime" }
  ]);
});
