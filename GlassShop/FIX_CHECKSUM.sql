-- ============================================
-- Fix Flyway Checksum Mismatch
-- ============================================
-- Run this SQL script to fix the checksum mismatch
-- Connect to your database and execute:

-- Update the checksum for version 1 to match current file
UPDATE flyway_schema_history 
SET checksum = 741589469 
WHERE version = '1';

-- Verify the update
SELECT version, description, checksum, installed_on 
FROM flyway_schema_history 
ORDER BY installed_rank;

-- After running this, restart your Spring Boot application
-- The checksum will now match and migrations will proceed

