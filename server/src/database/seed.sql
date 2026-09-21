-- =============================================================================
-- KASHVIMLM DATABASE SEED SCRIPT
-- Seeds default verified ID Owner (Rahul kaushal - 88767139), downline binary tree,
-- Clothes/Hosiery & Electronics catalog, and initial wallet records.
-- =============================================================================

-- 1. Insert ID Owner User (Password: "RahulPass2026!", BCrypt Hash)
INSERT INTO users (id, email, phone, username, password_hash, role, is_active)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'rahul.kaushal@kashvimlm.com',
    '+91 98765 43210',
    '@rahul_kaushal',
    '$2a$10$w8TfVzPZZlV7k6YQhG/4OecEwJ9i7q.F1q7GkJ2bU8o5x4fK7v7qO', -- hashed password
    'admin',
    TRUE
) ON CONFLICT (email) DO NOTHING;

-- 2. Insert ID Owner Distributor Profile (Business Center Owner)
INSERT INTO distributors (
    id, user_id, member_id, full_name, sponsor_id, parent_id,
    placement_leg, rank, qualification_status, current_psv, lifetime_bv,
    team_size, bank_name, bank_account_number, bank_ifsc_code, pan_number,
    address, city, state, pincode, country
) VALUES (
    'b0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    '88767139',
    'Rahul kaushal',
    '10000000',
    NULL,
    'auto',
    'Emerald Director',
    'Active',
    100.00,
    14850.00,
    48,
    'HDFC Bank',
    '50100492819201',
    'HDFC0000123',
    'ABCDE1234F',
    'Greenfield Heights, Sector 18',
    'Mumbai',
    'Maharashtra',
    '400053',
    'India'
) ON CONFLICT (member_id) DO NOTHING;

-- 3. Insert ID Owner Wallet
INSERT INTO wallets (id, distributor_id, available_balance, pending_balance, lifetime_earnings, lifetime_withdrawals)
VALUES (
    'c0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    42500.00,
    12400.00,
    285000.00,
    242500.00
) ON CONFLICT (distributor_id) DO NOTHING;

-- 4. Insert Binary Tree Root for BC 001
INSERT INTO mlm_tree (distributor_id, business_center_code, depth, tree_path)
VALUES (
    'b0000000-0000-0000-0000-000000000001',
    'BC 001',
    0,
    '/88767139'
);

