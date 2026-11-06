-- ==============================================================================
-- DESTRUCTIVE MIGRATION: 011_clean_slate_remove_demo_shops.sql
-- ==============================================================================
-- WARNING: This migration permanently wipes all existing demo/test tenant shops,
-- their inventory, sales, purchases, customers, udhaar ledgers, expenses,
-- subscriptions, and non-super-admin user accounts.
-- 
-- Super Admin user accounts and system-wide platform settings are strictly preserved.
-- ==============================================================================

BEGIN;

-- 1. Detach super_admin accounts from specific shops to preserve them at platform level
UPDATE shop_users
SET shop_id = NULL
WHERE role = 'super_admin';

-- 2. Delete child records in strict dependency order to satisfy RESTRICT FK constraints

-- Delete POS sale items and sales
DELETE FROM sale_items;
DELETE FROM sales;

-- Delete purchase items and purchases
DELETE FROM purchase_items;
DELETE FROM purchases;

-- Delete Udhaar ledger entries and payments
DELETE FROM udhaar_ledger;
DELETE FROM payments;

-- Delete stock adjustments and IMEI records
DELETE FROM stock_adjustments;
DELETE FROM imei_records;

-- Delete products, brands, and categories
DELETE FROM products;
DELETE FROM brands;
DELETE FROM product_categories;

-- Delete expenses and expense categories
DELETE FROM expenses;
DELETE FROM expense_categories;

-- Delete customers and suppliers
DELETE FROM customers;
DELETE FROM suppliers;

-- Delete shop settings, subscriptions, email logs, and shop-scoped audit logs
DELETE FROM shop_settings;
DELETE FROM shop_subscriptions;
DELETE FROM email_logs;
DELETE FROM audit_logs WHERE shop_id IS NOT NULL;

-- 3. Delete non-super-admin shop_users associations
DELETE FROM shop_users WHERE role != 'super_admin';

-- 4. Delete all shops
DELETE FROM shops;

-- 5. Delete non-super-admin auth.users (cascades to profiles)
-- Preserves any user identified as super_admin
DELETE FROM auth.users
WHERE id NOT IN (
  SELECT user_id FROM shop_users WHERE role = 'super_admin' AND user_id IS NOT NULL
);

COMMIT;

