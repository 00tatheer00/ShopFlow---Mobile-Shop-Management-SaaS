-- ============================================================
-- Migration: 017_security_hardening.sql
-- ShopFlow: Close critical tenant-isolation & privilege-escalation holes
--
-- WHAT THIS FIXES
--  1. SECURITY DEFINER functions (process_sale, increment/decrement stock,
--     generate_invoice_number, seed/generate helpers) accepted ANY shop_id
--     from the caller and were executable by the public `anon` key.
--     Anyone could create sales, change stock or invoice counters in ANY shop.
--  2. Shop owners could UPDATE/INSERT shop_users rows with role 'super_admin'
--     (RLS had no WITH CHECK on role) => full platform takeover.
--  3. Cashiers could delete / rewrite sales, expenses, ledger rows directly
--     through the public REST API (RLS only checked shop_id, not role).
--  4. audit_logs could be inserted for any shop_id.
--  5. process_sale used random invoice numbers (collisions on busy days),
--     ignored the shop invoice prefix, and had a race on udhaar balances.
--  6. Migration 013 policy "Super admins can manage all shop users" was
--     FOR ALL USING (user_id = auth.uid() OR ...): ANY user (even a cashier)
--     could UPDATE their own row and set role = 'super_admin'.
--  7. Migration 012 delete_shop_permanently() / purge_expired_trashed_shops()
--     were SECURITY DEFINER with no permission check and executable by the
--     public anon key: anyone could wipe any shop and its user accounts.
--
-- Keeps 012's rule that users of soft-deleted shops lose access.
--
-- Safe to run more than once.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 0. Helper: assert the caller may act on a shop
--    * service_role (server admin client)           -> allowed
--    * direct DB sessions (SQL editor, migrations)  -> allowed
--    * PostgREST users (anon / authenticated)       -> only their own shop
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION assert_shop_access(p_shop_id UUID)
RETURNS VOID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF coalesce(auth.role(), '') = 'service_role' THEN
    RETURN;
  END IF;

  -- Not coming through the API gateway (e.g. SQL editor / psql): trusted
  IF session_user <> 'authenticator' AND auth.uid() IS NULL THEN
    RETURN;
  END IF;

  IF auth.uid() IS NULL
     OR p_shop_id IS NULL
     OR p_shop_id IS DISTINCT FROM get_user_shop_id() THEN
    RAISE EXCEPTION 'Access denied for this shop' USING ERRCODE = '42501';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION assert_shop_access(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION assert_shop_access(UUID) TO authenticated, service_role;

-- Deterministic shop lookup (oldest active membership wins).
-- Users of soft-deleted shops (migration 012) get no shop.
CREATE OR REPLACE FUNCTION get_user_shop_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT su.shop_id
  FROM shop_users su
  JOIN shops s ON s.id = su.shop_id
  WHERE su.user_id = auth.uid()
    AND su.is_active = TRUE
    AND s.deleted_at IS NULL
  ORDER BY su.created_at ASC
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT su.role
  FROM shop_users su
  LEFT JOIN shops s ON s.id = su.shop_id
  WHERE su.user_id = auth.uid()
    AND su.is_active = TRUE
    AND (su.shop_id IS NULL OR s.deleted_at IS NULL)
  ORDER BY su.created_at ASC
  LIMIT 1;
$$;

-- SECURITY DEFINER runs as the table owner, which bypasses RLS:
-- no policy recursion when used inside shop_users policies.
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM shop_users
    WHERE user_id = auth.uid() AND role = 'super_admin' AND is_active = TRUE
  );
$$;

