-- ==============================================================================
-- Migration: 012_shop_soft_delete_and_trash.sql
-- ShopFlow: Soft Delete, 30-Day Trash Retention & Permanent Purge
-- ==============================================================================

-- 1. Add soft delete columns to shops table
ALTER TABLE shops 
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL NULL;

CREATE INDEX IF NOT EXISTS idx_shops_deleted_at ON shops(deleted_at);

-- 2. Update get_user_shop_id() to strictly block users belonging to soft-deleted shops
CREATE OR REPLACE FUNCTION get_user_shop_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  shop UUID;
BEGIN
  SELECT su.shop_id INTO shop
  FROM shop_users su
  JOIN shops s ON s.id = su.shop_id
  WHERE su.user_id = auth.uid()
    AND su.is_active = TRUE
    AND s.deleted_at IS NULL
  LIMIT 1;
  
  RETURN shop;
END;
$$;

-- 3. Update RLS policy on shops table for non-super-admins
DROP POLICY IF EXISTS "Users can view their own shop" ON shops;
CREATE POLICY "Users can view their own shop" ON shops
  FOR SELECT USING (id = get_user_shop_id() AND deleted_at IS NULL);

-- 4. Stored procedure: delete_shop_permanently
-- Permanently deletes a single shop, its cascading children, and associated non-admin users
CREATE OR REPLACE FUNCTION delete_shop_permanently(p_shop_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- A. Remove auth accounts belonging only to this shop (never super_admins)
  DELETE FROM auth.users
  WHERE id IN (
    SELECT su.user_id
    FROM shop_users su
    WHERE su.shop_id = p_shop_id
      AND su.role != 'super_admin'
      AND NOT EXISTS (
        SELECT 1 FROM shop_users other_su
        WHERE other_su.user_id = su.user_id
          AND (other_su.shop_id != p_shop_id OR other_su.role = 'super_admin')
      )
  );

  -- B. Delete transactional data in dependency order to prevent FK violations
  DELETE FROM sale_items WHERE sale_id IN (SELECT id FROM sales WHERE shop_id = p_shop_id);
  DELETE FROM sales WHERE shop_id = p_shop_id;
  DELETE FROM purchase_items WHERE purchase_id IN (SELECT id FROM purchases WHERE shop_id = p_shop_id);
  DELETE FROM purchases WHERE shop_id = p_shop_id;
  DELETE FROM udhaar_ledger WHERE shop_id = p_shop_id;
  DELETE FROM payments WHERE shop_id = p_shop_id;
  DELETE FROM stock_adjustments WHERE shop_id = p_shop_id;
  DELETE FROM imei_records WHERE shop_id = p_shop_id;
  DELETE FROM products WHERE shop_id = p_shop_id;
  DELETE FROM brands WHERE shop_id = p_shop_id;
  DELETE FROM product_categories WHERE shop_id = p_shop_id;
  DELETE FROM expenses WHERE shop_id = p_shop_id;
  DELETE FROM expense_categories WHERE shop_id = p_shop_id;
  DELETE FROM customers WHERE shop_id = p_shop_id;
  DELETE FROM suppliers WHERE shop_id = p_shop_id;
  DELETE FROM shop_settings WHERE shop_id = p_shop_id;
  DELETE FROM shop_subscriptions WHERE shop_id = p_shop_id;
  DELETE FROM email_logs WHERE shop_id = p_shop_id;
  DELETE FROM audit_logs WHERE shop_id = p_shop_id;
  DELETE FROM shop_users WHERE shop_id = p_shop_id;

  -- C. Delete the shop row itself
  DELETE FROM shops WHERE id = p_shop_id;
END;
$$;

-- 5. Stored procedure: purge_expired_trashed_shops
-- Automatically deletes shops where deleted_at is older than 30 days
CREATE OR REPLACE FUNCTION purge_expired_trashed_shops()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_shop RECORD;
  v_count INTEGER := 0;
BEGIN
  FOR v_shop IN
    SELECT id FROM shops
    WHERE deleted_at IS NOT NULL
      AND deleted_at < NOW() - INTERVAL '30 days'
  LOOP
    PERFORM delete_shop_permanently(v_shop.id);
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- ==============================================================================
-- OPTIONAL: pg_cron setup for daily scheduled purging (30-day retention)
-- In Supabase dashboard -> Database -> Extensions -> Enable "pg_cron"
-- Then execute:
--   SELECT cron.schedule(
--     'purge-expired-shops-daily',
--     '0 3 * * *',
--     $$ SELECT purge_expired_trashed_shops(); $$
--   );
-- ==============================================================================

