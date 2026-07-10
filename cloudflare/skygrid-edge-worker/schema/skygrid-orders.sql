CREATE TABLE IF NOT EXISTS SkygridOrders (
  Id TEXT PRIMARY KEY,
  CustomerName TEXT NOT NULL,
  OrderDate INTEGER NOT NULL,
  ShippedDate INTEGER
);

CREATE INDEX IF NOT EXISTS idx_skygrid_orders_shipped_date
ON SkygridOrders (ShippedDate DESC);

INSERT OR REPLACE INTO SkygridOrders (Id, CustomerName, OrderDate, ShippedDate)
VALUES
  ('demo-001', 'SKYGRID Pilot', 1783630000, 1783630500),
  ('demo-002', 'Edge Proof Partner', 1783630100, 1783630600);
