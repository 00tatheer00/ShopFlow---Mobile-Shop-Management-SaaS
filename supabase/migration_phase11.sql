-- ============================================
-- ShopFlow — Phase 11: Scale & Index Optimization
-- ============================================

-- 1. Fast active product lookup for POS
CREATE INDEX IF NOT EXISTS idx_products_shop_active
  ON products(shop_id, is_active);

-- 2. Fast IMEI lookup by shop, product, and stock status for POS checkout
CREATE INDEX IF NOT EXISTS idx_imei_shop_prod_status
  ON imei_records(shop_id, product_id, status);

-- 3. Customer sales history lookup
CREATE INDEX IF NOT EXISTS idx_sales_shop_customer
  ON sales(shop_id, customer_id);

-- 4. Fast customer search by normalized phone within a shop
CREATE INDEX IF NOT EXISTS idx_customers_shop_phone
  ON customers(shop_id, phone);
