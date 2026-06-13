-- m016_glass_type_alerts.sql
--
-- Per-glass-type low-stock alert config. A null threshold falls back to the
-- shop's global lowStockThreshold setting.

ALTER TABLE glass_types ADD COLUMN IF NOT EXISTS low_stock_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE glass_types ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER;
