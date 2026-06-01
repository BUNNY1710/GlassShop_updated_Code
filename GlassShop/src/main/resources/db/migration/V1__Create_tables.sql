-- ============================================
-- Flyway Migration: Create Base Tables
-- ============================================

-- Table: shop
CREATE TABLE IF NOT EXISTS shop (
    id BIGSERIAL PRIMARY KEY,
    shop_name VARCHAR(255) NOT NULL,
    owner_name VARCHAR(255),
    email VARCHAR(255),
    whatsapp_number VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_shop_created_at ON shop(created_at);

-- Table: users
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    user_name VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    whatsapp_number VARCHAR(50),
    shop_id BIGINT,
    CONSTRAINT fk_user_shop FOREIGN KEY (shop_id) REFERENCES shop(id) ON DELETE CASCADE
);

CREATE INDEX idx_users_user_name ON users(user_name);
CREATE INDEX idx_users_shop_id ON users(shop_id);
CREATE INDEX idx_users_role ON users(role);

-- Table: glass
CREATE TABLE IF NOT EXISTS glass (
    id BIGSERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    thickness INTEGER NOT NULL,
    unit VARCHAR(10) NOT NULL
);

CREATE INDEX idx_glass_type ON glass(type);
CREATE INDEX idx_glass_thickness ON glass(thickness);
CREATE UNIQUE INDEX idx_glass_type_thickness_unit ON glass(type, thickness, unit);

-- Table: stock
CREATE TABLE IF NOT EXISTS stock (
    id BIGSERIAL PRIMARY KEY,
    glass_id BIGINT NOT NULL,
    shop_id BIGINT NOT NULL,
    stand_no INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    min_quantity INTEGER NOT NULL DEFAULT 5,
    height VARCHAR(100),
    width VARCHAR(100),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_stock_glass FOREIGN KEY (glass_id) REFERENCES glass(id) ON DELETE CASCADE,
    CONSTRAINT fk_stock_shop FOREIGN KEY (shop_id) REFERENCES shop(id) ON DELETE CASCADE,
    CONSTRAINT uk_stock_glass_stand_shop_height_width UNIQUE (glass_id, stand_no, shop_id, height, width)
);

CREATE INDEX idx_stock_glass_id ON stock(glass_id);
CREATE INDEX idx_stock_shop_id ON stock(shop_id);
CREATE INDEX idx_stock_stand_no ON stock(stand_no);
CREATE INDEX idx_stock_quantity ON stock(quantity);
CREATE INDEX idx_stock_updated_at ON stock(updated_at);
CREATE INDEX idx_stock_low_stock ON stock(shop_id, quantity) WHERE quantity < min_quantity;

-- Table: stock_history
CREATE TABLE IF NOT EXISTS stock_history (
    id BIGSERIAL PRIMARY KEY,
    glass_id BIGINT NOT NULL,
    shop_id BIGINT NOT NULL,
    stand_no INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    action VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_stock_history_shop FOREIGN KEY (shop_id) REFERENCES shop(id) ON DELETE CASCADE
);

CREATE INDEX idx_stock_history_glass_id ON stock_history(glass_id);
CREATE INDEX idx_stock_history_shop_id ON stock_history(shop_id);
CREATE INDEX idx_stock_history_created_at ON stock_history(created_at DESC);
CREATE INDEX idx_stock_history_shop_created_at ON stock_history(shop_id, created_at DESC);

-- Table: audit_log
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
    CONSTRAINT fk_audit_log_shop FOREIGN KEY (shop_id) REFERENCES shop(id) ON DELETE CASCADE
);

CREATE INDEX idx_audit_log_shop_id ON audit_log(shop_id);
CREATE INDEX idx_audit_log_timestamp ON audit_log(timestamp DESC);
CREATE INDEX idx_audit_log_shop_timestamp ON audit_log(shop_id, timestamp DESC);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_username ON audit_log(username);

-- Table: site
CREATE TABLE IF NOT EXISTS site (
    id BIGSERIAL PRIMARY KEY,
    client_name VARCHAR(255) NOT NULL,
    location VARCHAR(255)
);

CREATE INDEX idx_site_client_name ON site(client_name);

-- Table: installation
CREATE TABLE IF NOT EXISTS installation (
    id BIGSERIAL PRIMARY KEY,
    glass_id BIGINT NOT NULL,
    site_id BIGINT NOT NULL,
    quantity INTEGER NOT NULL,
    install_date DATE,
    status VARCHAR(50),
    CONSTRAINT fk_installation_glass FOREIGN KEY (glass_id) REFERENCES glass(id) ON DELETE CASCADE,
    CONSTRAINT fk_installation_site FOREIGN KEY (site_id) REFERENCES site(id) ON DELETE CASCADE
);

CREATE INDEX idx_installation_glass_id ON installation(glass_id);
CREATE INDEX idx_installation_site_id ON installation(site_id);
CREATE INDEX idx_installation_status ON installation(status);
CREATE INDEX idx_installation_install_date ON installation(install_date);

-- Add comments for documentation
COMMENT ON TABLE shop IS 'Stores shop/company information';
COMMENT ON TABLE users IS 'Stores user accounts with role-based access';
COMMENT ON TABLE glass IS 'Stores glass type definitions (thickness, unit)';
COMMENT ON TABLE stock IS 'Stores stock inventory for each shop';
COMMENT ON TABLE stock_history IS 'Tracks stock change history for undo operations';
COMMENT ON TABLE audit_log IS 'Audit trail of all stock actions';
COMMENT ON TABLE site IS 'Stores installation site/client information';
COMMENT ON TABLE installation IS 'Tracks glass installations at sites';