-- ------------------------------------------------------------
-- 1. Stock functions: enforce tenant ownership
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION decrement_product_stock(
  p_shop_id UUID,
  p_product_id UUID,
  p_quantity INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_stock INTEGER;
BEGIN
  PERFORM assert_shop_access(p_shop_id);

  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity to decrement must be greater than zero';
  END IF;

  UPDATE products
  SET stock_quantity = stock_quantity - p_quantity,
      updated_at = NOW()
  WHERE id = p_product_id
    AND shop_id = p_shop_id
    AND stock_quantity >= p_quantity
  RETURNING stock_quantity INTO v_new_stock;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient stock or product not found';
  END IF;

  RETURN v_new_stock;
END;
$$;

CREATE OR REPLACE FUNCTION increment_product_stock(
  p_shop_id UUID,
  p_product_id UUID,
  p_quantity INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_stock INTEGER;
BEGIN
  PERFORM assert_shop_access(p_shop_id);

  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity to increment must be greater than zero';
  END IF;

  UPDATE products
  SET stock_quantity = stock_quantity + p_quantity,
      updated_at = NOW()
  WHERE id = p_product_id
    AND shop_id = p_shop_id
  RETURNING stock_quantity INTO v_new_stock;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found in this shop';
  END IF;

  RETURN v_new_stock;
END;
$$;

REVOKE ALL ON FUNCTION decrement_product_stock(UUID, UUID, INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION increment_product_stock(UUID, UUID, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION decrement_product_stock(UUID, UUID, INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION increment_product_stock(UUID, UUID, INTEGER) TO authenticated, service_role;

-- ------------------------------------------------------------
-- 2. Invoice number generator: per-shop, per-day sequence
--    Format: <PREFIX>-YYYYMMDD-0001 (Pakistan date)
--    Serialised with an advisory lock => no duplicates, no gaps from races.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION next_invoice_number(p_shop_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix TEXT;
  v_day TEXT;
  v_base TEXT;
  v_seq INTEGER;
  v_candidate TEXT;
BEGIN
  PERFORM assert_shop_access(p_shop_id);
  PERFORM pg_advisory_xact_lock(hashtext('shopflow-invoice:' || p_shop_id::TEXT));

  SELECT NULLIF(regexp_replace(upper(coalesce(invoice_prefix, '')), '[^A-Z0-9]', '', 'g'), '')
  INTO v_prefix
  FROM shop_settings
  WHERE shop_id = p_shop_id;

  v_prefix := coalesce(v_prefix, 'INV');
  v_day := to_char(NOW() AT TIME ZONE 'Asia/Karachi', 'YYYYMMDD');
  v_base := v_prefix || '-' || v_day || '-';

  SELECT count(*) + 1 INTO v_seq
  FROM sales
  WHERE shop_id = p_shop_id
    AND invoice_number LIKE v_base || '%';

  LOOP
    v_candidate := v_base || lpad(v_seq::TEXT, 4, '0');
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM sales WHERE shop_id = p_shop_id AND invoice_number = v_candidate
    );
    v_seq := v_seq + 1;
  END LOOP;

  RETURN v_candidate;
END;
$$;

REVOKE ALL ON FUNCTION next_invoice_number(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION next_invoice_number(UUID) TO authenticated, service_role;

-- Legacy generator: keep for compatibility but lock it down
CREATE OR REPLACE FUNCTION generate_invoice_number(p_shop_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN next_invoice_number(p_shop_id);
END;
$$;
REVOKE ALL ON FUNCTION generate_invoice_number(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION generate_invoice_number(UUID) TO authenticated, service_role;

-- ------------------------------------------------------------
-- 3. process_sale: secure, atomic POS checkout
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS process_sale(UUID, UUID, UUID, JSONB, BIGINT, TEXT, BIGINT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION process_sale(
  p_shop_id UUID,
  p_created_by UUID,
  p_customer_id UUID DEFAULT NULL,
  p_items JSONB DEFAULT '[]'::JSONB,
  p_discount BIGINT DEFAULT 0,
  p_payment_method TEXT DEFAULT 'cash',
  p_amount_paid BIGINT DEFAULT 0,
  p_notes TEXT DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID;
  v_sale_id UUID;
  v_invoice_number TEXT;
  v_subtotal BIGINT := 0;
  v_total BIGINT := 0;
  v_actual_paid BIGINT := 0;
  v_amount_due BIGINT := 0;
  v_item JSONB;
  v_qty INT;
  v_price BIGINT;
  v_product RECORD;
  v_imei RECORD;
  v_imei_id UUID;
  v_inserted_item_id UUID;
  v_existing RECORD;
  v_previous_balance BIGINT := 0;
  v_items_count INT := 0;
BEGIN
  PERFORM assert_shop_access(p_shop_id);

  -- Never trust the caller for "who": use the JWT user when present
  v_user := coalesce(auth.uid(), p_created_by);
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Unknown user';
  END IF;

  IF p_payment_method NOT IN ('cash', 'bank_transfer', 'easypaisa', 'jazzcash', 'other') THEN
    RAISE EXCEPTION 'Invalid payment method';
  END IF;

  -- 1. Idempotency (double click / retry protection)
  IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
    SELECT id, invoice_number INTO v_existing
    FROM sales
    WHERE shop_id = p_shop_id AND idempotency_key = p_idempotency_key
    LIMIT 1;

    IF FOUND THEN
      RETURN jsonb_build_object(
        'success', true,
        'sale_id', v_existing.id,
        'invoice_number', v_existing.invoice_number,
        'is_duplicate', true
      );
    END IF;
  END IF;

  -- 2. Customer (lock row so concurrent udhaar entries are serialised)
  IF p_customer_id IS NOT NULL THEN
    PERFORM 1 FROM customers
    WHERE id = p_customer_id AND shop_id = p_shop_id AND is_active = TRUE
    FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Customer not found, inactive, or belongs to another shop';
    END IF;
  END IF;

  v_items_count := coalesce(jsonb_array_length(p_items), 0);
  IF v_items_count = 0 THEN
    RAISE EXCEPTION 'Sale must contain at least one item';
  END IF;

  -- 3. Validate every line
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_qty := (v_item->>'quantity')::INT;
    v_price := (v_item->>'unit_price')::BIGINT;

    IF v_qty IS NULL OR v_qty <= 0 THEN
      RAISE EXCEPTION 'Quantity must be at least 1';
    END IF;
    IF v_price IS NULL OR v_price <= 0 THEN
      RAISE EXCEPTION 'Price must be greater than zero';
    END IF;

    SELECT id, name, stock_quantity, is_active, is_imei_tracked
    INTO v_product
    FROM products
    WHERE id = (v_item->>'product_id')::UUID AND shop_id = p_shop_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product does not exist in this shop';
    END IF;
    IF NOT v_product.is_active THEN
      RAISE EXCEPTION 'Product "%" is archived/inactive', v_product.name;
    END IF;

    v_imei_id := NULLIF(v_item->>'imei_record_id', '')::UUID;

    IF v_product.is_imei_tracked THEN
      IF v_imei_id IS NULL THEN
        RAISE EXCEPTION 'Please select the IMEI for "%"', v_product.name;
      END IF;
      IF v_qty <> 1 THEN
        RAISE EXCEPTION 'IMEI items must be sold one unit per line';
      END IF;
    END IF;

    IF v_imei_id IS NOT NULL THEN
      SELECT id, status, product_id INTO v_imei
      FROM imei_records
      WHERE id = v_imei_id AND shop_id = p_shop_id
      FOR UPDATE;

      IF NOT FOUND
         OR v_imei.status <> 'in_stock'
         OR v_imei.product_id <> v_product.id THEN
        RAISE EXCEPTION 'Selected IMEI for "%" is invalid, already sold, or unavailable', v_product.name;
      END IF;
    END IF;

    v_subtotal := v_subtotal + (v_qty * v_price);
  END LOOP;

  -- 4. Totals
  IF p_discount < 0 THEN
    RAISE EXCEPTION 'Discount cannot be negative';
  END IF;
  IF p_discount > v_subtotal THEN
    RAISE EXCEPTION 'Discount cannot exceed order subtotal';
  END IF;
  IF p_amount_paid < 0 THEN
    RAISE EXCEPTION 'Payment amount cannot be negative';
  END IF;

  v_total := v_subtotal - p_discount;
  v_actual_paid := LEAST(p_amount_paid, v_total);       -- excess cash = change, not revenue
  v_amount_due := GREATEST(0, v_total - v_actual_paid);

  IF v_amount_due > 0 AND p_customer_id IS NULL THEN
    RAISE EXCEPTION 'Customer must be selected for Udhaar (credit) sales';
  END IF;

  -- 5. Invoice
  v_invoice_number := next_invoice_number(p_shop_id);

  -- 6. Header
  INSERT INTO sales (
    shop_id, customer_id, invoice_number, subtotal, discount, total_amount,
    amount_paid, amount_due, payment_method, status, notes, created_by, idempotency_key
  ) VALUES (
    p_shop_id, p_customer_id, v_invoice_number, v_subtotal, p_discount, v_total,
    v_actual_paid, v_amount_due, p_payment_method, 'completed', NULLIF(p_notes, ''), v_user,
    NULLIF(p_idempotency_key, '')
  ) RETURNING id INTO v_sale_id;

  -- 7. Lines, stock and IMEIs (stock CHECK constraint guards over-selling)
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_qty := (v_item->>'quantity')::INT;
    v_price := (v_item->>'unit_price')::BIGINT;
    v_imei_id := NULLIF(v_item->>'imei_record_id', '')::UUID;

    UPDATE products
    SET stock_quantity = stock_quantity - v_qty,
        updated_at = NOW()
    WHERE id = (v_item->>'product_id')::UUID AND shop_id = p_shop_id;

    INSERT INTO sale_items (sale_id, product_id, imei_record_id, quantity, unit_price, total_price)
    VALUES (v_sale_id, (v_item->>'product_id')::UUID, v_imei_id, v_qty, v_price, v_qty * v_price)
    RETURNING id INTO v_inserted_item_id;

    IF v_imei_id IS NOT NULL THEN
      UPDATE imei_records
      SET status = 'sold', sale_item_id = v_inserted_item_id, updated_at = NOW()
      WHERE id = v_imei_id AND shop_id = p_shop_id AND status = 'in_stock';
      IF NOT FOUND THEN
        RAISE EXCEPTION 'IMEI was sold by another counter just now. Please refresh.';
      END IF;
    END IF;
  END LOOP;

  -- 8. Payment
  IF v_actual_paid > 0 THEN
    INSERT INTO payments (
      shop_id, sale_id, customer_id, amount, payment_method, payment_type,
      reference, notes, created_by
    ) VALUES (
      p_shop_id, v_sale_id, p_customer_id, v_actual_paid, p_payment_method, 'sale_payment',
      v_invoice_number, 'POS payment for invoice ' || v_invoice_number, v_user
    );
  END IF;

  -- 9. Udhaar
  IF v_amount_due > 0 THEN
    SELECT balance_after INTO v_previous_balance
    FROM udhaar_ledger
    WHERE shop_id = p_shop_id AND customer_id = p_customer_id
    ORDER BY created_at DESC, id DESC
    LIMIT 1;

    INSERT INTO udhaar_ledger (
      shop_id, customer_id, sale_id, type, amount, balance_after, description
    ) VALUES (
      p_shop_id, p_customer_id, v_sale_id, 'credit', v_amount_due,
      coalesce(v_previous_balance, 0) + v_amount_due,
      'Remaining balance for Invoice ' || v_invoice_number
    );
  END IF;

  -- 10. Audit
  INSERT INTO audit_logs (shop_id, user_id, action, entity_type, entity_id, metadata)
  VALUES (
    p_shop_id, v_user, 'sale_create', 'sale', v_sale_id,
    jsonb_build_object(
      'invoice_number', v_invoice_number,
      'total_amount', v_total,
      'amount_paid', v_actual_paid,
      'amount_due', v_amount_due,
      'items_count', v_items_count,
      'customer_id', p_customer_id,
      'idempotency_key', p_idempotency_key
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'sale_id', v_sale_id,
    'invoice_number', v_invoice_number
  );
END;
$$;

REVOKE ALL ON FUNCTION process_sale(UUID, UUID, UUID, JSONB, BIGINT, TEXT, BIGINT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION process_sale(UUID, UUID, UUID, JSONB, BIGINT, TEXT, BIGINT, TEXT, TEXT) TO authenticated, service_role;

-- ------------------------------------------------------------
-- 4. Admin-only helper functions
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION seed_default_expense_categories(p_shop_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_super_admin() THEN
    PERFORM assert_shop_access(p_shop_id);
  END IF;

  INSERT INTO expense_categories (shop_id, name)
  VALUES
    (p_shop_id, 'Rent'),
    (p_shop_id, 'Electricity'),
    (p_shop_id, 'Internet & Telephone'),
    (p_shop_id, 'Salaries'),
    (p_shop_id, 'Transport'),
    (p_shop_id, 'Maintenance & Repairs'),
    (p_shop_id, 'Tea & Refreshments'),
    (p_shop_id, 'Marketing'),
    (p_shop_id, 'Other')
  ON CONFLICT (shop_id, name) DO NOTHING;
END;
$$;
REVOKE ALL ON FUNCTION seed_default_expense_categories(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION seed_default_expense_categories(UUID) TO authenticated, service_role;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'generate_monthly_shop_invoices'
  ) THEN
    EXECUTE $fn$
      CREATE OR REPLACE FUNCTION generate_monthly_shop_invoices(
        p_month VARCHAR, p_month_name VARCHAR, p_due_date DATE
      )
      RETURNS INTEGER
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $body$
      DECLARE
        shop_record RECORD;
        inserted_count INTEGER := 0;
      BEGIN
        IF NOT is_super_admin() AND coalesce(auth.role(), '') <> 'service_role' THEN
          RAISE EXCEPTION 'Only super admin can generate invoices' USING ERRCODE = '42501';
        END IF;
        FOR shop_record IN SELECT id FROM shops WHERE status = 'active' LOOP
          INSERT INTO shop_subscriptions (shop_id, billing_month, month_name, amount, due_date, status)
          VALUES (shop_record.id, p_month, p_month_name, 800000, p_due_date, 'unpaid')
          ON CONFLICT (shop_id, billing_month) DO NOTHING;
          IF FOUND THEN inserted_count := inserted_count + 1; END IF;
        END LOOP;
        RETURN inserted_count;
      END;
      $body$;
    $fn$;
    EXECUTE 'REVOKE ALL ON FUNCTION generate_monthly_shop_invoices(VARCHAR, VARCHAR, DATE) FROM PUBLIC, anon';
    EXECUTE 'GRANT EXECUTE ON FUNCTION generate_monthly_shop_invoices(VARCHAR, VARCHAR, DATE) TO authenticated, service_role';
  END IF;
END $$;

-- ------------------------------------------------------------
-- 5. shop_users: nobody can promote themselves; owners may only manage
--    manager / cashier rows; super admins manage everything.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Super admins can manage all shop users" ON shop_users;
CREATE POLICY "Super admins can manage all shop users" ON shop_users
  FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

-- Reading your own membership row stays allowed (migration 013), read-only.
DROP POLICY IF EXISTS "Users can view their own shop_user membership" ON shop_users;
CREATE POLICY "Users can view their own shop_user membership" ON shop_users
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Shop owners can manage their shop users" ON shop_users;
DROP POLICY IF EXISTS "Shop owners can insert staff" ON shop_users;
DROP POLICY IF EXISTS "Shop owners can update staff" ON shop_users;
DROP POLICY IF EXISTS "Shop owners can delete staff" ON shop_users;

CREATE POLICY "Shop owners can insert staff" ON shop_users
  FOR INSERT WITH CHECK (
    shop_id = get_user_shop_id()
    AND get_user_role() = 'shop_owner'
    AND role IN ('manager', 'cashier')
  );

CREATE POLICY "Shop owners can update staff" ON shop_users
  FOR UPDATE
  USING (
    shop_id = get_user_shop_id()
    AND get_user_role() = 'shop_owner'
    AND role IN ('manager', 'cashier')
  )
  WITH CHECK (
    shop_id = get_user_shop_id()
    AND role IN ('manager', 'cashier')
  );

CREATE POLICY "Shop owners can delete staff" ON shop_users
  FOR DELETE USING (
    shop_id = get_user_shop_id()
    AND get_user_role() = 'shop_owner'
    AND role IN ('manager', 'cashier')
  );

-- ------------------------------------------------------------
-- 6. Role-aware restrictions on financial tables (RESTRICTIVE = AND-ed)
--    Cashiers can still sell / receive udhaar, but cannot delete or
--    rewrite history through the public API.
-- ------------------------------------------------------------
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'sales', 'payments', 'expenses', 'purchases', 'purchase_items',
    'products', 'customers', 'suppliers', 'product_categories', 'brands',
    'expense_categories', 'udhaar_ledger', 'imei_records', 'sale_items'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Only owner/manager can delete" ON %I', t);
    EXECUTE format(
      'CREATE POLICY "Only owner/manager can delete" ON %I AS RESTRICTIVE FOR DELETE
         USING (get_user_role() IN (''shop_owner'', ''manager'') OR is_super_admin())', t);
  END LOOP;

  FOREACH t IN ARRAY ARRAY['sales', 'payments', 'expenses', 'udhaar_ledger', 'purchases', 'purchase_items', 'sale_items']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Only owner/manager can update" ON %I', t);
    EXECUTE format(
      'CREATE POLICY "Only owner/manager can update" ON %I AS RESTRICTIVE FOR UPDATE
         USING (get_user_role() IN (''shop_owner'', ''manager'') OR is_super_admin())', t);
  END LOOP;
END $$;

-- ------------------------------------------------------------
-- 7. audit_logs: users may only write logs for their own shop
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON audit_logs;
CREATE POLICY "Authenticated users can insert audit logs" ON audit_logs
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND (shop_id IS NULL OR shop_id = get_user_shop_id())
  );

-- ------------------------------------------------------------
-- 7b. Destructive admin functions (migration 012): super admin only
-- ------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'delete_shop_permanently') THEN
    EXECUTE $fn$
      CREATE OR REPLACE FUNCTION assert_platform_admin()
      RETURNS VOID LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $b$
      BEGIN
        IF coalesce(auth.role(), '') = 'service_role' THEN RETURN; END IF;
        IF session_user <> 'authenticator' AND auth.uid() IS NULL THEN RETURN; END IF;
        IF NOT is_super_admin() THEN
          RAISE EXCEPTION 'Only the platform admin can do this' USING ERRCODE = '42501';
        END IF;
      END; $b$;
    $fn$;

    -- Re-wrap: keep the original body, add the permission check in front
    -- Only rename on the first run (keeps this migration re-runnable)
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = '_delete_shop_permanently_impl') THEN
      ALTER FUNCTION delete_shop_permanently(UUID) RENAME TO _delete_shop_permanently_impl;
    END IF;
    REVOKE ALL ON FUNCTION _delete_shop_permanently_impl(UUID) FROM PUBLIC, anon, authenticated;

    EXECUTE $fn$
      CREATE OR REPLACE FUNCTION delete_shop_permanently(p_shop_id UUID)
      RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $b$
      BEGIN
        PERFORM assert_platform_admin();
        PERFORM _delete_shop_permanently_impl(p_shop_id);
      END; $b$;
    $fn$;

    REVOKE ALL ON FUNCTION delete_shop_permanently(UUID) FROM PUBLIC, anon;
    GRANT EXECUTE ON FUNCTION delete_shop_permanently(UUID) TO authenticated, service_role;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'purge_expired_trashed_shops') THEN
    REVOKE ALL ON FUNCTION purge_expired_trashed_shops() FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION purge_expired_trashed_shops() TO service_role;
  END IF;
END $$;

-- ------------------------------------------------------------
-- 8. Fast "latest udhaar balance per customer" view
--    security_invoker => normal RLS of udhaar_ledger applies.
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW customer_udhaar_balances
WITH (security_invoker = true) AS
SELECT DISTINCT ON (customer_id)
  shop_id,
  customer_id,
  balance_after,
  created_at AS last_activity
FROM udhaar_ledger
ORDER BY customer_id, created_at DESC, id DESC;

GRANT SELECT ON customer_udhaar_balances TO authenticated;

COMMIT;
