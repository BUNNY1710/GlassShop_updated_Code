-- m010_stands.sql
--
-- Per-shop Stand master (inventory locations). Migrations run before
-- sequelize.sync, so the table is created explicitly. Splitter-safe (no $$).
-- Seeds a stand row for every stand_number already used by existing stock so
-- nothing is invalidated on upgrade, plus a default 1..5 for empty shops.

CREATE TABLE IF NOT EXISTS stands (
  id           BIGSERIAL PRIMARY KEY,
  shop_id      BIGINT NOT NULL,
  stand_number INTEGER NOT NULL,
  stand_name   VARCHAR(100),
  description  TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS stands_shop_number ON stands (shop_id, stand_number);

-- 1) Seed stands already in use by existing stock.
INSERT INTO stands (shop_id, stand_number, is_active, created_at, updated_at)
SELECT DISTINCT st.shop_id, st.stand_no, true, NOW(), NOW()
FROM stock st
WHERE st.stand_no IS NOT NULL AND st.stand_no >= 1
AND NOT EXISTS (
  SELECT 1 FROM stands s WHERE s.shop_id = st.shop_id AND s.stand_number = st.stand_no
);

-- 2) Default stands 1..5 for every shop that has none yet.
INSERT INTO stands (shop_id, stand_number, is_active, created_at, updated_at)
SELECT sh.id, n.num, true, NOW(), NOW()
FROM shop sh
CROSS JOIN (VALUES (1),(2),(3),(4),(5)) AS n(num)
WHERE NOT EXISTS (
  SELECT 1 FROM stands s WHERE s.shop_id = sh.id AND s.stand_number = n.num
);
