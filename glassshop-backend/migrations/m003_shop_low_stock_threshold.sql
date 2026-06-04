-- m003_shop_low_stock_threshold.sql
--
-- Adds a per-shop configurable low-stock alert threshold.
-- Default 5 matches the previously hard-coded value so existing
-- shops see no change in alert behaviour after the upgrade.

ALTER TABLE shop
  ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER NOT NULL DEFAULT 5;
