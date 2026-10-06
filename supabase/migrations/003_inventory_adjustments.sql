-- ============================================
-- ShopFlow: Products, Inventory & Stock Adjustments
-- ============================================

-- 1. Non-negative stock constraint on products
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_products_stock_non_negative'
  ) THEN
    ALTER TABLE products ADD CONSTRAINT chk_products_stock_non_negative CHECK (stock_quantity >= 0);
  END IF;
END $$;

-- 2. Stock Adjustments Table for Auditability & Traceability
CREATE TABLE IF NOT EXISTS stock_adjustments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  adjustment INTEGER NOT NULL, -- positive for stock in, negative for stock out/damage
  old_stock INTEGER NOT NULL,
  new_stock INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_adj_shop ON stock_adjustments(shop_id);
CREATE INDEX IF NOT EXISTS idx_stock_adj_prod ON stock_adjustments(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_adj_date ON stock_adjustments(shop_id, created_at);

ALTER TABLE stock_adjustments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'stock_adjustments' AND policyname = 'Users can view their shop stock adjustments'
  ) THEN
    CREATE POLICY "Users can view their shop stock adjustments" ON stock_adjustments
      FOR SELECT USING (shop_id = get_user_shop_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'stock_adjustments' AND policyname = 'Managers and owners can insert stock adjustments'
  ) THEN
    CREATE POLICY "Managers and owners can insert stock adjustments" ON stock_adjustments
      FOR INSERT WITH CHECK (
        shop_id = get_user_shop_id()
        AND (get_user_role() IN ('shop_owner', 'manager'))
      );
  END IF;
END $$;

-- 3. Atomic stock decrement function
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
  IF p_quantity <= 0 THEN
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

-- 4. Atomic stock increment function
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
  IF p_quantity <= 0 THEN
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
