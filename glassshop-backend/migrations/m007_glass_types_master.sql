-- m007_glass_types_master.sql
--
-- Per-shop Glass Type master. Migrations run BEFORE sequelize.sync, so the
-- table is created here explicitly; sync(alter) later reconciles it no-op.
-- Seeds the default catalogue plus every glass-type string already present in
-- existing data, so the master reflects current records on upgrade.

CREATE TABLE IF NOT EXISTS glass_types (
  id         BIGSERIAL PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  shop_id    BIGINT NOT NULL,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS glass_types_shop_id_name ON glass_types (shop_id, name);

-- 1) Default catalogue for every shop.
INSERT INTO glass_types (name, shop_id, is_active, created_at, updated_at)
SELECT d.name, s.id, true, NOW(), NOW()
FROM shop s
CROSS JOIN (VALUES
  ('Plain'), ('Extra Clear'), ('Grey Tinted'), ('Brown Tinted'),
  ('One Way'), ('Star'), ('Karakachi'), ('Bajari'), ('Diomand'),
  ('Mirror'), ('Toughened'), ('Lacquered')
) AS d(name)
WHERE NOT EXISTS (
  SELECT 1 FROM glass_types gt WHERE gt.shop_id = s.id AND lower(gt.name) = lower(d.name)
);

-- 2) Any glass type already used in stock (via the global glass catalogue).
INSERT INTO glass_types (name, shop_id, is_active, created_at, updated_at)
SELECT DISTINCT g.type, st.shop_id, true, NOW(), NOW()
FROM stock st
JOIN glass g ON g.id = st.glass_id
WHERE g.type IS NOT NULL AND g.type <> ''
AND NOT EXISTS (
  SELECT 1 FROM glass_types gt WHERE gt.shop_id = st.shop_id AND lower(gt.name) = lower(g.type)
);

-- 3) Any glass type already used in quotation items.
INSERT INTO glass_types (name, shop_id, is_active, created_at, updated_at)
SELECT DISTINCT qi.glass_type, q.shop_id, true, NOW(), NOW()
FROM quotation_items qi
JOIN quotations q ON q.id = qi.quotation_id
WHERE qi.glass_type IS NOT NULL AND qi.glass_type <> ''
AND NOT EXISTS (
  SELECT 1 FROM glass_types gt WHERE gt.shop_id = q.shop_id AND lower(gt.name) = lower(qi.glass_type)
);

-- 4) Any glass type already used in the price master.
INSERT INTO glass_types (name, shop_id, is_active, created_at, updated_at)
SELECT DISTINCT pm.glass_type, pm.shop_id, true, NOW(), NOW()
FROM glass_price_master pm
WHERE pm.glass_type IS NOT NULL AND pm.glass_type <> ''
AND NOT EXISTS (
  SELECT 1 FROM glass_types gt WHERE gt.shop_id = pm.shop_id AND lower(gt.name) = lower(pm.glass_type)
);
