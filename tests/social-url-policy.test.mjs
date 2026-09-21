import assert from "node:assert/strict";
import test from "node:test";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import {
  findBlockedExternalUrl,
  inspectExternalUrl,
  stripBlockedTrackingParameters
} from "../lib/social-url-policy.mjs";

test("quarantines mibextid and other mibex-prefixed query parameters", () => {
  const result = inspectExternalUrl("https://www.facebook.com/share/1LxkDWRJpb/?mibextid=wwXIfr");
  assert.equal(result.blocked, true);
  assert.equal(result.reason, "untrusted_url_indicator");
  assert.equal(result.parameter, "mibextid");
  assert.equal(result.malware_confirmed, false);

  assert.equal(
    inspectExternalUrl("https://example.com/?mibex=test").blocked,
    true
  );
});

test("allows the same Facebook share URL after blocked tracking metadata is removed", () => {
  const cleaned = stripBlockedTrackingParameters(
    "https://www.facebook.com/share/1LxkDWRJpb/?mibextid=wwXIfr"
  );
  assert.equal(cleaned, "https://www.facebook.com/share/1LxkDWRJpb/");
  assert.equal(inspectExternalUrl(cleaned).blocked, false);
});

test("finds blocked URLs nested in intake payloads", () => {
  const result = findBlockedExternalUrl({
    source: "social",
    payload: {
      reference: "https://www.facebook.com/share/abc/?mibextid=opaque"
    }
  });

  assert.ok(result);
  assert.equal(result.trail, "$.payload.reference");
});

test("normal config JSON does not retain blocked social URL parameters", async () => {
  const configDir = new URL("../config/", import.meta.url);
  const entries = await readdir(configDir);

  for (const name of entries.filter((entry) => entry.endsWith(".json"))) {
    const full = new URL(name, configDir);
    const raw = await readFile(full, "utf8");
    const normalized = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
    const parsed = JSON.parse(normalized);

    const match = findBlockedExternalUrl(parsed, `config/${name}`);
    assert.equal(
      match,
      null,
      `blocked social URL indicator found in ${name}: ${match?.parameter || "unknown"}`
    );
  }
});
