-- ============================================
-- Fix audit_log.price column type
-- ============================================
-- Run this SQL to fix the column type mismatch

ALTER TABLE audit_log 
ALTER COLUMN price TYPE DOUBLE PRECISION;

-- Verify the change
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'audit_log' AND column_name = 'price';

