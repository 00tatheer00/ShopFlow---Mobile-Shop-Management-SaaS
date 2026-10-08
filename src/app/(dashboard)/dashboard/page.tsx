import type { Metadata } from 'next';
import { requireShopAccess } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { DashboardContent } from '@/components/dashboard/dashboard-content';

export const metadata: Metadata = {
  title: 'Dashboard',
};

export default async function DashboardPage() {
  const user = await requireShopAccess();
  const supabase = await createClient();

  // Fetch today's metrics boundaries (Local day in UTC ISO range)
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

  const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  type SaleItemWithProduct = {
    quantity: number;
    total_price: number;
    product_id: string;
    products?: { name: string; purchase_price: number | null } | null;
  };

  // Blazing Fast: Parallelize all 8 independent queries in a single round-trip
  const [
    { data: todaySales },
    { data: rawTodaySaleItems },
    { data: todayExpensesData },
    { data: activeCustomers },
    { data: udhaarData },
    { data: productsData },
    { data: recentSales },
    { data: currentSubscription },
  ] = await Promise.all([
    // 1. Today's Completed Sales
    supabase
      .from('sales')
      .select('id, total_amount, amount_paid, payment_method')
      .eq('shop_id', user.shop_id!)
      .eq('status', 'completed')
      .gte('created_at', startOfDay)
      .lt('created_at', endOfDay),

    // 2. Today's Sale Items with product purchase_price for True COGS
    supabase
      .from('sale_items')
      .select(`
        quantity,
        total_price,
        product_id,
        products(name, purchase_price),
        sales!inner(created_at, status, shop_id)
      `)
      .eq('sales.shop_id', user.shop_id!)
      .eq('sales.status', 'completed')
      .gte('sales.created_at', startOfDay)
      .lt('sales.created_at', endOfDay),

    // 3. Today's Expenses
    supabase
      .from('expenses')
      .select('amount')
      .eq('shop_id', user.shop_id!)
      .eq('expense_date', todayStr),

    // 4. Active Customers
    supabase
      .from('customers')
      .select('id, name')
      .eq('shop_id', user.shop_id!)
      .eq('is_active', true),

    // 5. Udhaar Ledger
    supabase
      .from('udhaar_ledger')
      .select('customer_id, balance_after, created_at')
      .eq('shop_id', user.shop_id!)
      .order('created_at', { ascending: false })
      .limit(300),

    // 6. Products & Stock
    supabase
      .from('products')
      .select('id, stock_quantity, low_stock_threshold')
      .eq('shop_id', user.shop_id!)
      .eq('is_active', true),

    // 7. Recent Sales
    supabase
      .from('sales')
      .select(`
        id, invoice_number, total_amount, status, created_at,
        customers(name)
      `)
      .eq('shop_id', user.shop_id!)
      .order('created_at', { ascending: false })
      .limit(6),

    // 8. Subscription Status
    supabase
      .from('shop_subscriptions')
      .select('*')
      .eq('shop_id', user.shop_id!)
      .eq('billing_month', currentMonthStr)
      .maybeSingle(),
  ]);

  const todaySaleItems = (rawTodaySaleItems || []) as unknown as SaleItemWithProduct[];

  const todayExpenses = (todayExpensesData || []).reduce(
    (sum, exp) => sum + (exp.amount || 0),
    0
  );

  // Derive latest balance for each active customer
  const latestUdhaar = new Map<string, number>();
  udhaarData?.forEach((entry) => {
    if (!latestUdhaar.has(entry.customer_id)) {
      latestUdhaar.set(entry.customer_id, entry.balance_after);
    }
  });

  const totalUdhaar = (activeCustomers || []).reduce((sum, customer) => {
    const bal = latestUdhaar.get(customer.id) || 0;
    return sum + (bal > 0 ? bal : 0);
  }, 0);

  // Products & Low Stock calculation
  const totalProducts = productsData?.length ?? 0;
  const actualLowStock = productsData?.filter(
    (p) => p.stock_quantity <= p.low_stock_threshold
  ).length ?? 0;

  // Authoritative Metric Calculations (Single source of truth)
  const todayTotalSales = todaySales?.reduce((sum, sale) => sum + sale.total_amount, 0) ?? 0;
  const todaySalesCount = todaySales?.length ?? 0;
  const todayCash = todaySales?.reduce((sum, sale) => sum + sale.amount_paid, 0) ?? 0;

  // Cost of Goods Sold (COGS) = sum(item.quantity * product.purchase_price)
  const todayCogs = todaySaleItems.reduce((sum, item) => {
    const wholesaleCost = item.products?.purchase_price ?? 0;
    return sum + (wholesaleCost * (item.quantity || 1));
  }, 0);

  // Gross Profit = Revenue - COGS
  const todayGrossProfit = Math.max(0, todayTotalSales - todayCogs);

  // Net Profit = Gross Profit - Operating Expenses
  const todayNetProfit = todayGrossProfit - todayExpenses;

  const metrics = {
    today_sales: todayTotalSales,
    today_profit: todayGrossProfit,
    today_cogs: todayCogs,
    today_expenses: todayExpenses,
    today_net_profit: todayNetProfit,
    today_sales_count: todaySalesCount,
    today_cash: todayCash,
    total_udhaar: totalUdhaar,
    low_stock_count: actualLowStock,
    total_products: totalProducts,
    recent_transactions: (recentSales ?? []).map((sale) => {
      const customer = Array.isArray(sale.customers) ? sale.customers[0] : sale.customers;
      const isCancelled = sale.status === 'cancelled';
      return {
        id: sale.id,
        type: 'sale' as const,
        description: `${sale.invoice_number}${customer?.name ? ` — ${customer.name}` : ''}${isCancelled ? ' (CANCELLED)' : ''}`,
        amount: isCancelled ? 0 : sale.total_amount,
        created_at: sale.created_at,
      };
    }),
  };

  // Auto-migrate any existing unpaid subscription from old 6,500 to new 8,000 standard rate
  if (currentSubscription && currentSubscription.status !== 'paid' && currentSubscription.amount === 650000) {
    currentSubscription.amount = 800000;
    // Async DB update so the row stays updated in Supabase
    supabase
      .from('shop_subscriptions')
      .update({ amount: 800000 })
      .eq('id', currentSubscription.id)
      .then(() => {});
  }

  return (
    <DashboardContent
      metrics={metrics}
      userName={user.full_name}
      role={user.role}
      subscription={currentSubscription}
    />
  );
}

