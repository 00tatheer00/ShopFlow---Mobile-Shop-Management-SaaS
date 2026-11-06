-- ==============================================================================
-- MIGRATION: 015_remove_legacy_october_subscriptions.sql
-- ==============================================================================
-- Purges any legacy demo October 2026 subscriptions ('2026-10') and ensures
-- monthly invoice generation strictly respects soft-delete (deleted_at IS NULL).
-- ==============================================================================

BEGIN;

-- 1. Remove all legacy demo October 2026 subscriptions
DELETE FROM shop_subscriptions
WHERE billing_month = '2026-10';

-- 2. Update monthly billing generation helper to exclude soft-deleted shops
CREATE OR REPLACE FUNCTION generate_monthly_shop_subscriptions(
  p_month VARCHAR(7),
  p_month_name VARCHAR(50),
  p_due_date DATE
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  inserted_count INTEGER := 0;
  shop_record RECORD;
BEGIN
  FOR shop_record IN 
    SELECT id FROM shops WHERE status = 'active' AND deleted_at IS NULL
  LOOP
    INSERT INTO shop_subscriptions (shop_id, billing_month, month_name, amount, due_date, status)
    VALUES (shop_record.id, p_month, p_month_name, 800000, p_due_date, 'unpaid')
    ON CONFLICT (shop_id, billing_month) DO NOTHING;
    
    IF FOUND THEN
      inserted_count := inserted_count + 1;
    END IF;
  END LOOP;
  
  RETURN inserted_count;
END;
$$;

COMMIT;
