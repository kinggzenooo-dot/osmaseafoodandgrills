-- ==============================================================================
-- OSMAN'S SEAFOODS AND GRILL — SUPABASE DATABASE SCHEMA & SEED DATA
-- Fully compatible with Supabase SQL Editor, Supabase Storage & PostgREST API
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. TABLES CREATION
-- ==============================================================================

-- 2.1 Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
    id TEXT PRIMARY KEY DEFAULT ('cat-' || substr(md5(random()::text), 1, 8)),
    name TEXT NOT NULL UNIQUE,
    icon TEXT NOT NULL DEFAULT 'utensils',
    slug TEXT NOT NULL UNIQUE,
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 2.2 Menu Items Table (Supports Pictures, Options & Spice Levels)
CREATE TABLE IF NOT EXISTS public.menu_items (
    id TEXT PRIMARY KEY DEFAULT ('menu-' || substr(md5(random()::text), 1, 8)),
    name TEXT NOT NULL,
    category TEXT NOT NULL REFERENCES public.categories(name) ON UPDATE CASCADE ON DELETE RESTRICT,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    image TEXT NOT NULL, -- URL to Supabase Storage bucket or CDN image
    description TEXT NOT NULL DEFAULT '',
    prep_time INT NOT NULL DEFAULT 15, -- In minutes
    spice_level TEXT NOT NULL DEFAULT 'None' CHECK (spice_level IN ('None', 'Mild', 'Medium', 'Fiery', 'Extra Hot')),
    tags JSONB DEFAULT '[]'::jsonb, -- e.g. ["Chef Special", "Popular", "Gluten-Free"]
    available BOOLEAN NOT NULL DEFAULT true,
    options JSONB DEFAULT '{}'::jsonb, -- e.g. {"spiceLevels": [...], "sauces": [...], "sides": [...]}
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 2.3 System Users Table (Admin, Staff: Cashier/Kitchen/Driver, Customer)
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY DEFAULT ('usr-' || substr(md5(random()::text), 1, 8)),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'staff', 'admin')),
    subrole TEXT DEFAULT '' CHECK (subrole IN ('', 'owner', 'cashier', 'kds', 'dispatch')),
    pin TEXT DEFAULT '', -- 4-digit PIN for staff terminals
    phone TEXT DEFAULT '',
    avatar TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 2.4 Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY DEFAULT ('OSM-' || floor(1000 + random() * 9000)::text),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()),
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    order_type TEXT NOT NULL CHECK (order_type IN ('Dine-In', 'Takeout', 'Delivery')),
    delivery_address TEXT DEFAULT '',
    table_number TEXT DEFAULT '',
    pickup_time TEXT DEFAULT '',
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    tax NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    delivery_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    discount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    payment_method TEXT NOT NULL DEFAULT 'Cash',
    payment_status TEXT NOT NULL DEFAULT 'Paid' CHECK (payment_status IN ('Pending', 'Paid', 'Refunded')),
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Preparing', 'Ready', 'Completed', 'Cancelled')),
    assigned_driver TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    user_id TEXT DEFAULT ''
);

-- 2.5 Inventory Table
CREATE TABLE IF NOT EXISTS public.inventory (
    id TEXT PRIMARY KEY DEFAULT ('inv-' || substr(md5(random()::text), 1, 8)),
    name TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL,
    unit TEXT NOT NULL,
    stock NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    alert_threshold NUMERIC(10, 2) NOT NULL DEFAULT 10.00,
    cost_per_unit NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 2.6 Reservations Table
CREATE TABLE IF NOT EXISTS public.reservations (
    id TEXT PRIMARY KEY DEFAULT ('RES-' || floor(100 + random() * 900)::text),
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    date DATE NOT NULL,
    time TIME NOT NULL,
    guests INT NOT NULL DEFAULT 2,
    seating TEXT NOT NULL DEFAULT 'Coastal Terrace',
    notes TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'Confirmed' CHECK (status IN ('Pending', 'Confirmed', 'Cancelled', 'Seated')),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 2.7 Restaurant Settings Table
CREATE TABLE IF NOT EXISTS public.settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- ==============================================================================
-- 3. SUPABASE STORAGE BUCKET CONFIGURATION (FOR MENU PICTURES)
-- ==============================================================================

-- Create public storage bucket for menu item images
INSERT INTO storage.buckets (id, name, public)
VALUES ('menu-images', 'menu-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow public read access to all menu images
CREATE POLICY "Public Access to Menu Images" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'menu-images');

-- Allow authenticated and service role users to upload menu pictures
CREATE POLICY "Allow Image Uploads" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'menu-images');

CREATE POLICY "Allow Image Updates" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'menu-images');

