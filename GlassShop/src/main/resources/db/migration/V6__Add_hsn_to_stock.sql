-- Add HSN number field to stock table
ALTER TABLE stock
    ADD COLUMN hsn_no VARCHAR(20);

CREATE INDEX idx_stock_hsn_no ON stock(hsn_no);

