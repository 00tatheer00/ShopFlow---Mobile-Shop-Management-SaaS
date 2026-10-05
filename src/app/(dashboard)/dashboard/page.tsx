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

  // Fetch today's metrics
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

  // Today's sales
  const { data: todaySales } = await supabase
    .from('sales')
    .select('total_amount, amount_paid, payment_method')
    .eq('shop_id', user.shop_id!)
    .eq('status', 'completed')
    .gte('created_at', startOfDay)
    .lt('created_at', endOfDay);

  // Today's purchases (for profit calculation)
  const { data: todaySaleItems } = await supabase
    .from('sale_items')
    .select(`
      total_price,
      quantity,
      unit_price,
      product_id,
      sale_id,
      sales!inner(created_at, status, shop_id)
    `)
    .eq('sales.shop_id', user.shop_id!)
    .eq('sales.status', 'completed')
    .gte('sales.created_at', startOfDay)
    .lt('sales.created_at', endOfDay);

  // Total outstanding udhaar
  const { data: udhaarData } = await supabase
    .from('udhaar_ledger')
    .select('balance_after, customer_id')
    .eq('shop_id', user.shop_id!)
    .order('created_at', { ascending: false });

  // Get the latest balance for each customer
  const latestUdhaar = new Map<string, number>();
  udhaarData?.forEach((entry) => {
    if (!latestUdhaar.has(entry.customer_id)) {
      latestUdhaar.set(entry.customer_id, entry.balance_after);
    }
  });
  const totalUdhaar = Array.from(latestUdhaar.values()).reduce(
    (sum, balance) => sum + balance,
    0
  );

  // Low stock products count
  const { data: lowStockProducts } = await supabase
    .from('products')
    .select('id, stock_quantity, low_stock_threshold')
    .eq('shop_id', user.shop_id!)
    .eq('is_active', true)
    .eq('is_imei_tracked', false);

  const actualLowStock = lowStockProducts?.filter(
    (p) => p.stock_quantity <= p.low_stock_threshold
  ).length ?? 0;

  // Recent transactions (last 5 sales)
  const { data: recentSales } = await supabase
    .from('sales')
    .select(`
      id, invoice_number, total_amount, created_at, status,
      customers(name)
    `)
    .eq('shop_id', user.shop_id!)
    .order('created_at', { ascending: false })
    .limit(5);

  // Calculate metrics
  const todayTotalSales = todaySales?.reduce(
    (sum, sale) => sum + sale.total_amount,
    0
  ) ?? 0;

  const todayCash = todaySales?.reduce(
    (sum, sale) => sum + sale.amount_paid,
    0
  ) ?? 0;

  // Simple profit: sum of (sale price - purchase price) for today's items
  // For now, use a simplified estimation
  const todayProfit = todaySaleItems?.reduce((sum, item) => {
    // We'd need purchase price per product — simplified for now
    return sum + (item.total_price * 0.15); // ~15% margin estimate, will be refined
  }, 0) ?? 0;

  const metrics = {
    today_sales: todayTotalSales,
    today_profit: Math.round(todayProfit),
    today_cash: todayCash,
    total_udhaar: totalUdhaar,
    low_stock_count: actualLowStock,
    recent_transactions: (recentSales ?? []).map((sale) => {
      const customerArr = sale.customers as unknown as { name: string }[] | null;
      const customer = customerArr?.[0] ?? null;
      return {
        id: sale.id,
        type: 'sale' as const,
        description: `${sale.invoice_number}${customer?.name ? ` — ${customer.name}` : ''}`,
        amount: sale.total_amount,
        created_at: sale.created_at,
      };
    }),
  };

  return <DashboardContent metrics={metrics} userName={user.full_name} role={user.role} />;
}