CREATE POLICY "Allow Image Deletions" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'menu-images');

-- ==============================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Categories & Menu: Anyone can read (browsing menu & pictures)
CREATE POLICY "Public Read Categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Public Read Menu Items" ON public.menu_items FOR SELECT USING (true);
CREATE POLICY "Enable All For Menu Items" ON public.menu_items FOR ALL USING (true);
CREATE POLICY "Enable All For Categories" ON public.categories FOR ALL USING (true);

-- Orders: Anyone can create orders, public can read for tracking
CREATE POLICY "Public Insert Orders" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Read Orders" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Public Update Orders" ON public.orders FOR UPDATE USING (true);

-- Reservations: Public create and view
CREATE POLICY "Public Insert Reservations" ON public.reservations FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Read Reservations" ON public.reservations FOR SELECT USING (true);

-- Inventory & Settings & Users
CREATE POLICY "Enable All Inventory" ON public.inventory FOR ALL USING (true);
CREATE POLICY "Enable All Settings" ON public.settings FOR ALL USING (true);
CREATE POLICY "Enable All Users" ON public.users FOR ALL USING (true);

-- ==============================================================================
-- 5. INITIAL SEED DATA WITH HIGH-QUALITY FOOD PICTURES
-- ==============================================================================

-- 5.1 Categories Seed
INSERT INTO public.categories (id, name, icon, slug, display_order) VALUES
('cat-1', 'Seafood Buckets', 'anchor', 'seafood-buckets', 1),
('cat-2', 'Flame Grill', 'flame', 'flame-grill', 2),
('cat-3', 'Fresh Catch', 'fish', 'fresh-catch', 3),
('cat-4', 'Starters', 'utensils', 'starters', 4),
('cat-5', 'Sides & Dips', 'sparkles', 'sides-dips', 5),
('cat-6', 'Drinks', 'wine', 'drinks', 6),
('cat-7', 'Desserts', 'cake', 'desserts', 7)
ON CONFLICT (name) DO NOTHING;

