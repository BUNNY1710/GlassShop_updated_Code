-- m006_rename_glass_type_plan_to_plain.sql
--
-- Global glass-type rename: 'Plan' -> 'Plain'.
-- Updates every table that stores the glass-type string so existing records
-- display as "Plain" everywhere. Idempotent: re-running matches nothing.

UPDATE glass               SET type       = 'Plain' WHERE type       = 'Plan';
UPDATE glass_price_master  SET glass_type = 'Plain' WHERE glass_type = 'Plan';
UPDATE quotation_items     SET glass_type = 'Plain' WHERE glass_type = 'Plan';
UPDATE invoice_items       SET glass_type = 'Plain' WHERE glass_type = 'Plan';
UPDATE audit_log           SET glass_type = 'Plain' WHERE glass_type = 'Plan';
