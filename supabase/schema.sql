-- ============================================
-- ShopFlow — Complete Database Schema
-- Supabase PostgreSQL
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- PLATFORM TABLES
-- ============================================

-- Subscription plans
CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  max_users INTEGER NOT NULL DEFAULT 5,
  max_products INTEGER NOT NULL DEFAULT 500,
  price INTEGER NOT NULL DEFAULT 0, -- paisas
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Shops (tenants)
CREATE TABLE shops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  city TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  logo_url TEXT,
  display_shop_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deactivated')),
  plan_id UUID REFERENCES plans(id) ON DELETE SET NULL,
  subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('trialing', 'active', 'past_due', 'cancelled')),
  subscription_started_at TIMESTAMPTZ DEFAULT NOW(),
  subscription_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_shops_status ON shops(status);
CREATE INDEX idx_shops_slug ON shops(slug);
CREATE INDEX idx_shops_display_id ON shops(display_shop_id);

-- ============================================
-- USER TABLES
-- ============================================

-- Extended user profiles (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Maps users to shops with roles
CREATE TABLE shop_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'shop_owner', 'manager', 'cashier')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(shop_id, user_id)
);

CREATE INDEX idx_shop_users_shop_id ON shop_users(shop_id);
CREATE INDEX idx_shop_users_user_id ON shop_users(user_id);
CREATE INDEX idx_shop_users_role ON shop_users(role);

-- ============================================
-- PRODUCT TABLES
-- ============================================

-- Product categories (per shop)
CREATE TABLE product_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(shop_id, name)
);

CREATE INDEX idx_product_categories_shop ON product_categories(shop_id);

-- Brands (per shop)
CREATE TABLE brands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(shop_id, name)
);

CREATE INDEX idx_brands_shop ON brands(shop_id);

-- Products
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category_id UUID REFERENCES product_categories(id) ON DELETE SET NULL,
  brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
  model TEXT,
  is_imei_tracked BOOLEAN NOT NULL DEFAULT FALSE,
  sale_price INTEGER NOT NULL DEFAULT 0, -- paisas
  purchase_price INTEGER NOT NULL DEFAULT 0, -- paisas
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER NOT NULL DEFAULT 5,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_products_shop ON products(shop_id);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_brand ON products(brand_id);
CREATE INDEX idx_products_name ON products(shop_id, name);
CREATE INDEX idx_products_active ON products(shop_id, is_active);

-- IMEI Records
CREATE TABLE imei_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  imei_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_stock' CHECK (status IN ('in_stock', 'sold', 'returned', 'damaged')),
  purchase_item_id UUID,
  sale_item_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(shop_id, imei_number)
);

CREATE INDEX idx_imei_shop ON imei_records(shop_id);
CREATE INDEX idx_imei_product ON imei_records(product_id);
CREATE INDEX idx_imei_status ON imei_records(shop_id, status);
CREATE INDEX idx_imei_number ON imei_records(shop_id, imei_number);

-- ============================================
-- PEOPLE TABLES
-- ============================================

-- Customers
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(shop_id, phone)
);

CREATE INDEX idx_customers_shop ON customers(shop_id);
CREATE INDEX idx_customers_phone ON customers(shop_id, phone);
CREATE INDEX idx_customers_name ON customers(shop_id, name);

-- Suppliers
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  email TEXT,
  address TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_suppliers_shop ON suppliers(shop_id);

-- ============================================
-- TRANSACTION TABLES
-- ============================================

-- Purchases
CREATE TABLE purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  total_amount INTEGER NOT NULL DEFAULT 0, -- paisas
  notes TEXT,
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_purchases_shop ON purchases(shop_id);
CREATE INDEX idx_purchases_supplier ON purchases(supplier_id);
CREATE INDEX idx_purchases_date ON purchases(shop_id, purchase_date);

-- Purchase Items
CREATE TABLE purchase_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_id UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price INTEGER NOT NULL DEFAULT 0, -- paisas
  total_price INTEGER NOT NULL DEFAULT 0 -- paisas
);

CREATE INDEX idx_purchase_items_purchase ON purchase_items(purchase_id);

-- Sales
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL,
  subtotal INTEGER NOT NULL DEFAULT 0, -- paisas
  discount INTEGER NOT NULL DEFAULT 0, -- paisas
  total_amount INTEGER NOT NULL DEFAULT 0, -- paisas
  amount_paid INTEGER NOT NULL DEFAULT 0, -- paisas
  amount_due INTEGER NOT NULL DEFAULT 0, -- paisas
  payment_method TEXT NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'bank_transfer', 'easypaisa', 'jazzcash', 'other')),
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'cancelled')),
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(shop_id, invoice_number)
);

CREATE INDEX idx_sales_shop ON sales(shop_id);
CREATE INDEX idx_sales_customer ON sales(customer_id);
CREATE INDEX idx_sales_date ON sales(shop_id, created_at);
CREATE INDEX idx_sales_status ON sales(shop_id, status);
CREATE INDEX idx_sales_invoice ON sales(shop_id, invoice_number);

