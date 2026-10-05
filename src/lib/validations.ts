import { z } from 'zod';

// ============================================
// ShopFlow — Validation Schemas (Zod)
// ============================================

// ---- Auth ----

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

// ---- Shop ----

export const createShopSchema = z.object({
  name: z.string().min(2, 'Shop name must be at least 2 characters').max(100),
  display_shop_id: z.string().regex(/^SHOP-\d+$/, 'Shop ID must be formatted like SHOP-001').optional().or(z.literal('')),
  city: z.string().min(2, 'City is required').max(50),
  address: z.string().max(255).optional().or(z.literal('')),
  phone: z.string().max(20).optional().or(z.literal('')),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  plan_id: z.string().uuid().optional().or(z.literal('')),
  status: z.enum(['active', 'suspended', 'deactivated']).optional().default('active'),
  // Owner account
  owner_name: z.string().min(2, 'Owner name is required').max(100),
  owner_email: z.string().email('Valid email required for owner account'),
  owner_password: z.string().min(8, 'Password must be at least 8 characters'),
  owner_phone: z.string().max(20).optional().or(z.literal('')),
});

export const updateShopSchema = z.object({
  name: z.string().min(2, 'Shop name must be at least 2 characters').max(100),
  city: z.string().min(2, 'City is required').max(50),
  address: z.string().max(255).optional().or(z.literal('')),
  phone: z.string().max(20).optional().or(z.literal('')),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
});

export const updateShopStatusSchema = z.object({
  shop_id: z.string().uuid('Shop ID is required'),
  status: z.enum(['active', 'suspended', 'deactivated']),
  reason: z.string().max(500).optional().or(z.literal('')),
});

export const updateShopPlanSchema = z.object({
  shop_id: z.string().uuid('Shop ID is required'),
  plan_id: z.string().uuid('Plan ID is required'),
  subscription_expires_at: z.string().optional().or(z.literal('')),
});

// ---- Product ----

export const productSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(200),
  category_id: z.string().uuid().optional().or(z.literal('')),
  brand_id: z.string().uuid().optional().or(z.literal('')),
  model: z.string().max(100).optional().or(z.literal('')),
  is_imei_tracked: z.boolean().default(false),
  sale_price: z.number().min(0, 'Sale price must be 0 or more'),
  purchase_price: z.number().min(0, 'Purchase price must be 0 or more').optional().default(0),
  stock_quantity: z.number().int().min(0).optional().default(0),
  low_stock_threshold: z.number().int().min(0).optional().default(5),
});

export const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(100),
  description: z.string().max(255).optional().or(z.literal('')),
});

export const productCategorySchema = categorySchema;

export const brandSchema = z.object({
  name: z.string().min(1, 'Brand name is required').max(100),
});

// ---- Customer ----

export const customerSchema = z.object({
  name: z.string().min(1, 'Customer name is required').max(100),
  phone: z.string().min(1, 'Phone number is required').max(20),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  address: z.string().max(255).optional().or(z.literal('')),
  notes: z.string().max(500).optional().or(z.literal('')),
});

// ---- Supplier ----

export const supplierSchema = z.object({
  name: z.string().min(1, 'Supplier name is required').max(100),
  phone: z.string().max(20).optional().or(z.literal('')),
  company: z.string().max(100).optional().or(z.literal('')),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  address: z.string().max(255).optional().or(z.literal('')),
  notes: z.string().max(500).optional().or(z.literal('')),
});

// ---- Sale ----

export const saleItemSchema = z.object({
  product_id: z.string().uuid('Product is required'),
  imei_record_id: z.string().uuid().optional().or(z.literal('')),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  unit_price: z.number().min(0, 'Price must be 0 or more'),
});

export const createSaleSchema = z.object({
  customer_id: z.string().uuid().optional().or(z.literal('')),
  items: z.array(saleItemSchema).min(1, 'At least one product is required'),
  discount: z.number().min(0).optional().default(0),
  payment_method: z.enum(['cash', 'bank_transfer', 'easypaisa', 'jazzcash', 'other']),
  amount_paid: z.number().min(0, 'Payment amount must be 0 or more'),
  notes: z.string().max(500).optional().or(z.literal('')),
});

// ---- IMEI Helpers & Validation ----

