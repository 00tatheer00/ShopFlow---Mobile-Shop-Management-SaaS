-- ============================================
-- ShopFlow Demo Accounts Seed Script
-- Run this in Supabase SQL Editor AFTER schema.sql
-- ============================================

-- 1. Ensure Plans exist
INSERT INTO plans (id, name, description, max_users, max_products, price, status)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Pro Plan', 'Full feature access for growing retail shops', 10, 5000, 499900, 'active')
ON CONFLICT (id) DO NOTHING;

-- 2. Create Demo Shop
INSERT INTO shops (id, name, slug, city, address, phone, email, display_shop_id, status, plan_id)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  'Al-Madina Mobile Zone',
  'al-madina-mobile',
  'Lahore',
  'Shop #12, Hafeez Centre, Main Boulevard, Gulberg III',
  '03001234567',
  'info@almadinamobile.com',
  'SHOP-001',
  'active',
  '11111111-1111-1111-1111-111111111111'
)
ON CONFLICT (id) DO NOTHING;

-- 3. Create Super Admin User: admin@shopflow.com / Password123!
DO $$
DECLARE
  super_admin_id UUID := '33333333-3333-3333-3333-333333333333';
  shop_owner_id UUID := '44444444-4444-4444-4444-444444444444';
BEGIN
  -- Super Admin auth.user
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@shopflow.com') THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      super_admin_id,
      'authenticated',
      'authenticated',
      'admin@shopflow.com',
      crypt('Password123!', gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"System Administrator"}'::jsonb,
      NOW(),
      NOW()
    );

    INSERT INTO profiles (id, email, full_name, phone)
    VALUES (super_admin_id, 'admin@shopflow.com', 'System Administrator', '03000000000')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO shop_users (shop_id, user_id, role, is_active)
    VALUES (NULL, super_admin_id, 'super_admin', true)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Shop Owner auth.user: owner@shopflow.com / Password123!
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'owner@shopflow.com') THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      shop_owner_id,
      'authenticated',
      'authenticated',
      'owner@shopflow.com',
      crypt('Password123!', gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Muhammad Usman"}'::jsonb,
      NOW(),
      NOW()
    );

    INSERT INTO profiles (id, email, full_name, phone)
    VALUES (shop_owner_id, 'owner@shopflow.com', 'Muhammad Usman', '03001234567')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO shop_users (shop_id, user_id, role, is_active)
    VALUES ('22222222-2222-2222-2222-222222222222', shop_owner_id, 'shop_owner', true)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Default categories for the demo shop
  INSERT INTO product_categories (shop_id, name, description)
  VALUES 
    ('22222222-2222-2222-2222-222222222222', 'Smartphones', 'Brand new and box-packed phones'),
    ('22222222-2222-2222-2222-222222222222', 'Used Phones', 'Pre-owned tested kit phones'),
    ('22222222-2222-2222-2222-222222222222', 'Accessories', 'Chargers, cables, airpods, covers')
  ON CONFLICT DO NOTHING;

  -- Default brands for the demo shop
  INSERT INTO brands (shop_id, name)
  VALUES 
    ('22222222-2222-2222-2222-222222222222', 'Samsung'),
    ('22222222-2222-2222-2222-222222222222', 'Apple'),
    ('22222222-2222-2222-2222-222222222222', 'Xiaomi / Redmi'),
    ('22222222-2222-2222-2222-222222222222', 'Infinix'),
    ('22222222-2222-2222-2222-222222222222', 'Tecno')
  ON CONFLICT DO NOTHING;

  -- Default Expense categories
  INSERT INTO expense_categories (shop_id, name)
  VALUES 
    ('22222222-2222-2222-2222-222222222222', 'Shop Rent'),
    ('22222222-2222-2222-2222-222222222222', 'Electricity Bill'),
    ('22222222-2222-2222-2222-222222222222', 'Staff Tea & Refreshment'),
    ('22222222-2222-2222-2222-222222222222', 'Packaging & Bags')
  ON CONFLICT DO NOTHING;

END $$;
