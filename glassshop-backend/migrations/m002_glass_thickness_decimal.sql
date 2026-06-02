-- m002_glass_thickness_decimal.sql
--
-- Changes glass.thickness from INTEGER to DECIMAL(10,2).
-- INTEGER silently truncates fractional thicknesses (3.5mm → 3).
-- USING clause is required by PostgreSQL for explicit type conversion.
-- Existing integer values are preserved (5 → 5.00, no data loss).

ALTER TABLE glass
  ALTER COLUMN thickness TYPE DECIMAL(10,2)
  USING thickness::DECIMAL(10,2);
