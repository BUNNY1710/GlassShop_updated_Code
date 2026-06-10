-- m005_stock_quantity_checks.sql
--
-- Database-level protection for quantities, enforced on every INSERT/UPDATE
-- even if the API / frontend validation is bypassed:
--
--   * stock.quantity         — on-hand balance, may be 0 (out of stock) but
--                              never negative  -> CHECK (quantity >= 0)
--   * stock_history.quantity — the entered add/remove amount, always >= 1
--                              -> CHECK (quantity >= 1)
--
-- NOTE: the migration runner splits on ";\n", so DO/$$ blocks cannot be used.
-- Idempotent via DROP ... IF EXISTS + ADD. NOT VALID so pre-existing legacy
-- rows never block the migration; enforced for new/updated rows.

ALTER TABLE stock DROP CONSTRAINT IF EXISTS chk_stock_quantity_nonneg;
ALTER TABLE stock ADD CONSTRAINT chk_stock_quantity_nonneg CHECK (quantity >= 0) NOT VALID;
ALTER TABLE stock_history DROP CONSTRAINT IF EXISTS chk_stock_history_quantity_positive;
ALTER TABLE stock_history ADD CONSTRAINT chk_stock_history_quantity_positive CHECK (quantity >= 1) NOT VALID;
