-- m004_stock_stand_no_positive.sql
--
-- Database-level protection for stand numbers: stock.stand_no must be >= 1.
-- Blocks 0, negative, and (column is INTEGER) decimal values on every
-- INSERT/UPDATE even if the API or frontend validation is bypassed.
--
-- Added NOT VALID so the migration never fails on pre-existing legacy rows;
-- the constraint is still enforced for all new and updated rows.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_stock_stand_no_positive'
  ) THEN
    ALTER TABLE stock
      ADD CONSTRAINT chk_stock_stand_no_positive CHECK (stand_no >= 1) NOT VALID;
  END IF;
END $$;
