-- Migration: Add discount_type and discount_value columns to quotations table
-- Run this SQL script manually if the columns don't exist

-- Add discount_type column (if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'quotations' AND column_name = 'discount_type'
    ) THEN
        ALTER TABLE quotations ADD COLUMN discount_type VARCHAR(20) DEFAULT 'AMOUNT';
    END IF;
END $$;

-- Add discount_value column (if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'quotations' AND column_name = 'discount_value'
    ) THEN
        ALTER TABLE quotations ADD COLUMN discount_value DECIMAL(10, 2) DEFAULT 0.0;
    END IF;
END $$;

-- Update existing rows to have default values
UPDATE quotations 
SET discount_type = 'AMOUNT', discount_value = COALESCE(discount, 0)
WHERE discount_type IS NULL OR discount_value IS NULL;

