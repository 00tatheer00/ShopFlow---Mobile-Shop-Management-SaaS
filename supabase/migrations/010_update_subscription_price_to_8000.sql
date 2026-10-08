-- ShopFlow Migration: Update Monthly Subscription Price to Rs. 8,000 / month (800,000 paisas)

-- 1. Update Plans Table
UPDATE plans
SET price = 800000,
    description = 'Full access to POS, Inventory, IMEI, Udhaar, and Daily Reports — Rs. 8,000/month'
WHERE id = 'c0000000-0000-0000-0000-000000000001' OR name = 'Standard Plan';

-- 2. Alter default amount on shop_subscriptions table
ALTER TABLE shop_subscriptions 
ALTER COLUMN amount SET DEFAULT 800000;

-- 3. Update existing unpaid invoices for current billing cycles to new Rs. 8,000 rate
UPDATE shop_subscriptions
SET amount = 800000
WHERE status = 'unpaid' AND amount = 650000;

-- 4. Update the stored procedure to generate Rs. 8,000 invoices
CREATE OR REPLACE FUNCTION generate_monthly_shop_invoices(
  p_month VARCHAR,
  p_month_name VARCHAR,
  p_due_date DATE
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  shop_record RECORD;
  inserted_count INTEGER := 0;
BEGIN
  FOR shop_record IN 
    SELECT id FROM shops WHERE status = 'active'
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
