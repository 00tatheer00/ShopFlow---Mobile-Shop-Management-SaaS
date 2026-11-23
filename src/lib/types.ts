// ============================================
// ShopFlow — Core Type Definitions
// ============================================

// ---- Enums ----

export type ShopStatus = 'active' | 'suspended' | 'deactivated';

export type UserRole = 'super_admin' | 'shop_owner' | 'manager' | 'cashier';

export type ImeiStatus = 'in_stock' | 'sold' | 'returned' | 'damaged';

export type SaleStatus = 'completed' | 'cancelled';

export type PaymentMethod = 'cash' | 'bank_transfer' | 'easypaisa' | 'jazzcash' | 'other';

export type PaymentType = 'sale_payment' | 'udhaar_payment';

export type UdhaarType = 'credit' | 'debit';

// ---- Platform Entities ----

export interface Shop {
  id: string;
  name: string;
  slug: string;
  display_shop_id?: string | null;
  city: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
  status: ShopStatus;
  plan_id: string | null;
  plan?: Plan | null;
  subscription_status?: 'trialing' | 'active' | 'past_due' | 'cancelled' | null;
  subscription_started_at?: string | null;
  subscription_expires_at?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  deleted_by?: string | null;
}

export interface Plan {
  id: string;
  name: string;
  description: string | null;
  max_users: number;
  max_products: number;
  price: number; // in paisas
  status: 'active' | 'inactive';
  created_at: string;
}


export type SubscriptionStatus = 'unpaid' | 'paid' | 'overdue';

export interface ShopSubscription {
  id: string;
  shop_id: string;
  billing_month: string; // '2026-10'
  month_name: string;   // 'October 2026'
  amount: number;       // in paisas (800000 = Rs. 8,000)
  status: SubscriptionStatus;
  due_date: string;
  paid_at?: string | null;
  payment_method?: string | null;
  reference_id?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  shop?: Shop;
  approved_by_user?: Profile;
}

export interface EmailLog {
  id: string;
  shop_id?: string | null;
  subscription_id?: string | null;
  recipient_email: string;
  recipient_name?: string | null;
  subject: string;
  template_type: string;
  content_html: string;
  status: 'sent' | 'failed' | 'queued';
  metadata?: Record<string, unknown> | null;
  sent_by?: string | null;
  created_at: string;
  shop?: Shop;
}

// ---- User Entities ----

