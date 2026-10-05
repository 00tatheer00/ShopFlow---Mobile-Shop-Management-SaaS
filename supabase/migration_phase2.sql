-- ============================================
-- ShopFlow — Phase 2: Super Admin & Tenant Provisioning Migration
-- ============================================

-- 1. Add display_shop_id and subscription fields to shops table
ALTER TABLE shops ADD COLUMN IF NOT EXISTS display_shop_id TEXT UNIQUE;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('trialing', 'active', 'past_due', 'cancelled'));
ALTER TABLE shops ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE shops ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_shops_display_id ON shops(display_shop_id);

-- 2. Make shop_id nullable in shop_users for platform-level Super Admins
ALTER TABLE shop_users ALTER COLUMN shop_id DROP NOT NULL;

-- 3. Add function to generate display_shop_id like SHOP-001, SHOP-002
CREATE OR REPLACE FUNCTION generate_display_shop_id()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  next_seq INTEGER;
  new_id TEXT;
BEGIN
  SELECT COALESCE(MAX(SUBSTRING(display_shop_id FROM 6)::INTEGER), 0) + 1
  INTO next_seq
  FROM shops
  WHERE display_shop_id ~ '^SHOP-[0-9]+$';

  new_id := 'SHOP-' || LPAD(next_seq::TEXT, 3, '0');
  RETURN new_id;
END;
$$;

-- 4. Backfill existing shops with display_shop_id if null
DO $$
DECLARE
  r RECORD;
  i INTEGER := 1;
BEGIN
  FOR r IN SELECT id FROM shops WHERE display_shop_id IS NULL ORDER BY created_at ASC LOOP
    UPDATE shops 
    SET display_shop_id = 'SHOP-' || LPAD(i::TEXT, 3, '0') 
    WHERE id = r.id;
    i := i + 1;
  END LOOP;
END $$;

-- 5. Audit logs RLS policies for Super Admin and authenticated users
CREATE POLICY "Super admins can insert audit logs" ON audit_logs
  FOR INSERT WITH CHECK (is_super_admin());

CREATE POLICY "Authenticated users can insert audit logs" ON audit_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 6. Super admin management for plans
CREATE POLICY "Super admins can manage plans" ON plans
  FOR ALL USING (is_super_admin());