-- 5. Insert Clothes & Hosiery (Hozri) Products
INSERT INTO products (sku, name, category, distributor_price, mrp, volume_bv, stock_quantity, status, size_spec, short_desc, benefits, usage_instructions)
VALUES
(
    'KASH-HOZ-001',
    'Men''s Combed Cotton Hosiery T-Shirt',
    'Clothes & Hosiery (Hozri)',
    499.00,
    799.00,
    8.00,
    450,
    'In Stock',
    'Size: M / L / XL / XXL',
    '100% Super-combed breathable cotton hosiery fabric with soft ribbed collar.',
    '["Breathable all-day moisture wicking comfort", "Bio-washed anti-shrink fabric finish", "Zero-friction reinforced comfort seams"]'::jsonb,
    'Machine wash cold with like colors.'
),
(
    'KASH-HOZ-002',
    'Hosiery Comfort Innerwear / Vest (Pack of 2)',
    'Clothes & Hosiery (Hozri)',
    349.00,
    599.00,
    6.00,
    600,
    'In Stock',
    'Pack of 2 / Stretch Fit',
    'Ultra-soft stretchable micro-modal hosiery innerwear with contoured contour.',
    '["Moisture wicking sweat barrier protection", "Contoured body-hugging flexible fit", "Tagless comfort label to prevent irritation"]'::jsonb,
    'Daily base innerwear for all seasons.'
),
(
    'KASH-HOZ-003',
    'Anti-Bacterial Bamboo Hosiery Socks (Pack of 3)',
    'Clothes & Hosiery (Hozri)',
    299.00,
    499.00,
    5.00,
    850,
    'In Stock',
    'Pack of 3 Pairs',
    'Naturally anti-microbial bamboo-cotton blended hosiery socks with reinforced heel and toe.',
    '["Natural anti-odor shield prevents sweat bacteria", "Dynamic arch support compression band", "Soft terry sole cushioning for walking comfort"]'::jsonb,
    'Suitable for business, formal, and athletic footwear.'
),
(
    'KASH-HOZ-004',
    'Winter Fleeced Hosiery Hoodie & Sweatshirt',
    'Clothes & Hosiery (Hozri)',
    1199.00,
    1899.00,
    16.00,
    300,
    'In Stock',
    'Unisex Fit / Full Sleeves',
    'Heavy-weight brushed cotton fleece hosiery hoodie with front kangaroo pocket.',
    '["Thermal heat retention brushed inner lining", "Double-layered hood with adjustable drawstrings", "Ribbed elastane cuffs and waist hem"]'::jsonb,
    'Winter casual, morning walks, and outdoor travel.'
),
-- 6. Insert Electronics & Smart Devices Products
(
    'KASH-ELE-001',
    'Smart Active Wireless Noise-Cancelling Headphones',
    'Electronics & Smart Devices',
    2499.00,
    3999.00,
    25.00,
    200,
    'In Stock',
    'Headphones + Type-C Cable + Travel Pouch',
    'High-fidelity active noise-cancelling Bluetooth 5.3 headphones with deep bass drivers.',
    '["Up to 40 hours total wireless playback battery", "Hybrid active noise cancellation (ANC)", "Dual MEMS microphones for crystal-clear calls"]'::jsonb,
    'Power on and pair via Bluetooth with phone, tablet, or PC.'
),
(
    'KASH-ELE-002',
    'Smart Multi-Cook Digital Home Appliance',
    'Electronics & Smart Devices',
    3499.00,
    5499.00,
    35.00,
    150,
    'In Stock',
    '3.5L Cooking Capacity / 1200W',
    'Energy-efficient digital kitchen appliance with one-touch presets for healthy cooking.',
    '["Intelligent rapid 360-degree heating technology", "Non-stick dishwasher-safe food grade inner pot", "Overheat safety automatic shutoff mechanism"]'::jsonb,
    'Connect to standard 220V AC wall socket.'
),
(
    'KASH-ELE-003',
    'Ultra-Slim Pro Productivity Laptop',
    'Electronics & Smart Devices',
    38999.00,
    52999.00,
    220.00,
    50,
    'In Stock',
    '15.6 Inch Full HD IPS Screen',
    'High-performance ultra-slim notebook engineered for MLM business tracking and daily tasks.',
    '["High-speed SSD storage with 16GB high-bandwidth RAM", "Long-life 10-hour battery for working on the move", "Fingerprint biometric sensor for secure instant login"]'::jsonb,
    'Charge with provided 65W fast charger.'
),
(
    'KASH-ELE-004',
    'Pro 5G Dual-SIM Smartphone & Mobile Device',
    'Electronics & Smart Devices',
    14999.00,
    19999.00,
    120.00,
    120,
    'In Stock',
    '6.7 Inch AMOLED / 128GB Storage',
    'High-speed 5G smartphone equipped with AI triple camera and 5000mAh battery.',
    '["Super AMOLED 120Hz smooth refresh rate display", "5000mAh heavy-duty battery with 33W turbo charge", "50MP AI triple camera for clear video and photos"]'::jsonb,
    'Insert nano SIM card and follow initial Android setup.'
) ON CONFLICT (sku) DO NOTHING;

-- 7. Seed Initial System Notification
INSERT INTO notifications (distributor_id, title, message, type)
VALUES (
    'b0000000-0000-0000-0000-000000000001',
    'Welcome to KASHVIMLM Enterprise Portal',
    'Your Business Center 001 is active. Weekly commission cycle cutoff is Friday 11:59 PM.',
    'SYSTEM'
);