-- Sale Items
CREATE TABLE sale_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  imei_record_id UUID REFERENCES imei_records(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price INTEGER NOT NULL DEFAULT 0, -- paisas
  total_price INTEGER NOT NULL DEFAULT 0 -- paisas
);

CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);

-- ============================================
-- FINANCIAL TABLES
-- ============================================

-- Payments (unified)
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  amount INTEGER NOT NULL DEFAULT 0, -- paisas
  payment_method TEXT NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'bank_transfer', 'easypaisa', 'jazzcash', 'other')),
  payment_type TEXT NOT NULL CHECK (payment_type IN ('sale_payment', 'udhaar_payment')),
  reference TEXT,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_shop ON payments(shop_id);
CREATE INDEX idx_payments_customer ON payments(customer_id);
CREATE INDEX idx_payments_date ON payments(shop_id, created_at);

-- Udhaar Ledger
CREATE TABLE udhaar_ledger (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
  amount INTEGER NOT NULL DEFAULT 0, -- paisas
  balance_after INTEGER NOT NULL DEFAULT 0, -- paisas
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_udhaar_shop ON udhaar_ledger(shop_id);
CREATE INDEX idx_udhaar_customer ON udhaar_ledger(customer_id);

-- Expense Categories (per shop)
CREATE TABLE expense_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(shop_id, name)
);

CREATE INDEX idx_expense_categories_shop ON expense_categories(shop_id);

-- Expenses
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  category_id UUID REFERENCES expense_categories(id) ON DELETE SET NULL,
  amount INTEGER NOT NULL DEFAULT 0, -- paisas
  description TEXT,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_expenses_shop ON expenses(shop_id);
CREATE INDEX idx_expenses_date ON expenses(shop_id, expense_date);

-- ============================================
-- SYSTEM TABLES
-- ============================================

-- Audit Logs (append-only)
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID REFERENCES shops(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  metadata JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_shop ON audit_logs(shop_id);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_action ON audit_logs(shop_id, action);
CREATE INDEX idx_audit_date ON audit_logs(shop_id, created_at);

-- Shop Settings (per shop)
CREATE TABLE shop_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL UNIQUE REFERENCES shops(id) ON DELETE CASCADE,
  receipt_header TEXT,
  receipt_footer TEXT,
  low_stock_threshold INTEGER NOT NULL DEFAULT 5,
  default_payment_method TEXT NOT NULL DEFAULT 'cash' CHECK (default_payment_method IN ('cash', 'bank_transfer', 'easypaisa', 'jazzcash', 'other')),
  invoice_prefix TEXT NOT NULL DEFAULT 'INV',
  next_invoice_number INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Get the shop_id for the currently authenticated user
CREATE OR REPLACE FUNCTION get_user_shop_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  shop UUID;
BEGIN
  SELECT shop_id INTO shop
  FROM shop_users
  WHERE user_id = auth.uid()
    AND is_active = TRUE
  LIMIT 1;
  
  RETURN shop;
END;
$$;

-- Get the role for the currently authenticated user
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM shop_users
  WHERE user_id = auth.uid()
    AND is_active = TRUE
  LIMIT 1;
  
  RETURN user_role;
END;
$$;

-- Check if current user is a super admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM shop_users
    WHERE user_id = auth.uid()
      AND role = 'super_admin'
      AND is_active = TRUE
  );
END;
$$;

-- Generate next invoice number for a shop
CREATE OR REPLACE FUNCTION generate_invoice_number(p_shop_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  prefix TEXT;
  next_num INTEGER;
  invoice TEXT;
BEGIN
  -- Lock the row to prevent concurrent issues
  SELECT invoice_prefix, next_invoice_number
  INTO prefix, next_num
  FROM shop_settings
  WHERE shop_id = p_shop_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    prefix := 'INV';
    next_num := 1;
  END IF;
  
  invoice := prefix || '-' || LPAD(next_num::TEXT, 4, '0');
  
  UPDATE shop_settings
  SET next_invoice_number = next_num + 1,
      updated_at = NOW()
  WHERE shop_id = p_shop_id;
  
  RETURN invoice;
END;
$$;

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, phone)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'phone'
  );
  RETURN NEW;
END;
$$;

-- Trigger: auto-create profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Apply updated_at triggers
CREATE TRIGGER update_shops_timestamp BEFORE UPDATE ON shops FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_profiles_timestamp BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_shop_users_timestamp BEFORE UPDATE ON shop_users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_products_timestamp BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_imei_records_timestamp BEFORE UPDATE ON imei_records FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_customers_timestamp BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_suppliers_timestamp BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_shop_settings_timestamp BEFORE UPDATE ON shop_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on all tables
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE imei_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE udhaar_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

-- ---- Plans: readable by all authenticated, manageable by super admin ----
CREATE POLICY "Plans are readable by authenticated users" ON plans
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Super admins can manage plans" ON plans
  FOR ALL USING (is_super_admin());

