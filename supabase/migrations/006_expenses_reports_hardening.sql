-- ============================================
-- ShopFlow: Expenses, Dashboard & Essential Reports Hardening
-- ============================================

-- 1. Add payment_method and notes to expenses table
ALTER TABLE expenses 
  ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'cash' 
  CHECK (payment_method IN ('cash', 'bank_transfer', 'easypaisa', 'jazzcash', 'other'));

ALTER TABLE expenses 
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- 2. Non-negative / positive constraint on expense amount (in paisas)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_expenses_amount_positive') THEN
    ALTER TABLE expenses ADD CONSTRAINT chk_expenses_amount_positive CHECK (amount > 0);
  END IF;
END $$;

-- 3. Composite performance indexes for reporting queries
CREATE INDEX IF NOT EXISTS idx_expenses_shop_date 
  ON expenses(shop_id, expense_date DESC);

CREATE INDEX IF NOT EXISTS idx_expenses_shop_cat 
  ON expenses(shop_id, category_id);

CREATE INDEX IF NOT EXISTS idx_purchases_shop_date
  ON purchases(shop_id, purchase_date DESC);

CREATE INDEX IF NOT EXISTS idx_sales_completed_reporting
  ON sales(shop_id, status, created_at DESC);

-- 4. Default categories seeding function for shops
CREATE OR REPLACE FUNCTION seed_default_expense_categories(p_shop_id UUID)
RETURNS VOID AS $$
BEGIN
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Seed default expense categories for all current shops
DO $$
DECLARE
  s RECORD;
BEGIN
  FOR s IN SELECT id FROM shops LOOP
    PERFORM seed_default_expense_categories(s.id);
  END LOOP;
END $$;
