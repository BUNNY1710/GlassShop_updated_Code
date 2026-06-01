-- Migration: Add purchase_price and selling_price columns to stock table
-- Date: 2026-01-29

-- Add purchase_price column
ALTER TABLE stock 
ADD COLUMN IF NOT EXISTS purchase_price DECIMAL(10, 2) NULL;

-- Add selling_price column
ALTER TABLE stock 
ADD COLUMN IF NOT EXISTS selling_price DECIMAL(10, 2) NULL;

-- Add comment for documentation
COMMENT ON COLUMN stock.purchase_price IS 'Purchase price of the stock item';
COMMENT ON COLUMN stock.selling_price IS 'Selling price of the stock item';

