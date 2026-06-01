-- ============================================
-- Reset Flyway Schema History
-- ============================================
-- Run this SQL to clear Flyway history and start fresh
-- Connect to your database (glass_shop) and execute:

-- Drop the Flyway schema history table
DROP TABLE IF EXISTS flyway_schema_history CASCADE;

-- If you want to start completely fresh, you can also drop all tables:
-- DROP SCHEMA public CASCADE;
-- CREATE SCHEMA public;
-- GRANT ALL ON SCHEMA public TO postgres;
-- GRANT ALL ON SCHEMA public TO public;

-- After running this, restart your Spring Boot application
-- Flyway will create a fresh schema history and run all migrations

