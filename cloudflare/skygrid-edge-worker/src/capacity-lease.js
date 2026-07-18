const encoder = new TextEncoder();

export const CAPACITY_AGREEMENT_VERSION = "skygrid-capacity-lease-pilot-v1";
export const CAPACITY_OFFER_TTL_HOURS = 24;

function clampNumber(value, minimum, maximum, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, parsed));
}

function cleanText(value, maximumLength = 160) {
  return String(value ?? "")
    .trim()
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .slice(0, maximumLength);
}

function roundCapacity(value) {
  return Math.max(0, Math.floor(Number(value) || 0));
}

export async function capacitySha256(value) {
  const bytes = encoder.encode(
    typeof value === "string" ? value : JSON.stringify(value)
  );
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function normalizeInventory(input = {}) {
  const inventory = input.inventory && typeof input.inventory === "object"
    ? input.inventory
    : input;

  const storageTotalGb = clampNumber(inventory.storage_total_gb, 0, 10_000_000);
  const storageFreeGb = Math.min(
    storageTotalGb || 10_000_000,
    clampNumber(inventory.storage_free_gb, 0, 10_000_000)
  );
  const memoryTotalMb = clampNumber(inventory.memory_total_mb, 0, 16_777_216);
  const memoryFreeMb = Math.min(
    memoryTotalMb || 16_777_216,
    clampNumber(inventory.memory_free_mb, 0, 16_777_216)
  );

  return {
    device_id_hash: cleanText(inventory.device_id_hash, 96) || "unverified-browser-device",
    inventory_source: cleanText(inventory.inventory_source, 48) || "browser_preflight",
    agent_version: cleanText(inventory.agent_version, 48) || null,
    platform: cleanText(inventory.platform, 48) || "unknown",
    cpu_threads: roundCapacity(clampNumber(inventory.cpu_threads, 0, 4096)),
    memory_total_mb: roundCapacity(memoryTotalMb),
    memory_free_mb: roundCapacity(memoryFreeMb),
    storage_total_gb: roundCapacity(storageTotalGb),
    storage_free_gb: roundCapacity(storageFreeGb),
    storage_system_disk: inventory.storage_system_disk !== false,
    storage_unallocated_gb: roundCapacity(
      clampNumber(inventory.storage_unallocated_gb, 0, storageFreeGb || 10_000_000)
    ),
    storage_layout_hash: cleanText(inventory.storage_layout_hash, 96) || null,
    gpu_count: roundCapacity(clampNumber(inventory.gpu_count, 0, 256)),
    gpu_model_hash: cleanText(inventory.gpu_model_hash, 96) || null,
    gpu_vram_total_mb: roundCapacity(
      clampNumber(inventory.gpu_vram_total_mb, 0, 16_777_216)
    ),
    gpu_vram_free_mb: roundCapacity(
      clampNumber(inventory.gpu_vram_free_mb, 0, 16_777_216)
    ),
    gpu_runtime: cleanText(inventory.gpu_runtime, 48) || "unknown",
    network_down_mbps: clampNumber(inventory.network_down_mbps, 0, 1_000_000),
    network_up_mbps: clampNumber(inventory.network_up_mbps, 0, 1_000_000),
    owner_control_confirmed: inventory.owner_control_confirmed === true
  };
}

export function buildCapacityOptions(inventory) {
  const options = [];
  const storageReserveGb = inventory.storage_system_disk ? 100 : 25;
  const allocatableStorageGb = roundCapacity(
    Math.min(
      Math.max(0, inventory.storage_free_gb - storageReserveGb),
      inventory.storage_free_gb * 0.5
    )
  );

  if (allocatableStorageGb >= 25) {
    options.push({
      option_id: "storage-reserve",
      label: "Storage reserve",
      resource_class: "storage",
      storage_gb: allocatableStorageGb,
      cpu_threads: 0,
      memory_mb: 0,
      gpu_count: 0,
      partition_mode:
        inventory.storage_system_disk === false &&
        inventory.storage_unallocated_gb >= 25
          ? "unallocated_space_only"
          : "reservation_only_no_partition",
      requires_activation_grant: true
    });
  }

  const allocatableCpu = Math.max(0, Math.min(
    Math.floor(inventory.cpu_threads / 2),
    inventory.cpu_threads - 1
  ));
  const allocatableMemoryMb = roundCapacity(Math.min(
    inventory.memory_free_mb * 0.5,
    inventory.memory_total_mb * 0.25
  ));

  if (allocatableCpu >= 2 && allocatableMemoryMb >= 2048) {
    options.push({
      option_id: "compute-node",
      label: "CPU and memory worker",
      resource_class: "compute",
      storage_gb: Math.min(allocatableStorageGb, 50),
      cpu_threads: allocatableCpu,
      memory_mb: allocatableMemoryMb,
      gpu_count: 0,
      partition_mode: "reservation_only_no_partition",
      requires_activation_grant: true
    });
  }

  if (inventory.gpu_count >= 1 && inventory.gpu_vram_total_mb >= 4096) {
    options.push({
      option_id: "gpu-wall-node",
      label: "GPU wall capacity",
      resource_class: "gpu",
      storage_gb: Math.min(allocatableStorageGb, 100),
      cpu_threads: Math.max(2, allocatableCpu),
      memory_mb: Math.max(4096, allocatableMemoryMb),
      gpu_count: inventory.gpu_count,
      gpu_vram_mb: inventory.gpu_vram_total_mb,
      gpu_runtime: inventory.gpu_runtime,
      partition_mode: "reservation_only_no_partition",
      requires_activation_grant: true
    });
  }

  options.push({
    option_id: "proof-only",
    label: "Proof-only evaluation",
    resource_class: "diagnostic",
    storage_gb: 0,
    cpu_threads: 0,
    memory_mb: 0,
    gpu_count: 0,
    partition_mode: "disabled",
    requires_activation_grant: false
  });

  return options;
}

function offerExpiry(createdAt, hours = CAPACITY_OFFER_TTL_HOURS) {
  return new Date(new Date(createdAt).getTime() + hours * 3_600_000).toISOString();
}

export async function createCapacityOffer(input = {}, overrides = {}) {
  const createdAt = overrides.createdAt ?? new Date().toISOString();
  const offerId = overrides.offerId ?? `lease_${crypto.randomUUID()}`;
  const agreementToken = overrides.agreementToken ?? `${crypto.randomUUID()}${crypto.randomUUID()}`;
  const inventory = normalizeInventory(input);
  const options = buildCapacityOptions(inventory);
  const requestedLeaseHours = roundCapacity(
    clampNumber(input.requested_lease_hours, 1, 8_760, 24)
  );
  const requestedRateUsdPerHour = Number(
    clampNumber(input.requested_rate_usd_per_hour, 0, 100_000, 0).toFixed(4)
  );
  const region = cleanText(input.region, 80) || "unspecified";
  const agreementTokenHash = await capacitySha256(agreementToken);

  const pnpk = {
    pnpk_version: "1.1.0",
    system: "SKYGRID Emergency Data On-Ramp",
    packet_type: "capacity_lease_offer",
    offer_id: offerId,
    mode: "controlled_pilot",
    sentinel: "fail_closed",
    execution_authority: "none",
    created_at: createdAt,
    expires_at: offerExpiry(createdAt),
    inventory,
    options,
    requested_terms: {
      region,
      lease_hours: requestedLeaseHours,
      rate_usd_per_hour: requestedRateUsdPerHour,
      estimated_total_usd: Number(
        (requestedLeaseHours * requestedRateUsdPerHour).toFixed(2)
      )
    },
    approvals: {
      device_owner: "pending",
      skygrid_operator: "pending"
    },
    partition_policy: {
      automatic_shrink_allowed: false,
      delete_existing_partition_allowed: false,
      system_or_boot_disk_allowed: false,
      unallocated_space_only: true,
      separate_activation_grant_required: true,
      rollback_proof_required: true
    },
    next_action: "owner_selects_option_and_accepts_pilot_agreement"
  };

  const offerHash = await capacitySha256(pnpk);

  return {
    offer: {
      ...pnpk,
      proof: {
        offer_sha256: `sha256:${offerHash}`,
        inventory_verified: inventory.inventory_source === "signed_local_agent"
      }
    },
    agreementToken,
    agreementTokenHash: `sha256:${agreementTokenHash}`
  };
}

const CREATE_LEASE_TABLE = `
  CREATE TABLE IF NOT EXISTS SkygridCapacityLeases (
    OfferId TEXT NOT NULL PRIMARY KEY,
    CreatedAt TEXT NOT NULL,
    ExpiresAt TEXT NOT NULL,
    Status TEXT NOT NULL CHECK (Status IN (
      'offered',
      'owner_accepted_pending_operator',
      'approved_pending_activation',
      'active',
      'released',
      'rejected',
      'expired'
    )),
    DeviceIdHash TEXT NOT NULL,
    AgreementTokenHash TEXT NOT NULL,
    OfferJson TEXT NOT NULL,
    SelectedOptionId TEXT,
    OwnerReferenceHash TEXT,
    OwnerAcceptedAt TEXT,
    OperatorApprovedAt TEXT,
    AgreementVersion TEXT,
    AgreementJson TEXT,
    ReceiptHash TEXT,
    UNIQUE (AgreementTokenHash)
  )
`;

export async function ensureCapacityLeaseSchema(database) {
  if (!database) throw new Error("D1 binding MY_DB is unavailable");
  await database.prepare(CREATE_LEASE_TABLE).run();
  await database.prepare(`
    CREATE INDEX IF NOT EXISTS idx_capacity_leases_status_created
    ON SkygridCapacityLeases (Status, CreatedAt DESC)
  `).run();
}

export async function persistCapacityOffer(database, result) {
  await ensureCapacityLeaseSchema(database);
  const offer = result.offer;
  return database.prepare(`
    INSERT INTO SkygridCapacityLeases (
      OfferId, CreatedAt, ExpiresAt, Status, DeviceIdHash,
      AgreementTokenHash, OfferJson
    ) VALUES (?, ?, ?, 'offered', ?, ?, ?)
  `).bind(
    offer.offer_id,
    offer.created_at,
    offer.expires_at,
    offer.inventory.device_id_hash,
    result.agreementTokenHash,
    JSON.stringify(offer)
  ).run();
}

function requiredAgreementConfirmations(input) {
  return [
    "owner_controls_hardware",
    "inventory_is_accurate",
    "system_disk_changes_prohibited",
    "separate_activation_grant_required",
    "pilot_terms_accepted"
  ].every((field) => input[field] === true);
}

export async function createCapacityAgreementPacket(
  offer,
  input = {},
  acceptedAt = new Date().toISOString()
) {
  if (!offer || offer.packet_type !== "capacity_lease_offer") {
    return { ok: false, status: 400, reason: "capacity_offer_required" };
  }
  const selectedOptionId = cleanText(input.selected_option_id, 80);
  const ownerReference = cleanText(input.owner_reference, 200);
  if (!selectedOptionId || !ownerReference) {
    return { ok: false, status: 400, reason: "agreement_fields_required" };
  }
  if (!requiredAgreementConfirmations(input)) {
    return { ok: false, status: 400, reason: "all_agreement_confirmations_required" };
  }
  const selectedOption = offer.options.find(
    (option) => option.option_id === selectedOptionId
  );
  if (!selectedOption) {
    return { ok: false, status: 400, reason: "selected_option_invalid" };
  }

  const ownerReferenceHash = `sha256:${await capacitySha256(ownerReference.toLowerCase())}`;
  const agreement = {
    ...offer,
    packet_type: "capacity_lease_agreement",
    agreement_version: CAPACITY_AGREEMENT_VERSION,
    agreement_status: "owner_accepted_pending_operator",
    selected_option: selectedOption,
    approvals: {
      device_owner: {
        approved: true,
        accepted_at: acceptedAt,
        owner_reference_hash: ownerReferenceHash
      },
      skygrid_operator: {
        approved: false,
        status: "pending"
      }
    },
    execution_authority: "none",
    activation: {
      allowed: false,
      partition_allowed: false,
      compute_enrollment_allowed: false,
      reason: "separate_signed_activation_grant_required"
    },
    next_action: "skygrid_operator_review"
  };
  const receiptHash = `sha256:${await capacitySha256(agreement)}`;

  return {
    ok: true,
    status: 202,
    agreement,
    ownerReferenceHash,
    receiptHash,
    selectedOptionId,
    acceptedAt
  };
}

export async function acceptCapacityAgreement(database, input = {}, overrides = {}) {
  await ensureCapacityLeaseSchema(database);
  const offerId = cleanText(input.offer_id, 96);
  const agreementToken = cleanText(input.agreement_token, 256);
  const selectedOptionId = cleanText(input.selected_option_id, 80);
  const ownerReference = cleanText(input.owner_reference, 200);

  if (!offerId || !agreementToken || !selectedOptionId || !ownerReference) {
    return { ok: false, status: 400, reason: "agreement_fields_required" };
  }
  if (!requiredAgreementConfirmations(input)) {
    return { ok: false, status: 400, reason: "all_agreement_confirmations_required" };
  }

  const row = await database.prepare(`
    SELECT * FROM SkygridCapacityLeases WHERE OfferId = ?
  `).bind(offerId).first();

  if (!row) return { ok: false, status: 404, reason: "offer_not_found" };
  if (row.Status !== "offered") {
    return { ok: false, status: 409, reason: "offer_not_available" };
  }

  const suppliedTokenHash = `sha256:${await capacitySha256(agreementToken)}`;
  if (suppliedTokenHash !== row.AgreementTokenHash) {
    return { ok: false, status: 403, reason: "agreement_token_invalid" };
  }

  const acceptedAt = overrides.acceptedAt ?? new Date().toISOString();
  if (new Date(row.ExpiresAt).getTime() <= new Date(acceptedAt).getTime()) {
    await database.prepare(`
      UPDATE SkygridCapacityLeases SET Status = 'expired' WHERE OfferId = ?
    `).bind(offerId).run();
    return { ok: false, status: 410, reason: "offer_expired" };
  }

  const offer = JSON.parse(row.OfferJson);
  const packet = await createCapacityAgreementPacket(offer, input, acceptedAt);
  if (!packet.ok) return packet;

  await database.prepare(`
    UPDATE SkygridCapacityLeases
    SET Status = 'owner_accepted_pending_operator',
        SelectedOptionId = ?, OwnerReferenceHash = ?, OwnerAcceptedAt = ?,
        AgreementVersion = ?, AgreementJson = ?, ReceiptHash = ?
    WHERE OfferId = ? AND Status = 'offered'
  `).bind(
    selectedOptionId,
    packet.ownerReferenceHash,
    acceptedAt,
    CAPACITY_AGREEMENT_VERSION,
    JSON.stringify(packet.agreement),
    packet.receiptHash,
    offerId
  ).run();

  return {
    ok: true,
    status: 202,
    agreement: packet.agreement,
    receipt: {
      offer_id: offerId,
      status: "owner_accepted_pending_operator",
      agreement_version: CAPACITY_AGREEMENT_VERSION,
      receipt_hash: packet.receiptHash,
      accepted_at: acceptedAt,
      execution_allowed: false
    }
  };
}

export async function readCapacityLease(database, offerId, agreementToken) {
  await ensureCapacityLeaseSchema(database);
  const row = await database.prepare(`
    SELECT OfferId, CreatedAt, ExpiresAt, Status, AgreementTokenHash,
           SelectedOptionId, OwnerAcceptedAt, OperatorApprovedAt,
           AgreementVersion, AgreementJson, OfferJson, ReceiptHash
    FROM SkygridCapacityLeases WHERE OfferId = ?
  `).bind(cleanText(offerId, 96)).first();

  if (!row) return { ok: false, status: 404, reason: "offer_not_found" };
  const suppliedTokenHash = `sha256:${await capacitySha256(cleanText(agreementToken, 256))}`;
  if (suppliedTokenHash !== row.AgreementTokenHash) {
    return { ok: false, status: 403, reason: "agreement_token_invalid" };
  }

  return {
    ok: true,
    status: 200,
    lease: {
      offer_id: row.OfferId,
      created_at: row.CreatedAt,
      expires_at: row.ExpiresAt,
      status: row.Status,
      selected_option_id: row.SelectedOptionId,
      owner_accepted_at: row.OwnerAcceptedAt,
      operator_approved_at: row.OperatorApprovedAt,
      agreement_version: row.AgreementVersion,
      receipt_hash: row.ReceiptHash,
      pnpk: row.AgreementJson
        ? JSON.parse(row.AgreementJson)
        : JSON.parse(row.OfferJson)
    }
  };
}
