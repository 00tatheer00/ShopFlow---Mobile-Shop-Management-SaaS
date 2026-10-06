-- ============================================
-- ShopFlow — Phase 5: Customers, Suppliers, Purchases & Udhaar Hardening
-- ============================================

-- 1. Phone Normalization Function
-- Normalizes Pakistani phone numbers to a canonical format: 03XXXXXXXXX
-- Handles: 03001234567, +923001234567, 923001234567, 3001234567
CREATE OR REPLACE FUNCTION normalize_pk_phone(raw_phone TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  digits TEXT;
BEGIN
  IF raw_phone IS NULL OR raw_phone = '' THEN
    RETURN raw_phone;
  END IF;

  -- Strip everything except digits
  digits := regexp_replace(raw_phone, '[^0-9]', '', 'g');

  -- Handle +92 or 92 prefix (international format)
  IF length(digits) = 12 AND digits LIKE '92%' THEN
    digits := '0' || substring(digits FROM 3);
  END IF;

  -- Handle 10-digit without leading 0 (e.g. 3001234567)
  IF length(digits) = 10 AND digits LIKE '3%' THEN
    digits := '0' || digits;
  END IF;

  RETURN digits;
END;
$$;

-- 2. Index on suppliers for duplicate detection (shop_id, name, phone)
-- This is advisory; we don't enforce unique because suppliers can share names.
-- But we add a partial unique index on (shop_id, phone) WHERE phone IS NOT NULL AND phone != ''
-- to prevent duplicate suppliers with the same phone number within a shop.
CREATE UNIQUE INDEX IF NOT EXISTS idx_suppliers_unique_phone
  ON suppliers(shop_id, phone)
  WHERE phone IS NOT NULL AND phone != '';

-- 3. Non-negative balance_after constraint on udhaar_ledger
-- Prevents accidental negative balances in the ledger
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_udhaar_balance_non_negative'
  ) THEN
    ALTER TABLE udhaar_ledger ADD CONSTRAINT chk_udhaar_balance_non_negative CHECK (balance_after >= 0);
  END IF;
END $$;

-- 4. Non-negative amount constraint on payments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_payments_amount_positive'
  ) THEN
    ALTER TABLE payments ADD CONSTRAINT chk_payments_amount_positive CHECK (amount > 0);
  END IF;
END $$;

-- 5. Non-negative amounts on udhaar_ledger
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_udhaar_amount_positive'
  ) THEN
    ALTER TABLE udhaar_ledger ADD CONSTRAINT chk_udhaar_amount_positive CHECK (amount > 0);
  END IF;
END $$;

-- 6. Purchase total non-negative
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_purchase_total_non_negative'
  ) THEN
    ALTER TABLE purchases ADD CONSTRAINT chk_purchase_total_non_negative CHECK (total_amount >= 0);
  END IF;
END $$;

-- 7. Purchase item constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_purchase_item_qty_positive'
  ) THEN
    ALTER TABLE purchase_items ADD CONSTRAINT chk_purchase_item_qty_positive CHECK (quantity > 0);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_purchase_item_price_non_negative'
  ) THEN
    ALTER TABLE purchase_items ADD CONSTRAINT chk_purchase_item_price_non_negative CHECK (unit_price >= 0);
  END IF;
END $$;

-- 8. Index on udhaar_ledger for fast balance lookups
CREATE INDEX IF NOT EXISTS idx_udhaar_customer_date
  ON udhaar_ledger(shop_id, customer_id, created_at DESC);

-- 9. Index on payments for customer lookups
CREATE INDEX IF NOT EXISTS idx_payments_sale
  ON payments(sale_id);
