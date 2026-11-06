// ============================================
// ShopFlow — Global Application Constants
// ============================================

/**
 * Standard monthly SaaS subscription price in paisas (1 PKR = 100 paisas).
 * Single source of truth for platform billing: Rs. 8,000 / month = 800,000 paisas.
 */
export const SUBSCRIPTION_PRICE_PAISAS = 800_000;

/**
 * Subscription price in Rupees (for display and user inputs)
 */
export const SUBSCRIPTION_PRICE_RUPEES = 8_000;

/**
 * Default standard plan UUID
 */
export const STANDARD_PLAN_ID = '55555555-5555-5555-5555-555555555555';

/**
 * Days before trashed shops are permanently purged from the system
 */
export const TRASH_RETENTION_DAYS = 30;

/**
 * Warning threshold in days for trashed items nearing permanent purge
 */
export const TRASH_WARNING_THRESHOLD_DAYS = 7;

