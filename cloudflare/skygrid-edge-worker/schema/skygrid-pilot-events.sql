CREATE TABLE IF NOT EXISTS SkygridPilotEvents (
  EventId TEXT NOT NULL PRIMARY KEY,
  PartnerId TEXT NOT NULL,
  CorrelationId TEXT NOT NULL,

  ReceivedAt TEXT NOT NULL,
  CreatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  RouteType TEXT NOT NULL,
  RequestedRamp TEXT NOT NULL,
  RequestedNode TEXT NOT NULL,

  DecisionOk INTEGER NOT NULL
    CHECK (DecisionOk IN (0, 1)),

  HttpStatus INTEGER NOT NULL,
  DecisionReason TEXT NOT NULL,

  Mode TEXT NOT NULL
    CHECK (Mode = 'controlled_pilot'),

  Sentinel TEXT NOT NULL
    CHECK (Sentinel = 'fail_closed'),

  OwnerApproval INTEGER NOT NULL DEFAULT 0
    CHECK (OwnerApproval IN (0, 1)),

  EmergencyOperatorApproval INTEGER NOT NULL DEFAULT 0
    CHECK (EmergencyOperatorApproval IN (0, 1)),

  PayloadHash TEXT NOT NULL,
  PayloadBytes INTEGER NOT NULL
    CHECK (PayloadBytes >= 0),

  ReceiptHash TEXT NOT NULL,

  ProcessingMs INTEGER NOT NULL
    CHECK (ProcessingMs >= 0),

  AuraValidated INTEGER NOT NULL DEFAULT 0
    CHECK (AuraValidated IN (0, 1)),

  ReceiptVersion TEXT NOT NULL DEFAULT '1.0',

  UNIQUE (PartnerId, CorrelationId),

  CHECK (
    (DecisionOk = 1 AND AuraValidated = 1)
    OR
    (DecisionOk = 0 AND AuraValidated = 0)
  )
);

CREATE INDEX IF NOT EXISTS idx_pilot_events_received
ON SkygridPilotEvents (ReceivedAt DESC);

CREATE INDEX IF NOT EXISTS idx_pilot_events_partner
ON SkygridPilotEvents (PartnerId, ReceivedAt DESC);

CREATE INDEX IF NOT EXISTS idx_pilot_events_decision
ON SkygridPilotEvents (DecisionOk, ReceivedAt DESC);

CREATE INDEX IF NOT EXISTS idx_pilot_events_reason
ON SkygridPilotEvents (DecisionReason, ReceivedAt DESC);