export function isValidLuhn(numStr: string): boolean {
  let sum = 0;
  let shouldDouble = false;
  for (let i = numStr.length - 1; i >= 0; i--) {
    let digit = parseInt(numStr.charAt(i), 10);
    if (isNaN(digit)) return false;
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

export function validateImeiString(rawImei: string): {
  normalized: string;
  isValidFormat: boolean;
  isLuhnValid: boolean;
  error?: string;
} {
  const normalized = rawImei.trim().replace(/\s+/g, '');
  if (!/^\d{15}$/.test(normalized)) {
    return {
      normalized,
      isValidFormat: false,
      isLuhnValid: false,
      error: 'IMEI must contain exactly 15 numeric digits',
    };
  }
  const isLuhnValid = isValidLuhn(normalized);
  return {
    normalized,
    isValidFormat: true,
    isLuhnValid,
  };
}

export interface ParsedImeisResult {
  total: number;
  valid: string[];
  duplicates: string[];
  invalid: string[];
  validLuhnCount: number;
}

export function parseImeiText(text: string): ParsedImeisResult {
  if (!text || !text.trim()) {
    return { total: 0, valid: [], duplicates: [], invalid: [], validLuhnCount: 0 };
  }

  const rawTokens = text
    .split(/[\n,]+/)
    .map((s) => s.trim().replace(/\s+/g, ''))
    .filter(Boolean);

  const seen = new Set<string>();
  const duplicates = new Set<string>();
  const valid: string[] = [];
  const invalid: string[] = [];
  let validLuhnCount = 0;

  for (const token of rawTokens) {
    if (!/^\d{15}$/.test(token)) {
      invalid.push(token);
    } else {
      if (seen.has(token)) {
        duplicates.add(token);
      } else {
        seen.add(token);
        valid.push(token);
        if (isValidLuhn(token)) {
          validLuhnCount++;
        }
      }
    }
  }

  return {
    total: rawTokens.length,
    valid,
    duplicates: Array.from(duplicates),
    invalid,
    validLuhnCount,
  };
}

export const imeiSchema = z
  .string()
  .trim()
  .regex(/^\d{15}$/, 'IMEI must be exactly 15 numeric digits');

export const purchaseItemSchema = z.object({
  product_id: z.string().uuid('Product is required'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  unit_price: z.number().min(0, 'Price must be 0 or more'),
  imei_numbers: z.array(imeiSchema).optional().default([]),
});

export const createPurchaseSchema = z.object({
  supplier_id: z.string().uuid('Supplier is required'),
  items: z.array(purchaseItemSchema).min(1, 'At least one product is required'),
  purchase_date: z.string().min(1, 'Purchase date is required'),
  notes: z.string().max(500).optional().or(z.literal('')),
}).refine((data) => {
  const allImeis = data.items.flatMap((item) => item.imei_numbers || []);
  return new Set(allImeis).size === allImeis.length;
}, {
  message: 'Duplicate IMEI numbers detected within the purchase order.',
  path: ['items'],
});

// ---- Payment ----

export const recordPaymentSchema = z.object({
  customer_id: z.string().uuid('Customer is required'),
  amount: z.number().min(1, 'Amount must be greater than 0'),
  payment_method: z.enum(['cash', 'bank_transfer', 'easypaisa', 'jazzcash', 'other']),
  reference: z.string().max(100).optional().or(z.literal('')),
  notes: z.string().max(500).optional().or(z.literal('')),
});

// ---- Expense ----

export const expenseSchema = z.object({
  category_id: z.string().uuid().optional().or(z.literal('')),
  amount: z.number().min(1, 'Amount must be greater than 0'),
  description: z.string().max(500).optional().or(z.literal('')),
  expense_date: z.string().min(1, 'Date is required'),
});

export const expenseCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(100),
});

// ---- Settings ----

export const shopSettingsSchema = z.object({
  receipt_header: z.string().max(200).optional().or(z.literal('')),
  receipt_footer: z.string().max(200).optional().or(z.literal('')),
  low_stock_threshold: z.number().int().min(0).optional().default(5),
  default_payment_method: z.enum(['cash', 'bank_transfer', 'easypaisa', 'jazzcash', 'other']).optional().default('cash'),
  invoice_prefix: z.string().max(10).optional().default('INV'),
});

export const shopProfileSchema = z.object({
  name: z.string().min(2, 'Shop name is required').max(100),
  city: z.string().min(2, 'City is required').max(50),
  address: z.string().max(255).optional().or(z.literal('')),
  phone: z.string().max(20).optional().or(z.literal('')),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
});

// ---- Staff ----

export const createStaffSchema = z.object({
  full_name: z.string().min(2, 'Name is required').max(100),
  email: z.string().email('Valid email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  phone: z.string().max(20).optional().or(z.literal('')),
  role: z.enum(['manager', 'cashier'], {
    message: 'Role is required',
  }),
});

// ---- Stock Adjustment ----

export const stockAdjustmentSchema = z.object({
  product_id: z.string().uuid('Product is required'),
  adjustment: z.number().int().refine((val) => val !== 0, 'Adjustment cannot be 0'),
  reason: z.string().min(1, 'Reason is required').max(255),
});

// ---- Type exports ----

export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type CreateShopInput = z.infer<typeof createShopSchema>;
export type UpdateShopInput = z.infer<typeof updateShopSchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
export type BrandInput = z.infer<typeof brandSchema>;
export type CustomerInput = z.infer<typeof customerSchema>;
export type SupplierInput = z.infer<typeof supplierSchema>;
export type CreateSaleInput = z.infer<typeof createSaleSchema>;
export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema>;
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;
export type ExpenseInput = z.infer<typeof expenseSchema>;
export type ExpenseCategoryInput = z.infer<typeof expenseCategorySchema>;
export type ShopSettingsInput = z.infer<typeof shopSettingsSchema>;
export type ShopProfileInput = z.infer<typeof shopProfileSchema>;
export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>;
