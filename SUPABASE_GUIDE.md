# 🗄️ Supabase Setup & Menu Data Guide

This guide explains how to set up your database, storage bucket, and upload new menu items with photos into **Supabase**.

---

## ⚡ 1. Run the Schema in Supabase

1. Open your [Supabase Project Dashboard](https://supabase.com/dashboard).
2. Go to the **SQL Editor** tab (icon with `>_` on the left sidebar).
3. Click **New query**.
4. Open [`supabase_schema.sql`](file:///d:/MSEPROJECT/osman/supabase_schema.sql), copy all its contents, and paste them into the SQL Editor.
5. Click **Run** (or press `Ctrl` + `Enter`).

This will automatically create:
- `categories` table with default seafood & grill categories
- `menu_items` table with pictures, prices, spice levels, and options
- `users` table with Admin, Staff, and Customer accounts
- `orders` table with live status tracking
- `inventory`, `reservations`, and `settings` tables
- `menu-images` public Supabase Storage bucket with public access policies
- Realtime replication for live menu & order updates

---

## 📸 2. Uploading Pictures to Supabase Storage

The schema automatically sets up a public storage bucket named **`menu-images`**.

To upload pictures of your dishes:
1. In your Supabase Dashboard, click on **Storage** on the left menu.
2. Click on the **`menu-images`** bucket.
3. Click **Upload files** and select your food photos (e.g. `lobster-tail.jpg`, `crab-bucket.png`).
4. Once uploaded, click the **three dots (`...`)** next to the image and click **Get public URL**.
5. Copy the URL (it will look like: `https://<your-project>.supabase.co/storage/v1/object/public/menu-images/lobster-tail.jpg`).

---

## 🍽️ 3. How to Add New Menu Items with Photos

### Option A: Using Supabase Table Editor (Visual UI)
1. Go to **Table Editor** -> **`menu_items`**.
2. Click **Insert row**.
3. Fill in the fields:
   - `id`: `menu-13` (or leave blank to auto-generate)
   - `name`: `Cajun Garlic Snow Crab Feast`
   - `category`: `Seafood Buckets`
   - `price`: `54.00`
   - `image`: Paste your photo URL (from Supabase Storage or any image link)
   - `description`: `Steamed cluster of Atlantic snow crab legs steeped in rich Cajun garlic butter with corn and potatoes.`
   - `prep_time`: `20`
   - `spice_level`: `Medium` (choose: `None`, `Mild`, `Medium`, `Fiery`, `Extra Hot`)
   - `tags`: `["Chef Special", "Popular"]`
   - `available`: `true`
   - `options`: `{"spiceLevels": ["Mild", "Medium", "Fiery"], "sauces": ["Garlic Butter", "Cajun Heat"]}`
4. Click **Save**.

---

### Option B: Using SQL Query
You can run this query in the SQL Editor anytime to insert a new dish:

```sql
INSERT INTO public.menu_items (
    id,
    name,
    category,
    price,
    image,
    description,
    prep_time,
    spice_level,
    tags,
    available,
    options
) VALUES (
    'menu-13',
    'Wood-Fired Garlic Butter Prawns',
    'Flame Grill',
    28.50,
    'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?auto=format&fit=crop&w=1200&q=80',
    'Wood-grilled jumbo prawns tossed in roasted garlic chive butter with grilled focaccia.',
    15,
    'Mild',
    '["Flame Grill", "Customer Favorite"]'::jsonb,
    true,
    '{"sides": ["Garlic Rice", "Focaccia Toast"]}'::jsonb
);
```

---

## 🔄 4. Connecting the Backend to Supabase (Optional)

If you want the Python backend ([`app.py`](file:///d:/MSEPROJECT/osman/app.py)) to sync directly with Supabase:
1. Add your Supabase credentials into your `.env` file or Render Environment Variables:
   ```env
   SUPABASE_URL=https://<your-project>.supabase.co
   SUPABASE_KEY=your-service-role-or-anon-key
   ```
2. The frontend [`store.js`](file:///d:/MSEPROJECT/osman/js/store.js) and backend will query your Supabase database directly.