-- 5.2 Menu Items with Picture URLs & Customization Options
INSERT INTO public.menu_items (id, name, category, price, image, description, prep_time, spice_level, tags, available, options) VALUES
(
    'menu-1',
    'Grand Seafood Bucket',
    'Seafood Buckets',
    68.00,
    'https://images.unsplash.com/photo-1559737194-67e3c1a84f37?auto=format&fit=crop&w=1200&q=80',
    'Whole Atlantic Lobster, Jumbo Tiger Prawns, Snow Crab Legs, Sweet Corn, and Smoked Sausage tossed in signature Cajun Garlic Butter.',
    25,
    'Fiery',
    '["Chef Special", "Popular", "Shellfish"]'::jsonb,
    true,
    '{"spiceLevels": ["Mild Butter", "Medium Cajun", "Fiery Ember"], "sauces": ["Signature Garlic Butter", "Lemon Herb Infusion", "Smoky Cajun Craze"], "sides": ["Garlic Butter Toast", "Steamed Jasmine Rice", "Cajun Fries"]}'::jsonb
),
(
    'menu-2',
    'Char-Grilled Lobster Tail',
    'Flame Grill',
    42.00,
    'https://images.unsplash.com/photo-1551248429-40975aa4de74?auto=format&fit=crop&w=1200&q=80',
    'Wood-fired 10oz Atlantic Lobster Tail basted with lemon garlic herb butter, served with grilled asparagus and charred lemon.',
    20,
    'Mild',
    '["Chef Special", "Gluten-Free", "Premium"]'::jsonb,
    true,
    '{"spiceLevels": ["Mild", "Spicy Glaze"], "sauces": ["Garlic Herb Butter", "Truffle Mayo"], "sides": ["Grilled Asparagus", "Truffle Fries"]}'::jsonb
),
(
    'menu-3',
    'Flame-Kissed Prime Ribeye',
    'Flame Grill',
    38.00,
    'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80',
    '14oz Prime Angus Ribeye seared over white oak charcoal, finished with fresh chimichurri butter and smoked sea salt.',
    22,
    'None',
    '["Flame Grill", "Customer Favorite", "Beef"]'::jsonb,
    true,
    '{"doneness": ["Rare", "Medium Rare", "Medium", "Medium Well", "Well Done"], "sauces": ["Fresh Chimichurri", "Red Wine Demiglace", "Peppercorn Cream"], "sides": ["Mashed Potatoes", "Charred Vegetables"]}'::jsonb
),
(
    'menu-4',
    'Jumbo Tiger Prawn Skewers',
    'Flame Grill',
    26.00,
    'https://images.unsplash.com/photo-1535400255456-984241443b29?auto=format&fit=crop&w=1200&q=80',
    'Four marinated jumbo tiger prawns threaded on rosemary skewers, char-broiled with citrus chili glaze and fresh cilantro.',
    15,
    'Medium',
    '["Flame Grill", "Gluten-Free"]'::jsonb,
    true,
    '{"spiceLevels": ["Mild Citrus", "Medium Chili", "Extra Hot"], "sauces": ["Chipotle Aioli", "Cilantro Lime"], "sides": ["Coconut Rice", "House Salad"]}'::jsonb
),
(
    'menu-5',
    'Osman''s Signature Crab Cakes',
    'Starters',
    22.00,
    'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=1200&q=80',
    'Pan-seared jumbo lump blue crab cakes with Old Bay seasoning, microgreens, and house-made zesty tartar sauce.',
    12,
    'Mild',
    '["Chef Special", "Starters"]'::jsonb,
    true,
    '{"sauces": ["Zesty Tartar Sauce", "Spicy Remoulade"]}'::jsonb
),
(
    'menu-6',
    'Crispy Calamari Rings',
    'Starters',
    16.00,
    'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=1200&q=80',
    'Lightly seasoned crispy tender squid rings served with smoked paprika aioli and charred lemon wedges.',
    10,
    'None',
    '["Starters", "Popular"]'::jsonb,
    true,
    '{}'::jsonb
),
(
    'menu-7',
    'Wood-Fired Wild Salmon',
    'Fresh Catch',
    32.00,
    'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=1200&q=80',
    'Fresh Pacific king salmon roasted cedar-plank style over coals with Dijon dill glaze and honey blistered tomatoes.',
    18,
    'None',
    '["Fresh Catch", "Healthy Choice", "Omega-3"]'::jsonb,
    true,
    '{}'::jsonb
),
(
    'menu-8',
    'Whole Mediterranean Sea Bass',
    'Fresh Catch',
    36.00,
    'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=1200&q=80',
    'Charcoal roasted Mediterranean branzino stuffed with wild thyme, garlic cloves, and extra virgin olive oil.',
    25,
    'None',
    '["Fresh Catch", "Gluten-Free"]'::jsonb,
    true,
    '{}'::jsonb
),
(
    'menu-9',
    'Charred Butter Corn on the Cob',
    'Sides & Dips',
    6.50,
    'https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&w=1200&q=80',
    'Sweet summer corn charred on the grill, coated in cotija cheese, chili lime salt, and fresh cilantro crema.',
    8,
    'Mild',
    '["Sides", "Vegetarian"]'::jsonb,
    true,
    '{}'::jsonb
),
(
    'menu-10',
    'Truffle Parmesan Fries',
    'Sides & Dips',
    9.50,
    'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=1200&q=80',
    'Double-cooked crispy skin fries tossed in black truffle oil, aged parmesan reggiano, and rosemary sea salt.',
    8,
    'None',
    '["Sides", "Customer Favorite"]'::jsonb,
    true,
    '{}'::jsonb
),
(
    'menu-11',
    'Ocean Breeze Craft Cocktail',
    'Drinks',
    12.00,
    'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=1200&q=80',
    'Blue curacao, artisan botanical gin, fresh pressed lime, elderflower tonic, served over crystalline ice sphere.',
    5,
    'None',
    '["Signature Drink", "Cocktail"]'::jsonb,
    true,
    '{"type": ["Alcoholic", "Non-Alcoholic Mocktail"]}'::jsonb
),
(
    'menu-12',
    'Classic Key Lime Pie',
    'Desserts',
    10.00,
    'https://images.unsplash.com/photo-1535141192574-5d4897c13136?auto=format&fit=crop&w=1200&q=80',
    'Authentic Key lime custard on a buttery graham cracker crust, topped with handmade vanilla whipped cream.',
    5,
    'None',
    '["Dessert", "Sweet Finish"]'::jsonb,
    true,
    '{}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    price = EXCLUDED.price,
    image = EXCLUDED.image,
    description = EXCLUDED.description,
    prep_time = EXCLUDED.prep_time,
    spice_level = EXCLUDED.spice_level,
    tags = EXCLUDED.tags,
    options = EXCLUDED.options;

-- 5.3 Default Users Seed (Pre-hashed SHA-256 passwords)
INSERT INTO public.users (id, name, email, password_hash, role, subrole, pin, phone, avatar) VALUES
('usr-admin', 'Osman Al-Mansoor', 'admin@osmanseafoods.com', 'a3ef4bb26cbaae45758cfdf1beccf8d3885d9d71c828ca1e8062ec87c4f420cb', 'admin', 'owner', '1001', '+1 (555) 382-7626', 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=200&q=80'),
('usr-cashier', 'Maria Santos', 'cashier@osmanseafoods.com', '39fa27725ca312389d3a77d5663ea119859f97984852654c6fa1bb90cfbfe37e', 'staff', 'cashier', '2002', '+1 (555) 018-4921', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80'),
('usr-chef', 'Carlos Rivera', 'chef@osmanseafoods.com', 'ecdf1f9b1fc3f6312a02448ca3318c3f68a5c3639d73d6113b28b78d2fb6435c', 'staff', 'kds', '3003', '+1 (555) 017-7382', 'https://images.unsplash.com/photo-1583394293214-28ded15ee548?auto=format&fit=crop&w=200&q=80'),
('usr-driver', 'David Vance', 'driver@osmanseafoods.com', 'cb2ce17b2b2b11546fe22247c490a02efad7077e68ad11b33364df22be7234aa', 'staff', 'dispatch', '4004', '+1 (555) 016-3910', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'),
('usr-customer', 'Elena Rostova', 'customer@gmail.com', '04c7eb3439e6a0d64a51e605d8bb638b9354117b4c46fbe87f17b3bc3ff6c4d8', 'customer', '', '', '+1 (555) 948-2019', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80')
ON CONFLICT (email) DO NOTHING;

-- 5.4 Inventory Seed
INSERT INTO public.inventory (id, name, category, unit, stock, alert_threshold, cost_per_unit) VALUES
('inv-1', 'Atlantic Lobster Tails', 'Seafood', 'lbs', 45.0, 15.0, 18.50),
('inv-2', 'Jumbo Tiger Prawns', 'Seafood', 'lbs', 60.0, 20.0, 12.00),
('inv-3', 'Prime Angus Ribeye Cuts', 'Meat', 'lbs', 35.0, 10.0, 16.00),
('inv-4', 'Wild Salmon Fillets', 'Seafood', 'lbs', 28.0, 10.0, 11.50),
('inv-5', 'Lump Blue Crab Meat', 'Seafood', 'lbs', 12.0, 15.0, 22.00),
('inv-6', 'Cajun Garlic Butter Sauce', 'Pantry', 'quarts', 30.0, 8.0, 4.50),
('inv-7', 'Oak Wood Charcoal', 'Supplies', 'bags', 18.0, 5.0, 14.00)
ON CONFLICT (name) DO NOTHING;

-- 5.5 Settings Seed
INSERT INTO public.settings (key, value) VALUES
('restaurantName', 'Osman''s Seafoods and Grill'),
('tagline', 'Where Oceanic Catch Meets Flame Grill Mastery'),
('address', '742 Coastal Boulevard, Harbor Bay, CA 90210'),
('phone', '+1 (555) 382-7626'),
('email', 'contact@osmanseafoods.com'),
('taxRate', '8.0'),
('deliveryFee', '4.99'),
('freeDeliveryThreshold', '60.00'),
('currencySymbol', '$'),
('openingHours', 'Mon-Sun: 11:00 AM - 10:30 PM'),
('acceptingOrders', 'true')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- ==============================================================================
-- 6. REALTIME REPLICATION (OPTIONAL: ENABLES LIVE UPDATES FOR KDS & ORDERS)
-- ==============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.menu_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory;
