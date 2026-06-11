-- m014_audit_log_details.sql
--
-- Optional free-text description on audit rows (e.g. staff permission changes
-- that don't map onto the fixed glass/size/stand columns). NULL for existing
-- rows; the UI falls back to the derived description when it's null.

ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS details TEXT;
