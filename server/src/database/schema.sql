-- =============================================================================
-- KASHVIMLM ENTERPRISE POSTGRESQL DATABASE SCHEMA
-- Target Database: PostgreSQL 14+
-- Architecture: Binary MLM Tree, Dual-Leg BV Ledger, Commission Engine & Audit Trail
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables in reverse dependency order (if resetting)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS support_tickets CASCADE;
DROP TABLE IF EXISTS training_progress CASCADE;
DROP TABLE IF EXISTS payouts CASCADE;
DROP TABLE IF EXISTS wallet_transactions CASCADE;
DROP TABLE IF EXISTS wallets CASCADE;
DROP TABLE IF EXISTS commission_ledger CASCADE;
DROP TABLE IF EXISTS bv_ledger CASCADE;
DROP TABLE IF EXISTS mlm_tree CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS distributors CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- -----------------------------------------------------------------------------
-- 1. USERS TABLE (Authentication & Core Identity)
-- -----------------------------------------------------------------------------
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(30) NOT NULL DEFAULT 'distributor', -- 'distributor', 'admin', 'customer'
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_phone ON users(phone);

-- -----------------------------------------------------------------------------
-- 2. DISTRIBUTORS TABLE (MLM Profile, Sponsor Hierarchy & Business Centers)
-- -----------------------------------------------------------------------------
CREATE TABLE distributors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    member_id VARCHAR(20) UNIQUE NOT NULL, -- e.g. 88767139 (Rahul kaushal)
    full_name VARCHAR(150) NOT NULL,
    sponsor_id VARCHAR(20) NOT NULL, -- Direct sponsor who recruited this member
    parent_id VARCHAR(20),          -- Placement parent in the binary tree
    placement_leg VARCHAR(10) DEFAULT 'auto', -- 'left', 'right', 'auto'
    rank VARCHAR(50) NOT NULL DEFAULT 'Associate', -- Associate, Shared Partner, Pacesetter, Director, Executive, Diamond
    qualification_status VARCHAR(30) NOT NULL DEFAULT 'Active', -- 'Active', 'Grace Period', 'Inactive'
    current_psv NUMERIC(10, 2) NOT NULL DEFAULT 0.00, -- Personal Sales Volume in current 4-week cycle
    lifetime_bv NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    team_size INT NOT NULL DEFAULT 0,
    bank_name VARCHAR(100),
    bank_account_number VARCHAR(50),
    bank_ifsc_code VARCHAR(20),
    pan_number VARCHAR(15),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(20),
    country VARCHAR(50) DEFAULT 'India',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_distributors_member_id ON distributors(member_id);
CREATE INDEX idx_distributors_sponsor_id ON distributors(sponsor_id);
CREATE INDEX idx_distributors_parent_id ON distributors(parent_id);

-- -----------------------------------------------------------------------------
-- 3. PRODUCTS TABLE (Wholesale Catalog, Pricing & Commission Volume BV)
-- -----------------------------------------------------------------------------
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku VARCHAR(50) UNIQUE NOT NULL, -- e.g. KASH-HOZ-001, KASH-ELE-001
    name VARCHAR(200) NOT NULL,
    category VARCHAR(100) NOT NULL, -- 'Clothes & Hosiery (Hozri)', 'Electronics & Smart Devices'
    distributor_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00, -- Wholesale price paid by distributors
    mrp NUMERIC(10, 2) NOT NULL DEFAULT 0.00,              -- Maximum Retail Price
    volume_bv NUMERIC(10, 2) NOT NULL DEFAULT 0.00,        -- Business Volume points credited
    stock_quantity INT NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'In Stock',        -- 'In Stock', 'Low Stock', 'Out of Stock', 'Pending Pricing'
    image_url TEXT,
    size_spec VARCHAR(100),                                -- e.g. 'Size: M / L / XL / XXL' or '3.5L Cooking Capacity'
    short_desc TEXT,
    benefits JSONB DEFAULT '[]'::jsonb,
    usage_instructions TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_category ON products(category);

