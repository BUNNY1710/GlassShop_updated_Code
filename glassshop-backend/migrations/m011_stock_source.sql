-- m011_stock_source.sql
--
-- Marks the origin of a stock row. 'Optimization Remnant' identifies reusable
-- offcuts saved from a confirmed cutting plan; NULL = regular stock. Drives the
-- "Remnants only" filter in View Stock.

ALTER TABLE stock ADD COLUMN IF NOT EXISTS source VARCHAR(50);
