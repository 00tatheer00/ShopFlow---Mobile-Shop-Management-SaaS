import type { Metadata } from 'next';
import { requireShopAccess } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { fetchAllRows, getLatestUdhaarBalances } from '@/lib/supabase/queries';
import { pktHour, pktMonthStr, pktTodayDateStr, pktTodayRange } from '@/lib/time';
import { DashboardContent } from '@/components/dashboard/dashboard-content';
import type { DashboardMetrics } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Dashboard',
};

type SaleItemWithProduct = {
  quantity: number;
  total_price: number;
  products?: { purchase_price: number | null } | null;
};

type PaymentRow = {
  amount: number;
  payment_method: string;
  payment_type: 'sale_payment' | 'udhaar_payment';
  sales?: { status: string } | null;
};

export default async function DashboardPage() {
  const user = await requireShopAccess();
  const supabase = await createClient();
  const shopId = user.shop_id!;

  // "Today" is the shop's day in Pakistan time, not the server's UTC day.
  const { start: startOfDay, end: endOfDay } = pktTodayRange();
  const todayStr = pktTodayDateStr();
  const currentMonthStr = pktMonthStr();

  const [
    todaySales,
    todaySaleItems,
    todayPayments,
    { data: todayExpensesData },
    { data: activeCustomers },
    udhaarBalances,
    { data: productsData },
    { data: recentSales },
    { data: currentSubscription },
  ] = await Promise.all([
    fetchAllRows<{ id: string; total_amount: number; amount_due: number }>(() =>
      supabase
        .from('sales')
        .select('id, total_amount, amount_due')
        .eq('shop_id', shopId)
        .eq('status', 'completed')
        .gte('created_at', startOfDay)
        .lt('created_at', endOfDay)
        .order('created_at', { ascending: true })
    ),

    fetchAllRows<SaleItemWithProduct>(() =>
      supabase
        .from('sale_items')
        .select('quantity, total_price, products(purchase_price), sales!inner(created_at, status, shop_id)')
        .eq('sales.shop_id', shopId)
        .eq('sales.status', 'completed')
        .gte('sales.created_at', startOfDay)
        .lt('sales.created_at', endOfDay)
        .order('id', { ascending: true })
    ),

    fetchAllRows<PaymentRow>(() =>
      supabase
        .from('payments')
        .select('amount, payment_method, payment_type, sales(status)')
        .eq('shop_id', shopId)
        .gte('created_at', startOfDay)
        .lt('created_at', endOfDay)
        .order('created_at', { ascending: true })
    ),

    supabase
      .from('expenses')
      .select('amount, payment_method')
      .eq('shop_id', shopId)
      .eq('expense_date', todayStr),

    supabase
      .from('customers')
      .select('id')
      .eq('shop_id', shopId)
      .eq('is_active', true),

    getLatestUdhaarBalances(supabase, shopId),

    supabase
      .from('products')
      .select('id, stock_quantity, low_stock_threshold')
      .eq('shop_id', shopId)
      .eq('is_active', true),

    supabase
      .from('sales')
      .select('id, invoice_number, total_amount, status, created_at, customers(name)')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false })
      .limit(6),

    supabase
      .from('shop_subscriptions')
      .select('*')
      .eq('shop_id', shopId)
      .eq('billing_month', currentMonthStr)
      .maybeSingle(),
  ]);

  // ---- Sales & profit ----
  const todayTotalSales = todaySales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
  const todayUdhaarGiven = todaySales.reduce((sum, s) => sum + (s.amount_due || 0), 0);
  const todayCogs = todaySaleItems.reduce(
    (sum, item) => sum + (item.products?.purchase_price ?? 0) * (item.quantity || 1),
    0
  );
  // Do NOT clamp at zero: selling below cost is a real loss the owner must see.
  const todayGrossProfit = todayTotalSales - todayCogs;

  const expenses = todayExpensesData || [];
  const todayExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const todayCashExpenses = expenses
    .filter((e) => (e.payment_method || 'cash') === 'cash')
    .reduce((sum, e) => sum + (e.amount || 0), 0);
  const todayNetProfit = todayGrossProfit - todayExpenses;

  // ---- Money actually received today (payments ledger) ----
  let cashReceived = 0;
  let onlineReceived = 0;
  let udhaarRecovered = 0;
  for (const p of todayPayments) {
    const sale = Array.isArray(p.sales) ? p.sales[0] : p.sales;
    if (p.payment_type === 'sale_payment' && sale?.status === 'cancelled') continue;
    if (p.payment_method === 'cash') cashReceived += p.amount;
    else onlineReceived += p.amount;
    if (p.payment_type === 'udhaar_payment') udhaarRecovered += p.amount;
  }

  // ---- Udhaar outstanding (active customers only) ----
  const totalUdhaar = (activeCustomers || []).reduce((sum, c) => {
    const bal = udhaarBalances.get(c.id)?.balance_after || 0;
    return sum + (bal > 0 ? bal : 0);
  }, 0);

  // ---- Stock ----
  const totalProducts = productsData?.length ?? 0;
  const lowStockCount =
    productsData?.filter((p) => p.stock_quantity <= p.low_stock_threshold).length ?? 0;

  const metrics: DashboardMetrics = {
    today_sales: todayTotalSales,
    today_profit: todayGrossProfit,
    today_cogs: todayCogs,
    today_expenses: todayExpenses,
    today_net_profit: todayNetProfit,
    today_sales_count: todaySales.length,
    today_cash: cashReceived - todayCashExpenses,
    today_cash_received: cashReceived,
    today_online_received: onlineReceived,
    today_udhaar_recovered: udhaarRecovered,
    today_udhaar_given: todayUdhaarGiven,
    today_cash_expenses: todayCashExpenses,
    total_udhaar: totalUdhaar,
    low_stock_count: lowStockCount,
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

  return (
    <DashboardContent
      metrics={metrics}
      userName={user.full_name}
      role={user.role}
      subscription={currentSubscription}
      pktHour={pktHour()}
    />
  );
}
