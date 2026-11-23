import assert from "node:assert/strict";
import test from "node:test";
import { ATT_DISCOVERY_ENDPOINTS, inspectAttDiscovery } from "../lib/att-readonly-discovery.mjs";

function mockResponse(url, { status = 200, type, content } = {}) {
  const isTxt = url.endsWith("/llms.txt");
  const payload = content ?? (isTxt ? "# AT&T\nTest public index\n" : JSON.stringify({ schema: "sample" }));
  const bytes = Buffer.from(payload);
  return {
    ok: status >= 200 && status < 300,
    status,
    url,
    headers: new Map([["content-type", type ?? (isTxt ? "text/plain; charset=utf-8" : "application/json")]]),
    async arrayBuffer() { return bytes; }
  };
}

test("only hardcoded public AT&T discovery paths are fetched with no credentials or redirects", async () => {
  const calls = [];
  const receipt = await inspectAttDiscovery({
    fetchImpl: async (url, options) => {
      calls.push([url, options]);
      return mockResponse(url);
    },
    observedAt: new Date("2026-11-22T20:00:00.000Z")
  });
  assert.equal(calls.length, 4);
  assert.deepEqual(calls.map(([url]) => new URL(url).pathname), ATT_DISCOVERY_ENDPOINTS.map((e) => e.path));
  for (const [url, options] of calls) {
    assert.equal(new URL(url).origin, "https://www.att.com");
    assert.equal(options.method, "GET");
    assert.equal(options.redirect, "error");
    assert.equal(options.credentials, "omit");
    assert.equal(options.headers.authorization, undefined);
  }
  assert.equal(receipt.decision, "DISCOVERY_VERIFIED");
  assert.equal(receipt.pnpk_preflight.decision, "HOLD_UNAUTHORIZED");
  assert.equal(Object.values(receipt.pnpk_preflight).some((value) => value === true), false);
  assert.match(receipt.receipt_hash, /^sha256:[0-9a-f]{64}$/);
  assert.equal(JSON.stringify(receipt).includes("Test public index"), false);
});

test("unavailable discovery resource fails closed without granting permissions", async () => {
  const receipt = await inspectAttDiscovery({
    fetchImpl: async (url) => mockResponse(url, { status: url.includes("server-card") ? 403 : 200 })
  });
  assert.equal(receipt.decision, "FAIL_CLOSED");
  assert.equal(receipt.results.find((item) => item.id === "mcp_server_card").reason, "http_unavailable");
  assert.equal(receipt.pnpk_preflight.carrier_data_access_allowed, false);
});

test("malformed JSON and HTML responses cannot masquerade as agent capabilities", async () => {
  const receipt = await inspectAttDiscovery({
    fetchImpl: async (url) => url.includes("agent-card")
      ? mockResponse(url, { content: "not json" })
      : url.includes("agent-skills")
        ? mockResponse(url, { type: "text/html", content: "<html>Blocked</html>" })
        : mockResponse(url)
  });
  assert.equal(receipt.decision, "FAIL_CLOSED");
  assert.equal(receipt.results.find((r) => r.id === "agent_card").reason, "invalid_document");
  assert.equal(receipt.results.find((r) => r.id === "agent_skills_index").reason, "unexpected_content_type");
});

test("oversized payloads, redirects, and network failures fail closed", async () => {
  const receipt = await inspectAttDiscovery({
    fetchImpl: async (url) => {
      if (url.includes("agent-card")) return mockResponse(url, { content: "x".repeat(262145) });
      if (url.includes("server-card")) return { ...mockResponse(url), url: "https://evil.invalid/redirect" };
      if (url.includes("agent-skills")) throw new Error("token=private-sensitive-value");
      return mockResponse(url);
    }
  });
  assert.equal(receipt.decision, "FAIL_CLOSED");
  assert.equal(receipt.results.find((r) => r.id === "agent_card").reason, "body_too_large");
  assert.equal(receipt.results.find((r) => r.id === "mcp_server_card").reason, "redirect_blocked");
  assert.equal(receipt.results.find((r) => r.id === "agent_skills_index").reason, "fetch_unavailable");
  assert.equal(JSON.stringify(receipt).includes("private-sensitive-value"), false);
});

test("invalid timeout fails before any network call", async () => {
  await assert.rejects(inspectAttDiscovery({ timeoutMs: -1, fetchImpl: () => { throw Error("unexpected"); } }), /timeoutMs_invalid/);
});
