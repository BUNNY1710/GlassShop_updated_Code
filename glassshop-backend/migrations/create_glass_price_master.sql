-- Create glass_price_master table
CREATE TABLE IF NOT EXISTS glass_price_master (
    id BIGSERIAL PRIMARY KEY,
    shop_id BIGINT NOT NULL REFERENCES shop(id) ON DELETE CASCADE,
    glass_type VARCHAR(255) NOT NULL,
    thickness DECIMAL(10, 2) NOT NULL,
    purchase_price DECIMAL(10, 2),
    selling_price DECIMAL(10, 2),
    is_pending BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(shop_id, glass_type, thickness)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_glass_price_master_shop_type_thickness ON glass_price_master(shop_id, glass_type, thickness);
CREATE INDEX IF NOT EXISTS idx_glass_price_master_pending ON glass_price_master(is_pending);

-- Add status column to stock table if it doesn't exist
ALTER TABLE stock ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'APPROVED';

-- Create index for status
CREATE INDEX IF NOT EXISTS idx_stock_status ON stock(status);

