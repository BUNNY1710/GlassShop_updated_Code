-- m018_fix_cut_status.sql
--
-- Optimization-confirm previously set quotations to a non-standard 'CUT' status,
-- which hid them from the Invoice module (it lists CONFIRMED). Promote those
-- existing optimized orders to CONFIRMED so they become invoiceable.

UPDATE quotations SET status = 'CONFIRMED' WHERE status = 'CUT';
