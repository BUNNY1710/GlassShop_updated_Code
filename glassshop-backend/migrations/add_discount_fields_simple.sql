-- Simple SQL Migration: Add discount_type and discount_value columns
-- Copy and paste these commands into your PostgreSQL client (pgAdmin, DBeaver, or psql)

-- Step 1: Add discount_type column
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS discount_type VARCHAR(20) DEFAULT 'AMOUNT';

-- Step 2: Add discount_value column  
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS discount_value DECIMAL(10, 2) DEFAULT 0.0;

-- Step 3: Update existing rows with default values
UPDATE quotations 
SET discount_type = 'AMOUNT', discount_value = COALESCE(discount, 0)
WHERE discount_type IS NULL OR discount_value IS NULL;

