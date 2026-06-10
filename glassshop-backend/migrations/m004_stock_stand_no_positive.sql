-- m004_stock_stand_no_positive.sql
--
-- Database-level protection: stock.stand_no must be >= 1. Blocks 0, negative,
-- and (column is INTEGER) decimal values on every INSERT/UPDATE even if the API
-- or frontend validation is bypassed.
--
-- NOTE: the migration runner splits on ";\n", so DO/$$ blocks cannot be used.
-- Idempotent via DROP ... IF EXISTS + ADD. NOT VALID so pre-existing legacy
-- rows never block the migration; the constraint is enforced for new/updated rows.

ALTER TABLE stock DROP CONSTRAINT IF EXISTS chk_stock_stand_no_positive;
ALTER TABLE stock ADD CONSTRAINT chk_stock_stand_no_positive CHECK (stand_no >= 1) NOT VALID;
