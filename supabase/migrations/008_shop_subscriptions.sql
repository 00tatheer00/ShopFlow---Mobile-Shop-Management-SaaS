-- ============================================
-- ShopFlow: Monthly Shop Subscriptions (Rs. 6,500 / month)
-- ============================================

-- 1. Create or update Standard Plan for Rs. 6,500 / month (650,000 paisas)
INSERT INTO plans (id, name, description, max_users, max_products, price, status)
VALUES (
  '55555555-5555-5555-5555-555555555555',
  'ShopFlow Monthly Plan',
  'Full access to POS, Inventory, IMEI, Udhaar, and Daily Reports — Rs. 6,500/month',
  10,
  10000,
  800000, -- 8,000 PKR in paisas
  'active'
)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = 800000,
  status = 'active';

-- Update all existing shops to link to this standard 6,500 plan if null
UPDATE shops 
SET plan_id = '55555555-5555-5555-5555-555555555555' 
WHERE plan_id IS NULL OR plan_id = '11111111-1111-1111-1111-111111111111';

-- 2. Create shop_subscriptions table to track monthly billing per shop
CREATE TABLE IF NOT EXISTS shop_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  billing_month VARCHAR(7) NOT NULL, -- Format: 'YYYY-MM', e.g. '2026-10'
  month_name VARCHAR(50) NOT NULL,   -- e.g. 'October 2026'
  amount INTEGER NOT NULL DEFAULT 800000, -- 8,000 PKR in paisas
  status VARCHAR(20) NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'paid', 'overdue')),
  due_date DATE NOT NULL,
  paid_at TIMESTAMPTZ,
  payment_method VARCHAR(50), -- 'bank_transfer', 'easypaisa', 'jazzcash', 'cash', 'other'
  reference_id VARCHAR(100), -- transaction / bank reference ID
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_shop_billing_month UNIQUE (shop_id, billing_month)
);

CREATE INDEX IF NOT EXISTS idx_subs_shop ON shop_subscriptions(shop_id);
CREATE INDEX IF NOT EXISTS idx_subs_month ON shop_subscriptions(billing_month);
CREATE INDEX IF NOT EXISTS idx_subs_status ON shop_subscriptions(status);

-- Enable RLS
ALTER TABLE shop_subscriptions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Super admin access on shop_subscriptions'
  ) THEN
    CREATE POLICY "Super admin access on shop_subscriptions" ON shop_subscriptions
      FOR ALL USING (is_super_admin());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Shop owners view own shop_subscriptions'
  ) THEN
    CREATE POLICY "Shop owners view own shop_subscriptions" ON shop_subscriptions
      FOR SELECT USING (shop_id = get_user_shop_id());
  END IF;
END $$;

-- 3. Create email_logs table for audit & tracking sent emails
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES shops(id) ON DELETE SET NULL,
  subscription_id UUID REFERENCES shop_subscriptions(id) ON DELETE SET NULL,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  subject TEXT NOT NULL,
  template_type VARCHAR(50) NOT NULL, -- 'payment_approved', 'payment_reminder', 'monthly_invoice'
  content_html TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'queued')),
  metadata JSONB DEFAULT '{}'::jsonb,
  sent_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_logs_shop ON email_logs(shop_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_date ON email_logs(created_at DESC);

ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Super admin access on email_logs'
  ) THEN
    CREATE POLICY "Super admin access on email_logs" ON email_logs
      FOR ALL USING (is_super_admin());
  END IF;
END $$;

-- 4. Helper Function: Generate Monthly Subscription Invoices for all active shops
CREATE OR REPLACE FUNCTION generate_monthly_shop_subscriptions(p_month VARCHAR(7), p_month_name VARCHAR(50), p_due_date DATE)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  inserted_count INTEGER := 0;
  shop_record RECORD;
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