-- -----------------------------------------------------------------------------
-- 4. ORDERS & ORDER ITEMS TABLES (Wholesale Orders & Personal Volume Attribution)
-- -----------------------------------------------------------------------------
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(50) UNIQUE NOT NULL, -- e.g. KASH-ORD-781923
    distributor_id UUID NOT NULL REFERENCES distributors(id),
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_bv NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total_mrp NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    savings_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    payment_method VARCHAR(50) DEFAULT 'Online Payment',
    payment_status VARCHAR(30) NOT NULL DEFAULT 'Paid', -- 'Paid', 'Pending', 'Failed'
    order_status VARCHAR(30) NOT NULL DEFAULT 'Processing', -- 'Processing', 'Shipped', 'Delivered', 'Cancelled'
    shipping_address TEXT NOT NULL,
    tracking_number VARCHAR(100),
    delivery_eta VARCHAR(100) DEFAULT '2-4 Business Days via Bluedart Express',
    placed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    quantity INT NOT NULL DEFAULT 1,
    unit_distributor_price NUMERIC(10, 2) NOT NULL,
    unit_mrp NUMERIC(10, 2) NOT NULL,
    unit_bv NUMERIC(10, 2) NOT NULL,
    total_price NUMERIC(10, 2) NOT NULL,
    total_bv NUMERIC(10, 2) NOT NULL
);

CREATE INDEX idx_orders_distributor ON orders(distributor_id);
CREATE INDEX idx_orders_number ON orders(order_number);

-- -----------------------------------------------------------------------------
-- 5. MLM TREE TABLE (Binary Topology Structure: Left Leg & Right Leg)
-- -----------------------------------------------------------------------------
CREATE TABLE mlm_tree (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    distributor_id UUID NOT NULL REFERENCES distributors(id) ON DELETE CASCADE,
    business_center_code VARCHAR(20) NOT NULL DEFAULT 'BC 001', -- 'BC 001', 'BC 002', 'BC 003'
    parent_distributor_id UUID REFERENCES distributors(id),
    left_child_id UUID REFERENCES distributors(id),
    right_child_id UUID REFERENCES distributors(id),
    leg_position VARCHAR(10), -- 'left', 'right' under parent
    depth INT NOT NULL DEFAULT 0,
    tree_path TEXT, -- Materialized path for high-speed sub-tree queries, e.g. "/88767139/1861001/..."
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_mlm_tree_distributor ON mlm_tree(distributor_id);
CREATE INDEX idx_mlm_tree_parent ON mlm_tree(parent_distributor_id);

-- -----------------------------------------------------------------------------
-- 6. BV LEDGER TABLE (Volume Accumulation, Left vs Right Legs, Carryover)
-- -----------------------------------------------------------------------------
CREATE TABLE bv_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    distributor_id UUID NOT NULL REFERENCES distributors(id) ON DELETE CASCADE,
    source_order_id UUID REFERENCES orders(id),
    source_distributor_id UUID REFERENCES distributors(id),
    transaction_type VARCHAR(50) NOT NULL, -- 'Personal_Order', 'Downline_Left_Leg', 'Downline_Right_Leg', 'Cycle_Flush', 'Carryover_Credit'
    leg_affected VARCHAR(10), -- 'personal', 'left', 'right'
    amount_bv NUMERIC(10, 2) NOT NULL,
    left_leg_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    right_leg_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    carryover_left NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    carryover_right NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    cycle_week INT NOT NULL, -- Weekly commission cycle, e.g. Week 38
    cycle_year INT NOT NULL DEFAULT 2026,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bv_ledger_distributor ON bv_ledger(distributor_id);
CREATE INDEX idx_bv_ledger_cycle ON bv_ledger(cycle_year, cycle_week);

-- -----------------------------------------------------------------------------
-- 7. COMMISSION LEDGER TABLE (Weekly Matching Bonuses, TDS & Net Payouts)
-- -----------------------------------------------------------------------------
CREATE TABLE commission_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    distributor_id UUID NOT NULL REFERENCES distributors(id) ON DELETE CASCADE,
    cycle_week INT NOT NULL,
    cycle_year INT NOT NULL DEFAULT 2026,
    left_leg_volume NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    right_leg_volume NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    matched_volume NUMERIC(12, 2) NOT NULL DEFAULT 0.00, -- Volume from the weaker leg
    binary_matching_bonus NUMERIC(12, 2) NOT NULL DEFAULT 0.00, -- 10% of matched volume
    direct_sponsor_bonus NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    leadership_rank_bonus NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    gross_commission NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    tds_deduction NUMERIC(10, 2) NOT NULL DEFAULT 0.00, -- 5% TDS
    admin_charge NUMERIC(10, 2) NOT NULL DEFAULT 0.00,   -- 5% Admin fee
    net_payout NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(30) NOT NULL DEFAULT 'Calculated', -- 'Calculated', 'Approved', 'Paid', 'On Hold'
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_comm_distributor ON commission_ledger(distributor_id);
CREATE INDEX idx_comm_cycle ON commission_ledger(cycle_year, cycle_week);

-- -----------------------------------------------------------------------------
-- 8. WALLET & WALLET TRANSACTIONS TABLES (Member Balance & Fund Movements)
-- -----------------------------------------------------------------------------
CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    distributor_id UUID UNIQUE NOT NULL REFERENCES distributors(id) ON DELETE CASCADE,
    available_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    pending_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    lifetime_earnings NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    lifetime_withdrawals NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE wallet_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    transaction_type VARCHAR(30) NOT NULL, -- 'COMMISSION_CREDIT', 'WITHDRAWAL_DEBIT', 'ORDER_PAYMENT', 'ADMIN_ADJUSTMENT'
    amount NUMERIC(12, 2) NOT NULL,
    balance_before NUMERIC(12, 2) NOT NULL,
    balance_after NUMERIC(12, 2) NOT NULL,
    reference_id VARCHAR(100), -- Order ID or Commission Ledger ID
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_wallet_distributor ON wallets(distributor_id);
CREATE INDEX idx_wallet_trans ON wallet_transactions(wallet_id);

-- -----------------------------------------------------------------------------
-- 9. PAYOUTS TABLE (Weekly Bank Settlements, NEFT / RTGS Batches)
-- -----------------------------------------------------------------------------
CREATE TABLE payouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payout_batch_code VARCHAR(50) NOT NULL, -- e.g. BATCH-2026-W38
    distributor_id UUID NOT NULL REFERENCES distributors(id),
    commission_ledger_id UUID REFERENCES commission_ledger(id),
    amount NUMERIC(12, 2) NOT NULL,
    bank_name VARCHAR(100) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    ifsc_code VARCHAR(20) NOT NULL,
    utr_reference VARCHAR(100), -- Bank transaction reference number
    status VARCHAR(30) NOT NULL DEFAULT 'Queued', -- 'Queued', 'Processing', 'Settled', 'Failed'
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payouts_distributor ON payouts(distributor_id);
CREATE INDEX idx_payouts_batch ON payouts(payout_batch_code);

-- -----------------------------------------------------------------------------
-- 10. TRAINING PROGRESS TABLE (Distributor Learning & Certifications)
-- -----------------------------------------------------------------------------
CREATE TABLE training_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    distributor_id UUID NOT NULL REFERENCES distributors(id) ON DELETE CASCADE,
    module_code VARCHAR(50) NOT NULL, -- 'ORIENTATION', 'ETHICS', 'CONNECT_SHARING', 'COMPENSATION_PLAN'
    module_title VARCHAR(150) NOT NULL,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    score INT DEFAULT 100,
    completed_at TIMESTAMP WITH TIME ZONE,
    certificate_url TEXT
);

