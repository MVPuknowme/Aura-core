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
);

CREATE INDEX IF NOT EXISTS idx_capacity_leases_status_created
ON SkygridCapacityLeases (Status, CreatedAt DESC);
