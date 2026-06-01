-- ============================================
-- Flyway Migration: Create Quotation & Billing Tables
-- ============================================

-- Table: customers
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

CREATE INDEX idx_customers_shop_id ON customers(shop_id);
CREATE INDEX idx_customers_mobile ON customers(mobile);
CREATE INDEX idx_customers_name ON customers(name);
CREATE INDEX idx_customers_created_at ON customers(created_at DESC);

-- Table: quotations
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

CREATE INDEX idx_quotations_shop_id ON quotations(shop_id);
CREATE INDEX idx_quotations_customer_id ON quotations(customer_id);
CREATE INDEX idx_quotations_quotation_number ON quotations(quotation_number);
CREATE INDEX idx_quotations_status ON quotations(status);
CREATE INDEX idx_quotations_billing_type ON quotations(billing_type);
CREATE INDEX idx_quotations_quotation_date ON quotations(quotation_date DESC);
CREATE INDEX idx_quotations_created_at ON quotations(created_at DESC);
CREATE INDEX idx_quotations_shop_status ON quotations(shop_id, status);

-- Table: quotation_items
CREATE TABLE IF NOT EXISTS quotation_items (
    id BIGSERIAL PRIMARY KEY,
    quotation_id BIGINT NOT NULL,
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
    
    CONSTRAINT fk_quotation_item_quotation FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE,
    CONSTRAINT chk_quotation_item_positive CHECK (height > 0 AND width > 0 AND quantity > 0 AND rate_per_sqft >= 0)
);

CREATE INDEX idx_quotation_items_quotation_id ON quotation_items(quotation_id);
CREATE INDEX idx_quotation_items_item_order ON quotation_items(quotation_id, item_order);

-- Table: invoices
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

CREATE INDEX idx_invoices_shop_id ON invoices(shop_id);
CREATE INDEX idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX idx_invoices_quotation_id ON invoices(quotation_id);
CREATE INDEX idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX idx_invoices_invoice_type ON invoices(invoice_type);
CREATE INDEX idx_invoices_billing_type ON invoices(billing_type);
CREATE INDEX idx_invoices_payment_status ON invoices(payment_status);
CREATE INDEX idx_invoices_invoice_date ON invoices(invoice_date DESC);
CREATE INDEX idx_invoices_created_at ON invoices(created_at DESC);
CREATE INDEX idx_invoices_shop_status ON invoices(shop_id, payment_status);

-- Table: invoice_items
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

CREATE INDEX idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX idx_invoice_items_item_order ON invoice_items(invoice_id, item_order);

-- Table: payments
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

CREATE INDEX idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX idx_payments_payment_date ON payments(payment_date DESC);
CREATE INDEX idx_payments_payment_mode ON payments(payment_mode);
CREATE INDEX idx_payments_invoice_date ON payments(invoice_id, payment_date DESC);