-- ---- Shops: super admin can manage, users can view their own ----
CREATE POLICY "Super admins can manage all shops" ON shops
  FOR ALL USING (is_super_admin());

CREATE POLICY "Users can view their own shop" ON shops
  FOR SELECT USING (id = get_user_shop_id());

-- ---- Profiles ----
CREATE POLICY "Users can view their own profile and shop members" ON profiles
  FOR SELECT USING (
    id = auth.uid()
    OR id IN (
      SELECT user_id FROM shop_users WHERE shop_id = get_user_shop_id()
    )
  );

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Super admins can view all profiles" ON profiles
  FOR SELECT USING (is_super_admin());

-- ---- Shop Users ----
CREATE POLICY "Super admins can manage all shop users" ON shop_users
  FOR ALL USING (is_super_admin());

CREATE POLICY "Shop owners can manage their shop users" ON shop_users
  FOR ALL USING (
    shop_id = get_user_shop_id()
    AND get_user_role() = 'shop_owner'
  );

CREATE POLICY "Users can view their own shop's users" ON shop_users
  FOR SELECT USING (shop_id = get_user_shop_id());

-- ---- Tenant tables: users can access their own shop's data ----

-- Product Categories
CREATE POLICY "Users can manage their shop's categories" ON product_categories
  FOR ALL USING (shop_id = get_user_shop_id());

-- Brands
CREATE POLICY "Users can manage their shop's brands" ON brands
  FOR ALL USING (shop_id = get_user_shop_id());

-- Products
CREATE POLICY "Users can manage their shop's products" ON products
  FOR ALL USING (shop_id = get_user_shop_id());

-- IMEI Records
CREATE POLICY "Users can manage their shop's IMEI records" ON imei_records
  FOR ALL USING (shop_id = get_user_shop_id());

-- Customers
CREATE POLICY "Users can manage their shop's customers" ON customers
  FOR ALL USING (shop_id = get_user_shop_id());

-- Suppliers
CREATE POLICY "Users can manage their shop's suppliers" ON suppliers
  FOR ALL USING (shop_id = get_user_shop_id());

-- Purchases
CREATE POLICY "Users can manage their shop's purchases" ON purchases
  FOR ALL USING (shop_id = get_user_shop_id());

-- Purchase Items (via purchase's shop)
CREATE POLICY "Users can manage their shop's purchase items" ON purchase_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM purchases
      WHERE purchases.id = purchase_items.purchase_id
        AND purchases.shop_id = get_user_shop_id()
    )
  );

-- Sales
CREATE POLICY "Users can manage their shop's sales" ON sales
  FOR ALL USING (shop_id = get_user_shop_id());

-- Sale Items (via sale's shop)
CREATE POLICY "Users can manage their shop's sale items" ON sale_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM sales
      WHERE sales.id = sale_items.sale_id
        AND sales.shop_id = get_user_shop_id()
    )
  );

-- Payments
CREATE POLICY "Users can manage their shop's payments" ON payments
  FOR ALL USING (shop_id = get_user_shop_id());

-- Udhaar Ledger
CREATE POLICY "Users can manage their shop's udhaar" ON udhaar_ledger
  FOR ALL USING (shop_id = get_user_shop_id());

-- Expense Categories
CREATE POLICY "Users can manage their shop's expense categories" ON expense_categories
  FOR ALL USING (shop_id = get_user_shop_id());

-- Expenses
CREATE POLICY "Users can manage their shop's expenses" ON expenses
  FOR ALL USING (shop_id = get_user_shop_id());

-- Audit Logs (read-only for shop users, append via server)
CREATE POLICY "Users can view their shop's audit logs" ON audit_logs
  FOR SELECT USING (shop_id = get_user_shop_id());

CREATE POLICY "Super admins can view all audit logs" ON audit_logs
  FOR SELECT USING (is_super_admin());

CREATE POLICY "Super admins can insert audit logs" ON audit_logs
  FOR INSERT WITH CHECK (is_super_admin());

CREATE POLICY "Authenticated users can insert audit logs" ON audit_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Shop Settings
CREATE POLICY "Users can view their shop's settings" ON shop_settings
  FOR SELECT USING (shop_id = get_user_shop_id());

CREATE POLICY "Shop owners can insert settings" ON shop_settings
  FOR INSERT WITH CHECK (
    shop_id = get_user_shop_id()
    AND get_user_role() = 'shop_owner'
  );

CREATE POLICY "Shop owners can update settings" ON shop_settings
  FOR UPDATE USING (
    shop_id = get_user_shop_id()
    AND get_user_role() = 'shop_owner'
  );

-- ============================================
-- SEED DATA
-- ============================================

-- Default plan
INSERT INTO plans (name, description, max_users, max_products, price, status) VALUES
  ('Free', 'Free plan for getting started', 3, 100, 0, 'active'),
  ('Basic', 'Basic plan for small shops', 5, 500, 100000, 'active'),
  ('Pro', 'Professional plan for growing shops', 10, 2000, 250000, 'active');
