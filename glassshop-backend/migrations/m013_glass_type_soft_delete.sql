-- m013_glass_type_soft_delete.sql
--
-- Soft delete for glass types so a deletion can be undone within the 5-second
-- window. deleted_at NULL = active; non-null = soft-deleted (hidden from
-- dropdowns). Stock keeps its glass-type string regardless.

ALTER TABLE glass_types ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
