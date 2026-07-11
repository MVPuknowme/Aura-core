CREATE TABLE IF NOT EXISTS SkygridOrders (
  Id TEXT PRIMARY KEY,
  CustomerName TEXT NOT NULL,
  OrderDate INTEGER NOT NULL,
  ShippedDate INTEGER
);

CREATE INDEX IF NOT EXISTS idx_skygrid_orders_shipped_date
ON SkygridOrders (ShippedDate DESC);