CREATE UNIQUE INDEX idx_training_dist_module ON training_progress(distributor_id, module_code);

-- -----------------------------------------------------------------------------
-- 11. SUPPORT TICKETS TABLE (Member Help Desk & Query Resolution)
-- -----------------------------------------------------------------------------
CREATE TABLE support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_number VARCHAR(50) UNIQUE NOT NULL, -- e.g. TICKET-2026-9041
    distributor_id UUID NOT NULL REFERENCES distributors(id),
    subject VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL, -- 'Commission & Payout', 'Order Delivery', 'Tree Placement', 'KYC & Bank'
    priority VARCHAR(20) NOT NULL DEFAULT 'Medium', -- 'Low', 'Medium', 'High', 'Urgent'
    status VARCHAR(30) NOT NULL DEFAULT 'Open', -- 'Open', 'In Progress', 'Resolved', 'Closed'
    description TEXT NOT NULL,
    admin_response TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_tickets_distributor ON support_tickets(distributor_id);

-- -----------------------------------------------------------------------------
-- 12. NOTIFICATIONS TABLE (Real-Time Member Alerts & Broadcasts)
-- -----------------------------------------------------------------------------
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    distributor_id UUID NOT NULL REFERENCES distributors(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'GENERAL', -- 'COMMISSION', 'ENROLLMENT', 'ORDER', 'RANK', 'SYSTEM'
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    action_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_distributor ON notifications(distributor_id);

-- -----------------------------------------------------------------------------
-- 13. AUDIT LOGS TABLE (Comprehensive System & Financial Event Logging)
-- -----------------------------------------------------------------------------
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID REFERENCES users(id),
    actor_role VARCHAR(50),
    action VARCHAR(100) NOT NULL, -- e.g. 'PRODUCT_PRICE_UPDATED', 'COMMISSION_CALCULATED', 'PAYOUT_APPROVED'
    resource_type VARCHAR(100) NOT NULL,
    resource_id VARCHAR(100),
    ip_address VARCHAR(50),
    user_agent TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_created_at ON audit_logs(created_at);