export interface Profile {
  id: string; // matches auth.uid
  email: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShopUser {
  id: string;
  shop_id: string;
  user_id: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields
  profile?: Profile;
  shop?: Shop;
}

// ---- Product Entities ----

export interface ProductCategory {
  id: string;
  shop_id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface Brand {
  id: string;
  shop_id: string;
  name: string;
  created_at: string;
}

export interface Product {
  id: string;
  shop_id: string;
  name: string;
  category_id: string | null;
  brand_id: string | null;
  model: string | null;
  is_imei_tracked: boolean;
  sale_price: number; // paisas
  purchase_price: number; // paisas
  stock_quantity: number;
  low_stock_threshold: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields
  category?: ProductCategory;
  brand?: Brand;
}

export interface ImeiRecord {
  id: string;
  shop_id: string;
  product_id: string;
  imei_number: string;
  status: ImeiStatus;
  purchase_item_id: string | null;
  sale_item_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  product?: Product;
}

export interface StockAdjustment {
  id: string;
  shop_id: string;
  product_id: string;
  adjustment: number;
  old_stock: number;
  new_stock: number;
  reason: string;
  created_by: string;
  created_at: string;
  product?: Product;
  created_by_user?: Profile;
}

// ---- Transaction Entities ----

export interface Purchase {
  id: string;
  shop_id: string;
  supplier_id: string;
  total_amount: number; // paisas
  notes: string | null;
  purchase_date: string;
  created_by: string;
  created_at: string;
  // Joined fields
  supplier?: Supplier;
  items?: PurchaseItem[];
  created_by_user?: Profile;
}

export interface PurchaseItem {
  id: string;
  purchase_id: string;
  product_id: string;
  quantity: number;
  unit_price: number; // paisas
  total_price: number; // paisas
  // Joined fields
  product?: Product;
  imei_records?: ImeiRecord[];
}

export interface Sale {
  id: string;
  shop_id: string;
  customer_id: string | null;
  invoice_number: string;
  subtotal: number; // paisas
  discount: number; // paisas
  total_amount: number; // paisas
  amount_paid: number; // paisas
  amount_due: number; // paisas
  payment_method: PaymentMethod;
  status: SaleStatus;
  notes: string | null;
  created_by: string;
  created_at: string;
  // Joined fields
  customer?: Customer;
  items?: SaleItem[];
  payments?: Payment[];
  created_by_user?: Profile;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  imei_record_id: string | null;
  quantity: number;
  unit_price: number; // paisas
  total_price: number; // paisas
  // Joined fields
  product?: Product;
  imei_record?: ImeiRecord;
}

// ---- People Entities ----

export interface Customer {
  id: string;
  shop_id: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Computed
  udhaar_balance?: number;
}

export interface Supplier {
  id: string;
  shop_id: string;
  name: string;
  phone: string | null;
  company: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ---- Financial Entities ----

export interface Payment {
  id: string;
  shop_id: string;
  sale_id: string | null;
  customer_id: string | null;
  amount: number; // paisas
  payment_method: PaymentMethod;
  payment_type: PaymentType;
  reference: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
}

export interface UdhaarLedgerEntry {
  id: string;
  shop_id: string;
  customer_id: string;
  sale_id: string | null;
  payment_id: string | null;
  type: UdhaarType;
  amount: number; // paisas
  balance_after: number; // paisas
  description: string | null;
  created_at: string;
  // Joined
  customer?: Customer;
}

export interface Expense {
  id: string;
  shop_id: string;
  category_id: string | null;
  amount: number; // paisas
  description: string | null;
  expense_date: string;
  payment_method?: PaymentMethod;
  notes?: string | null;
  created_by: string;
  created_at: string;
  // Joined
  category?: ExpenseCategory;
}

export interface ExpenseCategory {
  id: string;
  shop_id: string;
  name: string;
  created_at: string;
}

// ---- System Entities ----

export interface AuditLog {
  id: string;
  shop_id: string | null;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
  // Joined
  user?: Profile;
}

export interface ShopSettings {
  id: string;
  shop_id: string;
  receipt_header: string | null;
  receipt_footer: string | null;
  low_stock_threshold: number;
  default_payment_method: PaymentMethod;
  invoice_prefix: string;
  next_invoice_number: number;
  created_at: string;
  updated_at: string;
}

// ---- Dashboard Types ----

export interface DashboardMetrics {
  today_sales: number;
  today_profit: number; // Gross profit (Revenue - COGS)
  today_cash: number;
  total_udhaar: number;
  low_stock_count: number;
  today_cogs?: number;
  today_expenses?: number;
  today_net_profit?: number;
  today_sales_count?: number;
  total_products?: number;
  /** Cash received today (cash sales + cash udhaar recovery), cancelled sales excluded */
  today_cash_received?: number;
  /** EasyPaisa / JazzCash / bank received today */
  today_online_received?: number;
  /** Udhaar recovered today (all methods) */
  today_udhaar_recovered?: number;
  /** New udhaar given on today's sales */
  today_udhaar_given?: number;
  /** Expenses paid in cash today */
  today_cash_expenses?: number;
  recent_transactions: RecentTransaction[];
}

export interface RecentTransaction {
  id: string;
  type: 'sale' | 'purchase' | 'payment' | 'expense';
  description: string;
  amount: number;
  created_at: string;
}


// ---- Auth Context ----

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  shop_id: string | null;
  shop?: Shop;
}

// ---- Currency Helper ----

/** Convert paisas (integer) to PKR display string */
export function formatPKR(paisas: number): string {
  const rupees = paisas / 100;
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(rupees);
}

/** Convert PKR (user input) to paisas for storage */
export function toPaisas(rupees: number): number {
  return Math.round(rupees * 100);
}

/** Convert paisas to rupees for display/input */
export function toRupees(paisas: number): number {
  return paisas / 100;
}
