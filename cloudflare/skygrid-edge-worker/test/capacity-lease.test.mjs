import test from "node:test";
import assert from "node:assert/strict";
import {
  acceptCapacityAgreement,
  buildCapacityOptions,
  createCapacityOffer,
  persistCapacityOffer,
  readCapacityLease
} from "../src/capacity-lease.js";

class MemoryStatement {
  constructor(database, sql) {
    this.database = database;
    this.sql = sql.replace(/\s+/g, " ").trim();
    this.values = [];
  }

  bind(...values) {
    this.values = values;
    return this;
  }

  async run() {
    if (this.sql.startsWith("CREATE ")) return { success: true };

    if (this.sql.startsWith("INSERT INTO SkygridCapacityLeases")) {
      const [OfferId, CreatedAt, ExpiresAt, DeviceIdHash, AgreementTokenHash, OfferJson] = this.values;
      this.database.rows.set(OfferId, {
        OfferId,
        CreatedAt,
        ExpiresAt,
        Status: "offered",
        DeviceIdHash,
        AgreementTokenHash,
        OfferJson,
        SelectedOptionId: null,
        OwnerReferenceHash: null,
        OwnerAcceptedAt: null,
        OperatorApprovedAt: null,
        AgreementVersion: null,
        AgreementJson: null,
        ReceiptHash: null
      });
      return { success: true, meta: { changes: 1 } };
    }

    if (this.sql.includes("SET Status = 'expired'")) {
      const row = this.database.rows.get(this.values[0]);
      if (row) row.Status = "expired";
      return { success: true, meta: { changes: row ? 1 : 0 } };
    }

    if (this.sql.includes("SET Status = 'owner_accepted_pending_operator'")) {
      const [SelectedOptionId, OwnerReferenceHash, OwnerAcceptedAt, AgreementVersion, AgreementJson, ReceiptHash, OfferId] = this.values;
      const row = this.database.rows.get(OfferId);
      if (row && row.Status === "offered") {
        Object.assign(row, {
          Status: "owner_accepted_pending_operator",
          SelectedOptionId,
          OwnerReferenceHash,
          OwnerAcceptedAt,
          AgreementVersion,
          AgreementJson,
          ReceiptHash
        });
      }
      return { success: true, meta: { changes: row ? 1 : 0 } };
    }

    throw new Error(`Unhandled SQL run: ${this.sql}`);
  }

  async first() {
    if (this.sql.includes("FROM SkygridCapacityLeases WHERE OfferId = ?")) {
      return this.database.rows.get(this.values[0]) ?? null;
    }
    throw new Error(`Unhandled SQL first: ${this.sql}`);
  }
}

class MemoryDatabase {
  constructor() {
    this.rows = new Map();
  }

  prepare(sql) {
    return new MemoryStatement(this, sql);
  }
}

const inventory = {
  inventory_source: "signed_local_agent",
  device_id_hash: "device-hash-001",
  platform: "win32",
  cpu_threads: 24,
  memory_total_mb: 65_536,
  memory_free_mb: 40_000,
  storage_total_gb: 4_000,
  storage_free_gb: 1_500,
  storage_unallocated_gb: 500,
  storage_system_disk: false,
  storage_layout_hash: "layout-hash-001",
  gpu_count: 4,
  gpu_vram_total_mb: 98_304,
  gpu_vram_free_mb: 80_000,
  gpu_runtime: "cuda",
  owner_control_confirmed: true
};

test("capacity preflight offers storage, compute, GPU, and proof-only choices", async () => {
  const result = await createCapacityOffer(
    {
      inventory,
      requested_lease_hours: 72,
      requested_rate_usd_per_hour: 3.5,
      region: "Pacific Northwest"
    },
    {
      createdAt: "2026-07-17T00:00:00.000Z",
      offerId: "lease-test-001",
      agreementToken: "test-token-001"
    }
  );

  assert.equal(result.offer.execution_authority, "none");
  assert.equal(result.offer.requested_terms.estimated_total_usd, 252);
  assert.deepEqual(
    result.offer.options.map((option) => option.option_id),
    ["storage-reserve", "compute-node", "gpu-wall-node", "proof-only"]
  );
  assert.equal(result.offer.options[0].partition_mode, "unallocated_space_only");
  assert.equal(result.offer.partition_policy.automatic_shrink_allowed, false);
  assert.equal(result.offer.partition_policy.system_or_boot_disk_allowed, false);
});

test("system disk inventory never receives an automatic partition option", () => {
  const options = buildCapacityOptions({ ...inventory, storage_system_disk: true });
  assert.equal(options[0].partition_mode, "reservation_only_no_partition");
});

test("owner agreement persists a PNPK receipt but does not authorize activation", async () => {
  const database = new MemoryDatabase();
  const result = await createCapacityOffer(
    { inventory },
    {
      createdAt: "2026-07-17T00:00:00.000Z",
      offerId: "lease-test-002",
      agreementToken: "test-token-002"
    }
  );
  await persistCapacityOffer(database, result);

  const accepted = await acceptCapacityAgreement(
    database,
    {
      offer_id: "lease-test-002",
      agreement_token: "test-token-002",
      selected_option_id: "gpu-wall-node",
      owner_reference: "owner@example.test",
      owner_controls_hardware: true,
      inventory_is_accurate: true,
      system_disk_changes_prohibited: true,
      separate_activation_grant_required: true,
      pilot_terms_accepted: true
    },
    { acceptedAt: "2026-07-17T01:00:00.000Z" }
  );

  assert.equal(accepted.ok, true);
  assert.equal(accepted.status, 202);
  assert.equal(accepted.agreement.packet_type, "capacity_lease_agreement");
  assert.equal(accepted.agreement.execution_authority, "none");
  assert.equal(accepted.agreement.activation.allowed, false);
  assert.equal(accepted.receipt.status, "owner_accepted_pending_operator");

  const status = await readCapacityLease(
    database,
    "lease-test-002",
    "test-token-002"
  );
  assert.equal(status.ok, true);
  assert.equal(status.lease.status, "owner_accepted_pending_operator");
  assert.equal(status.lease.pnpk.selected_option.option_id, "gpu-wall-node");
});

test("agreement fails closed for a bad token or incomplete confirmations", async () => {
  const database = new MemoryDatabase();
  const result = await createCapacityOffer(
    { inventory },
    {
      createdAt: "2026-07-17T00:00:00.000Z",
      offerId: "lease-test-003",
      agreementToken: "test-token-003"
    }
  );
  await persistCapacityOffer(database, result);

  const incomplete = await acceptCapacityAgreement(database, {
    offer_id: "lease-test-003",
    agreement_token: "test-token-003",
    selected_option_id: "proof-only",
    owner_reference: "owner@example.test"
  });
  assert.equal(incomplete.reason, "all_agreement_confirmations_required");

  const invalidToken = await acceptCapacityAgreement(database, {
    offer_id: "lease-test-003",
    agreement_token: "wrong-token",
    selected_option_id: "proof-only",
    owner_reference: "owner@example.test",
    owner_controls_hardware: true,
    inventory_is_accurate: true,
    system_disk_changes_prohibited: true,
    separate_activation_grant_required: true,
    pilot_terms_accepted: true
  });
  assert.equal(invalidToken.reason, "agreement_token_invalid");
});
