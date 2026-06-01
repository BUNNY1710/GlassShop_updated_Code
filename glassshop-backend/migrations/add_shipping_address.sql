-- Add shipping_address column to quotations table
ALTER TABLE quotations
ADD COLUMN IF NOT EXISTS shipping_address TEXT;

-- Add shipping_address column to invoices table
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS shipping_address TEXT;

