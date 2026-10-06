-- ============================================
-- ShopFlow — Phase 6: POS, Sales, Invoice & Payment Hardening
-- ============================================

-- 1. Add idempotency_key to sales table for double-submission protection
ALTER TABLE sales ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- 2. Unique index on (shop_id, idempotency_key) to prevent duplicate sales
CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_idempotency
  ON sales(shop_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- 3. Non-negative constraints on sales financial figures
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_sales_total_non_negative') THEN
    ALTER TABLE sales ADD CONSTRAINT chk_sales_total_non_negative CHECK (total_amount >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_sales_discount_non_negative') THEN
    ALTER TABLE sales ADD CONSTRAINT chk_sales_discount_non_negative CHECK (discount >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_sales_amount_paid_non_negative') THEN
    ALTER TABLE sales ADD CONSTRAINT chk_sales_amount_paid_non_negative CHECK (amount_paid >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_sales_amount_due_non_negative') THEN
    ALTER TABLE sales ADD CONSTRAINT chk_sales_amount_due_non_negative CHECK (amount_due >= 0);
  END IF;
END $$;

-- 4. Constraints on sale_items
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_sale_items_qty_positive') THEN
    ALTER TABLE sale_items ADD CONSTRAINT chk_sale_items_qty_positive CHECK (quantity > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_sale_items_price_non_negative') THEN
    ALTER TABLE sale_items ADD CONSTRAINT chk_sale_items_price_non_negative CHECK (unit_price >= 0);
  END IF;
END $$;

-- 5. Performance index on sales for fast POS history and invoice lookups
CREATE INDEX IF NOT EXISTS idx_sales_shop_date_status
  ON sales(shop_id, created_at DESC, status);
