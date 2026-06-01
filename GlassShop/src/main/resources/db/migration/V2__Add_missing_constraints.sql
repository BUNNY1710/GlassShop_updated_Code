-- ============================================
-- Flyway Migration: Add Missing Constraints
-- ============================================

-- Ensure NOT NULL constraints where needed
ALTER TABLE shop ALTER COLUMN shop_name SET NOT NULL;

-- Add check constraints for data integrity
ALTER TABLE users ADD CONSTRAINT chk_users_role CHECK (role IN ('ROLE_ADMIN', 'ROLE_STAFF', 'ADMIN', 'STAFF'));

ALTER TABLE stock ADD CONSTRAINT chk_stock_quantity_non_negative CHECK (quantity >= 0);
ALTER TABLE stock ADD CONSTRAINT chk_stock_min_quantity_positive CHECK (min_quantity > 0);
ALTER TABLE stock ADD CONSTRAINT chk_stock_stand_no_positive CHECK (stand_no > 0);

ALTER TABLE audit_log ADD CONSTRAINT chk_audit_log_action CHECK (action IN ('ADD', 'REMOVE', 'TRANSFER'));
ALTER TABLE audit_log ADD CONSTRAINT chk_audit_log_quantity_non_zero CHECK (quantity != 0);

ALTER TABLE stock_history ADD CONSTRAINT chk_stock_history_action CHECK (action IN ('ADD', 'REMOVE'));
ALTER TABLE stock_history ADD CONSTRAINT chk_stock_history_quantity_positive CHECK (quantity > 0);

ALTER TABLE installation ADD CONSTRAINT chk_installation_quantity_positive CHECK (quantity > 0);

