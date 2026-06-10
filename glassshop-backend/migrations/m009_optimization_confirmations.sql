-- m009_optimization_confirmations.sql
--
-- Confirm-cutting-plan workflow. Migrations run before sequelize.sync, so the
-- tables are created explicitly. Splitter-safe (no $$).
--
--   optimization_confirmations — one row per confirmed plan; plan_ref unique so
--                                the same plan cannot be confirmed twice.
--   inventory_movements        — audit trail of OUT (sheets consumed) and
--                                IN (remnants returned) stock changes.

CREATE TABLE IF NOT EXISTS optimization_confirmations (
  id               BIGSERIAL PRIMARY KEY,
  shop_id          BIGINT NOT NULL,
  plan_ref         VARCHAR(100) NOT NULL UNIQUE,
  username         VARCHAR(255),
  sheets_consumed  INTEGER NOT NULL DEFAULT 0,
  remnants_created INTEGER NOT NULL DEFAULT 0,
  orders_included  TEXT,
  details          TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_movements (
  id            BIGSERIAL PRIMARY KEY,
  shop_id       BIGINT NOT NULL,
  stock_id      BIGINT,
  glass_type    VARCHAR(100),
  thickness     DECIMAL(10,2),
  stand_no      INTEGER,
  quantity      INTEGER NOT NULL DEFAULT 0,
  movement_type VARCHAR(10) NOT NULL,
  reason        VARCHAR(255),
  ref_id        BIGINT,
  username      VARCHAR(255),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS inventory_movements_shop ON inventory_movements (shop_id);
