-- m001_quotation_item_prices.sql
--
-- Adds selling_price and purchase_price to quotation_items.
-- These columns are sent by the frontend when creating a quotation
-- (item.sellingPrice, item.purchasePrice) but were silently dropped
-- because they were absent from the Sequelize model.
-- Without them the admin profit-per-quotation calculation always shows ₹0.

ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS selling_price  DECIMAL(10,2);
ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS purchase_price DECIMAL(10,2);
