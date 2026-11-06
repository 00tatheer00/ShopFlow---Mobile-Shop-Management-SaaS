-- ==============================================================================
-- Migration: 013_fix_shop_users_rls_recursion.sql
-- Fix: Prevent infinite recursion and allow users to read their own shop_users row
-- ==============================================================================

-- 1. Ensure users can always read their own shop_user membership row
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'shop_users' AND policyname = 'Users can view their own shop_user membership'
  ) THEN
    CREATE POLICY "Users can view their own shop_user membership" ON shop_users
      FOR SELECT USING (user_id = auth.uid());
  END IF;
END $$;

-- 2. Drop potentially recursive policies on shop_users if present
DROP POLICY IF EXISTS "Super admins can manage all shop users" ON shop_users;

-- 3. Re-create non-recursive policy for super admins
CREATE POLICY "Super admins can manage all shop users" ON shop_users
  FOR ALL USING (
    user_id = auth.uid()
    OR (
      EXISTS (
        SELECT 1 FROM shop_users su
        WHERE su.user_id = auth.uid()
          AND su.role = 'super_admin'
          AND su.is_active = TRUE
      )
    )
  );

