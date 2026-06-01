-- ============================================
-- Fix audit_log.price column type
-- Change from NUMERIC to DOUBLE PRECISION to match Java Double type
-- ============================================

ALTER TABLE audit_log 
ALTER COLUMN price TYPE DOUBLE PRECISION;

