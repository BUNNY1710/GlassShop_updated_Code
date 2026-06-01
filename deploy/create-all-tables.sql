-- ============================================
-- COMPLETE DATABASE SCHEMA FOR GLASS SHOP APPLICATION
-- Single SQL script to create all tables
-- Run this on your PostgreSQL database on EC2
-- ============================================

-- Connect to your database first:
-- psql -U glassshop_user -d glassshop -f create-all-tables.sql
-- OR
-- sudo -u postgres psql -d glassshop -f create-all-tables.sql

-- ============================================
-- 1. SHOP TABLE (Base table - no dependencies)
-- ============================================
CREATE TABLE IF NOT EXISTS shop (
    id BIGSERIAL PRIMARY KEY,
    shop_name VARCHAR(255) NOT NULL,
    owner_name VARCHAR(255),
    email VARCHAR(255),
    whatsapp_number VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_shop_created_at ON shop(created_at);

-- ============================================
-- 2. USERS TABLE (Depends on shop)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    user_name VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    whatsapp_number VARCHAR(50),
    shop_id BIGINT,
    CONSTRAINT fk_user_shop FOREIGN KEY (shop_id) REFERENCES shop(id) ON DELETE CASCADE,
    CONSTRAINT chk_users_role CHECK (role IN ('ROLE_ADMIN', 'ROLE_STAFF', 'ADMIN', 'STAFF'))
);

