import test from "node:test";
import assert from "node:assert/strict";
import handler from "../api/runtime.mjs";

function createRequest({ method = "POST", path = "/api/node-lease/preflight", body } = {}) {
  const payload = body === undefined ? "" : JSON.stringify(body);
  return {
    method,
    url: path,
    headers: { host: "127.0.0.1:3000" },
    async *[Symbol.asyncIterator]() {
      if (payload) yield Buffer.from(payload);
    }
  };
}

function createResponse() {
  const responseHeaders = {};
  let responseBody = "";
  return {
    statusCode: 200,
    setHeader(name, value) { responseHeaders[name.toLowerCase()] = value; },
    end(chunk) { responseBody += String(chunk ?? ""); },
    result() {
      return { statusCode: this.statusCode, headers: responseHeaders, body: responseBody };
    }
  };
}

async function invoke(input) {
  const req = createRequest(input);
  const res = createResponse();
  await handler(req, res);
  return res.result();
}

test("serves the interactive capacity lease page", async () => {
  const response = await invoke({ method: "GET", path: "/lease" });
  assert.equal(response.statusCode, 200);
  assert.match(response.headers["content-type"], /text\/html/);
  assert.match(response.body, /SKYGRID Emergency Data On-Ramp/);
  assert.match(response.body, /Evaluate this device/);
  assert.match(response.body, /separate signed activation grant/i);
});

test("creates a fail-closed PNPK offer from browser inventory", async () => {
  const response = await invoke({
    body: {
      inventory: {
        inventory_source: "browser_preflight",
        cpu_threads: 16,
        memory_total_mb: 32768,
        memory_free_mb: 16384,
        storage_total_gb: 2000,
        storage_free_gb: 1000,
        storage_system_disk: true,
        storage_unallocated_gb: 500,
        gpu_count: 2,
        gpu_vram_total_mb: 49152,
        gpu_runtime: "webgpu"
      },
      requested_lease_hours: 24,
      requested_rate_usd_per_hour: 2.5
    }
  });
  const payload = JSON.parse(response.body);

  assert.equal(response.statusCode, 201);
  assert.equal(payload.offer.packet_type, "capacity_lease_offer");
  assert.equal(payload.offer.execution_authority, "none");
  assert.equal(payload.offer.partition_policy.system_or_boot_disk_allowed, false);
  assert.equal(payload.offer.options.find((item) => item.option_id === "storage-reserve").partition_mode, "reservation_only_no_partition");
  assert.ok(payload.offer.options.some((item) => item.option_id === "gpu-wall-node"));
  assert.ok(payload.agreement_token);
});

test("accepts owner terms and returns a non-activating agreement receipt", async () => {
  const preflight = await invoke({
    body: {
      inventory: {
        cpu_threads: 8,
        memory_total_mb: 16384,
        memory_free_mb: 8192,
        storage_total_gb: 1000,
        storage_free_gb: 500
      }
    }
  });
  const offerPayload = JSON.parse(preflight.body);
  const agreement = await invoke({
    path: "/api/node-lease/agreements",
    body: {
      offer: offerPayload.offer,
      offer_id: offerPayload.offer.offer_id,
      agreement_token: offerPayload.agreement_token,
      selected_option_id: "compute-node",
      owner_reference: "owner@example.test",
      owner_controls_hardware: true,
      inventory_is_accurate: true,
      system_disk_changes_prohibited: true,
      separate_activation_grant_required: true,
      pilot_terms_accepted: true
    }
  });
  const payload = JSON.parse(agreement.body);

  assert.equal(agreement.statusCode, 202);
  assert.equal(payload.agreement.packet_type, "capacity_lease_agreement");
  assert.equal(payload.agreement.agreement_status, "owner_accepted_pending_operator");
  assert.equal(payload.agreement.activation.allowed, false);
  assert.equal(payload.receipt.execution_allowed, false);
});
