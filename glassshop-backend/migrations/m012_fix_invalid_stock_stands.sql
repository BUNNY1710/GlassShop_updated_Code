-- m012_fix_invalid_stock_stands.sql
--
-- Legacy stock rows with stand_no <= 0 / NULL block ANY update (e.g. the
-- optimization confirm quantity deduction) because chk_stock_stand_no_positive
-- (added NOT VALID) is re-checked whenever a row is updated.
--
-- Fix: give every affected shop a new "Recovered Stock" stand and move the bad
-- rows there (a fresh stand_number = max+1, so no unique-index collision), then
-- VALIDATE the constraint so stand_no <= 0 is permanently rejected.

-- 1) One recovered stand per shop that has invalid stock.
INSERT INTO stands (shop_id, stand_number, stand_name, is_active, created_at, updated_at)
SELECT d.shop_id,
       COALESCE((SELECT MAX(x.stand_number) FROM stands x WHERE x.shop_id = d.shop_id), 0) + 1,
       'Recovered Stock', true, NOW(), NOW()
FROM (SELECT DISTINCT shop_id FROM stock WHERE stand_no IS NULL OR stand_no < 1) d;

-- 2) Move invalid stock onto that shop's highest (the just-created recovered) stand.
UPDATE stock s
SET stand_no = (SELECT MAX(x.stand_number) FROM stands x WHERE x.shop_id = s.shop_id)
WHERE s.stand_no IS NULL OR s.stand_no < 1;

-- 3) Now that no row violates it, fully enforce the constraint going forward.
ALTER TABLE stock VALIDATE CONSTRAINT chk_stock_stand_no_positive;