CREATE INDEX IF NOT EXISTS idx_users_user_name ON users(user_name);
CREATE INDEX IF NOT EXISTS idx_users_shop_id ON users(shop_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ============================================
-- 3. GLASS TABLE (Base table - no dependencies)
-- ============================================
CREATE TABLE IF NOT EXISTS glass (
    id BIGSERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    thickness INTEGER NOT NULL,
    unit VARCHAR(10) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_glass_type ON glass(type);
CREATE INDEX IF NOT EXISTS idx_glass_thickness ON glass(thickness);
CREATE UNIQUE INDEX IF NOT EXISTS idx_glass_type_thickness_unit ON glass(type, thickness, unit);

-- ============================================
-- 4. STOCK TABLE (Depends on glass and shop)
-- Includes hsn_no from V6 migration
-- ============================================
CREATE TABLE IF NOT EXISTS stock (
    id BIGSERIAL PRIMARY KEY,
    glass_id BIGINT NOT NULL,
    shop_id BIGINT NOT NULL,
    stand_no INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    min_quantity INTEGER NOT NULL DEFAULT 5,
    height VARCHAR(100),
    width VARCHAR(100),
    hsn_no VARCHAR(20),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_stock_glass FOREIGN KEY (glass_id) REFERENCES glass(id) ON DELETE CASCADE,
    CONSTRAINT fk_stock_shop FOREIGN KEY (shop_id) REFERENCES shop(id) ON DELETE CASCADE,
    CONSTRAINT uk_stock_glass_stand_shop_height_width UNIQUE (glass_id, stand_no, shop_id, height, width),
    CONSTRAINT chk_stock_quantity_non_negative CHECK (quantity >= 0),
    CONSTRAINT chk_stock_min_quantity_positive CHECK (min_quantity > 0),
    CONSTRAINT chk_stock_stand_no_positive CHECK (stand_no > 0)
);

CREATE INDEX IF NOT EXISTS idx_stock_glass_id ON stock(glass_id);
CREATE INDEX IF NOT EXISTS idx_stock_shop_id ON stock(shop_id);
CREATE INDEX IF NOT EXISTS idx_stock_stand_no ON stock(stand_no);
CREATE INDEX IF NOT EXISTS idx_stock_quantity ON stock(quantity);
CREATE INDEX IF NOT EXISTS idx_stock_updated_at ON stock(updated_at);
CREATE INDEX IF NOT EXISTS idx_stock_hsn_no ON stock(hsn_no);
CREATE INDEX IF NOT EXISTS idx_stock_low_stock ON stock(shop_id, quantity) WHERE quantity < min_quantity;

-- ============================================
-- 5. STOCK_HISTORY TABLE (Depends on shop)
-- ============================================
CREATE TABLE IF NOT EXISTS stock_history (
    id BIGSERIAL PRIMARY KEY,
    glass_id BIGINT NOT NULL,
    shop_id BIGINT NOT NULL,
    stand_no INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    action VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_stock_history_shop FOREIGN KEY (shop_id) REFERENCES shop(id) ON DELETE CASCADE,
    CONSTRAINT chk_stock_history_action CHECK (action IN ('ADD', 'REMOVE')),
    CONSTRAINT chk_stock_history_quantity_positive CHECK (quantity > 0)
);

CREATE INDEX IF NOT EXISTS idx_stock_history_glass_id ON stock_history(glass_id);
CREATE INDEX IF NOT EXISTS idx_stock_history_shop_id ON stock_history(shop_id);
CREATE INDEX IF NOT EXISTS idx_stock_history_created_at ON stock_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_history_shop_created_at ON stock_history(shop_id, created_at DESC);

-- ============================================
-- 6. AUDIT_LOG TABLE (Depends on shop)
-- ============================================
CREATE TABLE IF NOT EXISTS audit_log (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(255),
    role VARCHAR(50) NOT NULL,
    action VARCHAR(20) NOT NULL,
    glass_type VARCHAR(50),
    quantity INTEGER NOT NULL,
    stand_no INTEGER,
    from_stand INTEGER,
    to_stand INTEGER,
    height VARCHAR(100),
    width VARCHAR(100),
    unit VARCHAR(10),
    price DOUBLE PRECISION,
    shop_id BIGINT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_log_shop FOREIGN KEY (shop_id) REFERENCES shop(id) ON DELETE CASCADE,
    CONSTRAINT chk_audit_log_action CHECK (action IN ('ADD', 'REMOVE', 'TRANSFER')),
    CONSTRAINT chk_audit_log_quantity_non_zero CHECK (quantity != 0)
);

CREATE INDEX IF NOT EXISTS idx_audit_log_shop_id ON audit_log(shop_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_shop_timestamp ON audit_log(shop_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_username ON audit_log(username);

-- ============================================
-- 7. SITE TABLE (Base table - no dependencies)
-- ============================================
CREATE TABLE IF NOT EXISTS site (
    id BIGSERIAL PRIMARY KEY,
    client_name VARCHAR(255) NOT NULL,
    location VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_site_client_name ON site(client_name);

-- ============================================
-- 8. INSTALLATION TABLE (Depends on glass and site)
-- ============================================
CREATE TABLE IF NOT EXISTS installation (
    id BIGSERIAL PRIMARY KEY,
    glass_id BIGINT NOT NULL,
    site_id BIGINT NOT NULL,
    quantity INTEGER NOT NULL,
    install_date DATE,
    status VARCHAR(50),
    CONSTRAINT fk_installation_glass FOREIGN KEY (glass_id) REFERENCES glass(id) ON DELETE CASCADE,
    CONSTRAINT fk_installation_site FOREIGN KEY (site_id) REFERENCES site(id) ON DELETE CASCADE,
    CONSTRAINT chk_installation_quantity_positive CHECK (quantity > 0)
);

CREATE INDEX IF NOT EXISTS idx_installation_glass_id ON installation(glass_id);
CREATE INDEX IF NOT EXISTS idx_installation_site_id ON installation(site_id);
CREATE INDEX IF NOT EXISTS idx_installation_status ON installation(status);
CREATE INDEX IF NOT EXISTS idx_installation_install_date ON installation(install_date);

-- ============================================
-- 9. CUSTOMERS TABLE (Depends on shop)
-- ============================================
CREATE TABLE IF NOT EXISTS customers (
    id BIGSERIAL PRIMARY KEY,
    shop_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    mobile VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    gstin VARCHAR(15),
    state VARCHAR(100),
    city VARCHAR(100),
    pincode VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_customer_shop FOREIGN KEY (shop_id) REFERENCES shop(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_customers_shop_id ON customers(shop_id);
CREATE INDEX IF NOT EXISTS idx_customers_mobile ON customers(mobile);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at DESC);

-- ============================================
-- 10. QUOTATIONS TABLE (Depends on shop and customers)
-- Includes transportation_required from V5 migration
-- ============================================
CREATE TABLE IF NOT EXISTS quotations (
    id BIGSERIAL PRIMARY KEY,
    shop_id BIGINT NOT NULL,
    customer_id BIGINT NOT NULL,
    quotation_number VARCHAR(50) UNIQUE NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    billing_type VARCHAR(10) NOT NULL CHECK (billing_type IN ('GST', 'NON_GST')),
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SENT', 'CONFIRMED', 'REJECTED', 'EXPIRED')),
    
    -- Customer details (snapshot at quotation time)
    customer_name VARCHAR(255) NOT NULL,
    customer_mobile VARCHAR(20),
    customer_address TEXT,
    customer_gstin VARCHAR(15),
    customer_state VARCHAR(100),
    
    -- Quotation details
    quotation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_until DATE,
    
    -- Amounts
    subtotal DOUBLE PRECISION NOT NULL DEFAULT 0,
    installation_charge DOUBLE PRECISION DEFAULT 0,
    transport_charge DOUBLE PRECISION DEFAULT 0,
    discount DOUBLE PRECISION DEFAULT 0,
    transportation_required BOOLEAN DEFAULT FALSE NOT NULL,
    
    -- GST fields (nullable for NON_GST)
    gst_percentage DOUBLE PRECISION,
    cgst DOUBLE PRECISION,
    sgst DOUBLE PRECISION,
    igst DOUBLE PRECISION,
    gst_amount DOUBLE PRECISION DEFAULT 0,
    
    -- Final amount
    grand_total DOUBLE PRECISION NOT NULL DEFAULT 0,
    
    -- Confirmation details
    confirmed_at TIMESTAMP,
    confirmed_by VARCHAR(255),
    rejection_reason TEXT,
    
    -- Metadata
    created_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_quotation_shop FOREIGN KEY (shop_id) REFERENCES shop(id) ON DELETE CASCADE,
    CONSTRAINT fk_quotation_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    CONSTRAINT chk_gst_fields CHECK (
        (billing_type = 'GST' AND gst_percentage IS NOT NULL) OR
        (billing_type = 'NON_GST' AND gst_percentage IS NULL AND gst_amount = 0)
    )
);

CREATE INDEX IF NOT EXISTS idx_quotations_shop_id ON quotations(shop_id);
CREATE INDEX IF NOT EXISTS idx_quotations_customer_id ON quotations(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotations_quotation_number ON quotations(quotation_number);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);
CREATE INDEX IF NOT EXISTS idx_quotations_billing_type ON quotations(billing_type);
CREATE INDEX IF NOT EXISTS idx_quotations_quotation_date ON quotations(quotation_date DESC);
CREATE INDEX IF NOT EXISTS idx_quotations_created_at ON quotations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quotations_shop_status ON quotations(shop_id, status);

-- ============================================
-- 11. QUOTATION_ITEMS TABLE (Depends on quotations)
-- Includes height_unit, width_unit, design from V5 migration
-- ============================================
CREATE TABLE IF NOT EXISTS quotation_items (
    id BIGSERIAL PRIMARY KEY,
    quotation_id BIGINT NOT NULL,
    glass_type VARCHAR(100) NOT NULL,
    thickness VARCHAR(50),
    height DOUBLE PRECISION NOT NULL,
    width DOUBLE PRECISION NOT NULL,
    height_unit VARCHAR(10) DEFAULT 'FEET' NOT NULL,
    width_unit VARCHAR(10) DEFAULT 'FEET' NOT NULL,
    design VARCHAR(50),
    quantity INTEGER NOT NULL DEFAULT 1,
    rate_per_sqft DOUBLE PRECISION NOT NULL,
    area DOUBLE PRECISION NOT NULL,
    subtotal DOUBLE PRECISION NOT NULL,
    hsn_code VARCHAR(10),
    description TEXT,
    item_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_quotation_item_quotation FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE,
    CONSTRAINT chk_quotation_item_positive CHECK (height > 0 AND width > 0 AND quantity > 0 AND rate_per_sqft >= 0)
);

CREATE INDEX IF NOT EXISTS idx_quotation_items_quotation_id ON quotation_items(quotation_id);
CREATE INDEX IF NOT EXISTS idx_quotation_items_item_order ON quotation_items(quotation_id, item_order);

-- ============================================
-- 12. INVOICES TABLE (Depends on shop, customers, quotations)
-- ============================================
CREATE TABLE IF NOT EXISTS invoices (
    id BIGSERIAL PRIMARY KEY,
    shop_id BIGINT NOT NULL,
    customer_id BIGINT NOT NULL,
    quotation_id BIGINT,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    invoice_type VARCHAR(20) NOT NULL CHECK (invoice_type IN ('ADVANCE', 'FINAL')),
    billing_type VARCHAR(10) NOT NULL CHECK (billing_type IN ('GST', 'NON_GST')),
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Customer details (snapshot)
    customer_name VARCHAR(255) NOT NULL,
    customer_mobile VARCHAR(20),
    customer_address TEXT,
    customer_gstin VARCHAR(15),
    customer_state VARCHAR(100),
    
    -- Amounts
    subtotal DOUBLE PRECISION NOT NULL DEFAULT 0,
    installation_charge DOUBLE PRECISION DEFAULT 0,
    transport_charge DOUBLE PRECISION DEFAULT 0,
    discount DOUBLE PRECISION DEFAULT 0,
    
    -- GST fields (nullable for NON_GST)
    gst_percentage DOUBLE PRECISION,
    cgst DOUBLE PRECISION,
    sgst DOUBLE PRECISION,
    igst DOUBLE PRECISION,
    gst_amount DOUBLE PRECISION DEFAULT 0,
    
    -- Final amount
    grand_total DOUBLE PRECISION NOT NULL DEFAULT 0,
    
    -- Payment status
    payment_status VARCHAR(20) NOT NULL DEFAULT 'DUE' CHECK (payment_status IN ('PAID', 'PARTIAL', 'DUE')),
    paid_amount DOUBLE PRECISION DEFAULT 0,
    due_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
    
    -- Metadata
    created_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_invoice_shop FOREIGN KEY (shop_id) REFERENCES shop(id) ON DELETE CASCADE,
    CONSTRAINT fk_invoice_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    CONSTRAINT fk_invoice_quotation FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE SET NULL,
    CONSTRAINT chk_invoice_gst_fields CHECK (
        (billing_type = 'GST' AND gst_percentage IS NOT NULL) OR
        (billing_type = 'NON_GST' AND gst_percentage IS NULL AND gst_amount = 0)
    ),
    CONSTRAINT chk_invoice_payment CHECK (paid_amount >= 0 AND due_amount >= 0 AND (paid_amount + due_amount = grand_total))
);

CREATE INDEX IF NOT EXISTS idx_invoices_shop_id ON invoices(shop_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_quotation_id ON invoices(quotation_id);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_type ON invoices(invoice_type);
CREATE INDEX IF NOT EXISTS idx_invoices_billing_type ON invoices(billing_type);
CREATE INDEX IF NOT EXISTS idx_invoices_payment_status ON invoices(payment_status);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_date ON invoices(invoice_date DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_shop_status ON invoices(shop_id, payment_status);

-- ============================================
-- 13. INVOICE_ITEMS TABLE (Depends on invoices)
-- ============================================
CREATE TABLE IF NOT EXISTS invoice_items (
    id BIGSERIAL PRIMARY KEY,
    invoice_id BIGINT NOT NULL,
    glass_type VARCHAR(100) NOT NULL,
    thickness VARCHAR(50),
    height DOUBLE PRECISION NOT NULL,
    width DOUBLE PRECISION NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    rate_per_sqft DOUBLE PRECISION NOT NULL,
    area DOUBLE PRECISION NOT NULL,
    subtotal DOUBLE PRECISION NOT NULL,
    hsn_code VARCHAR(10),
    description TEXT,
    item_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_invoice_item_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    CONSTRAINT chk_invoice_item_positive CHECK (height > 0 AND width > 0 AND quantity > 0 AND rate_per_sqft >= 0)
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_item_order ON invoice_items(invoice_id, item_order);

-- ============================================
-- 14. PAYMENTS TABLE (Depends on invoices)
-- ============================================
CREATE TABLE IF NOT EXISTS payments (
    id BIGSERIAL PRIMARY KEY,
    invoice_id BIGINT NOT NULL,
    payment_mode VARCHAR(20) NOT NULL CHECK (payment_mode IN ('CASH', 'UPI', 'BANK', 'SPLIT')),
    amount DOUBLE PRECISION NOT NULL,
    payment_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reference_number VARCHAR(100),
    bank_name VARCHAR(255),
    cheque_number VARCHAR(50),
    transaction_id VARCHAR(100),
    notes TEXT,
    created_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_payment_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    CONSTRAINT chk_payment_amount_positive CHECK (amount > 0)
);

CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_payments_payment_mode ON payments(payment_mode);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_date ON payments(invoice_id, payment_date DESC);

-- ============================================
-- TABLE COMMENTS (Documentation)
-- ============================================
COMMENT ON TABLE shop IS 'Stores shop/company information';
COMMENT ON TABLE users IS 'Stores user accounts with role-based access';
COMMENT ON TABLE glass IS 'Stores glass type definitions (thickness, unit)';
COMMENT ON TABLE stock IS 'Stores stock inventory for each shop';
COMMENT ON TABLE stock_history IS 'Tracks stock change history for undo operations';
COMMENT ON TABLE audit_log IS 'Audit trail of all stock actions';
COMMENT ON TABLE site IS 'Stores installation site/client information';
COMMENT ON TABLE installation IS 'Tracks glass installations at sites';
COMMENT ON TABLE customers IS 'Stores customer information';
COMMENT ON TABLE quotations IS 'Stores quotation details with GST/Non-GST support';
COMMENT ON TABLE quotation_items IS 'Stores individual items in a quotation';
COMMENT ON TABLE invoices IS 'Stores invoice details converted from quotations';
COMMENT ON TABLE invoice_items IS 'Stores individual items in an invoice';
COMMENT ON TABLE payments IS 'Stores payment records for invoices';

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify all tables were created:

-- SELECT table_name 
-- FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- ORDER BY table_name;

-- SELECT COUNT(*) as total_tables 
-- FROM information_schema.tables 
-- WHERE table_schema = 'public';

-- ============================================
-- END OF SCRIPT
-- ============================================
-- Total Tables Created: 14
-- 1. shop
-- 2. users
-- 3. glass
-- 4. stock
-- 5. stock_history
-- 6. audit_log
-- 7. site
-- 8. installation
-- 9. customers
-- 10. quotations
-- 11. quotation_items
-- 12. invoices
-- 13. invoice_items
-- 14. payments
-- ============================================


