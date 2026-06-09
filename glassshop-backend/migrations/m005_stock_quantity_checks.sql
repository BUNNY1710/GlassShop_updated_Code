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
-- Both added NOT VALID so the migration never fails on pre-existing legacy
-- rows; the constraints are still enforced for all new and updated rows.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_stock_quantity_nonneg'
  ) THEN
    ALTER TABLE stock
      ADD CONSTRAINT chk_stock_quantity_nonneg CHECK (quantity >= 0) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_stock_history_quantity_positive'
  ) THEN
    ALTER TABLE stock_history
      ADD CONSTRAINT chk_stock_history_quantity_positive CHECK (quantity >= 1) NOT VALID;
  END IF;
END $$;
