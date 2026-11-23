import type { Metadata } from 'next';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { fetchAllRows } from '@/lib/supabase/queries';
import { pktRangeStart, type ReportRange } from '@/lib/time';
import { ReportsClient } from './reports-client';

export const metadata: Metadata = { title: 'Reports & Analytics' };

export default async function ReportsPage(props: {
  searchParams: Promise<{ range?: string; tab?: string }>;
}) {
  // Reports contain cost prices & profit: owner and manager only
  const user = await requireRole(['shop_owner', 'manager']);
  const supabase = await createClient();
  const searchParams = await props.searchParams;

  const allowedRanges: ReportRange[] = ['today', 'week', 'month', 'all'];
  const range: ReportRange = allowedRanges.includes(searchParams.range as ReportRange)
    ? (searchParams.range as ReportRange)
    : 'month';
  const activeTab = searchParams.tab || 'pnl';

  // Period start in Pakistan time (shop day starts at 12:00 AM PKT)
  const periodStart = pktRangeStart(range);
  const shopId = user.shop_id!;

  type SaleRow = {
    id: string;
    invoice_number: string;
    total_amount: number;
    discount: number;
    payment_method: string;
    amount_paid: number;
    amount_due: number;
    status: string;
    created_at: string;
    sale_items: unknown[];
  };

  // Paged fetches: busy shops have more than 1000 rows per month
  const salesPromise = fetchAllRows<SaleRow>(() => {
    let q = supabase
      .from('sales')
      .select(`
        id, invoice_number, total_amount, discount, payment_method, amount_paid, amount_due, status, created_at,
        sale_items(
          quantity, unit_price, total_price, product_id,
          products(name, model, purchase_price)
        )
      `)
      .eq('shop_id', shopId)
      .eq('status', 'completed');
    if (periodStart) q = q.gte('created_at', periodStart.iso);
    return q.order('created_at', { ascending: false });
  });

  const cancelledPromise = fetchAllRows<{ id: string; total_amount: number }>(() => {
    let q = supabase
      .from('sales')
      .select('id, total_amount')
      .eq('shop_id', shopId)
      .eq('status', 'cancelled');
    if (periodStart) q = q.gte('created_at', periodStart.iso);
    return q.order('created_at', { ascending: false });
  });

  const purchasesPromise = fetchAllRows<{ id: string; total_amount: number; suppliers: unknown }>(() => {
    let q = supabase
      .from('purchases')
      .select('id, total_amount, purchase_date, supplier_id, suppliers(name, company)')
      .eq('shop_id', shopId);
    if (periodStart) q = q.gte('purchase_date', periodStart.date);
    return q.order('purchase_date', { ascending: false }).order('id', { ascending: true });
  });

  const expensesPromise = fetchAllRows<Record<string, unknown>>(() => {
    let q = supabase
      .from('expenses')
      .select('id, amount, expense_date, payment_method, description, notes, category_id, expense_categories(name)')
      .eq('shop_id', shopId);
    if (periodStart) q = q.gte('expense_date', periodStart.date);
    return q.order('expense_date', { ascending: false }).order('created_at', { ascending: false });
  });

  // 5. Fetch Inventory catalog snapshot & IMEIs
  const [
    sales,
    cancelledSales,
    purchases,
    expenses,
    { data: products },
    { count: inStockImeiCount },
  ] = await Promise.all([
    salesPromise,
    cancelledPromise,
    purchasesPromise,
    expensesPromise,
    supabase
      .from('products')
      .select('id, name, model, stock_quantity, low_stock_threshold, purchase_price, sale_price, is_imei_tracked')
      .eq('shop_id', shopId)
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('imei_records')
      .select('id', { count: 'exact', head: true })
      .eq('shop_id', user.shop_id!)
      .eq('status', 'in_stock'),
  ]);

  // ---- Financial Aggregations ----

  // Sales totals
  let totalRevenue = 0;
  let totalDiscounts = 0;
  let totalCollected = 0;
  let totalUdhaar = 0;
  let cogs = 0;
  const paymentMap: Record<string, { total: number; count: number }> = {};
  const productMap: Record<string, { name: string; model: string | null; quantity: number; revenue: number }> = {};

  type SaleItemReport = {
    product_id: string;
    quantity: number;
    total_price: number;
    products?: { name: string; model: string | null; purchase_price: number | null } | null;
  };

  (sales || []).forEach((sale) => {
    totalRevenue += sale.total_amount || 0;
    totalDiscounts += sale.discount || 0;
    totalCollected += sale.amount_paid || 0;
    totalUdhaar += sale.amount_due || 0;

    const pm = sale.payment_method || 'cash';
    if (!paymentMap[pm]) {
      paymentMap[pm] = { total: 0, count: 0 };
    }
    paymentMap[pm].total += sale.total_amount || 0;
    paymentMap[pm].count += 1;

    ((sale.sale_items || []) as unknown as SaleItemReport[]).forEach((item) => {
      const prodCost = item.products?.purchase_price || 0;
      cogs += prodCost * (item.quantity || 1);

      const pid = item.product_id;
      if (!productMap[pid]) {
        productMap[pid] = {
          name: item.products?.name || 'Product',
          model: item.products?.model || null,
          quantity: 0,
          revenue: 0,
        };
      }
      productMap[pid].quantity += item.quantity || 0;
      productMap[pid].revenue += item.total_price || 0;
    });
  });

  // Cancelled sales
  const cancelledCount = cancelledSales?.length || 0;
  const cancelledTotal = (cancelledSales || []).reduce((sum, s) => sum + (s.total_amount || 0), 0);

  // Profit calculation (negative = loss; never hide it)
  const grossProfit = totalRevenue - cogs;

  // Expenses totals & category grouping
  let totalExpenses = 0;
  const expenseCatMap: Record<string, number> = {};
  type ExpenseReport = {
    id: string;
    amount: number;
    expense_date: string;
    payment_method: string | null;
    description: string | null;
    notes: string | null;
    expense_categories?: { name: string } | null;
  };

  ((expenses || []) as unknown as ExpenseReport[]).forEach((exp) => {
    totalExpenses += exp.amount || 0;
    const catName = exp.expense_categories?.name || 'General';
    expenseCatMap[catName] = (expenseCatMap[catName] || 0) + (exp.amount || 0);
  });

  const netProfit = grossProfit - totalExpenses;

  // Purchases totals & supplier grouping
  let totalPurchases = 0;
  const supplierSpendMap: Record<string, { name: string; total: number; count: number }> = {};
  (purchases || []).forEach((p) => {
    totalPurchases += p.total_amount || 0;
    const sup = p.suppliers as unknown as { name?: string } | { name?: string }[] | null;
    const sName = (Array.isArray(sup) ? sup[0]?.name : sup?.name) || 'General Supplier';
    if (!supplierSpendMap[sName]) {
      supplierSpendMap[sName] = { name: sName, total: 0, count: 0 };
    }
    supplierSpendMap[sName].total += p.total_amount || 0;
    supplierSpendMap[sName].count += 1;
  });

  // Inventory valuation
  let totalInventoryCostValuation = 0;
  let totalPotentialRetailValuation = 0;
  let totalStockQuantity = 0;
  let lowStockCount = 0;

  (products || []).forEach((prod) => {
    const qty = prod.stock_quantity || 0;
    totalStockQuantity += qty;
    totalInventoryCostValuation += qty * (prod.purchase_price || 0);
    totalPotentialRetailValuation += qty * (prod.sale_price || 0);
    if (qty <= prod.low_stock_threshold) {
      lowStockCount++;
    }
  });

  // Presentation maps
  const paymentMethodStats = Object.entries(paymentMap).map(([method, data]) => ({
    method,
    total: data.total,
    count: data.count,
  }));

  const topProducts = Object.values(productMap)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  const expenseCategories = Object.entries(expenseCatMap).map(([name, amount]) => ({
    name,
    amount,
  }));

  const supplierStats = Object.values(supplierSpendMap);

  return (
    <ReportsClient
      dateRange={range}
      activeTab={activeTab}
      userRole={user.role}
      totalRevenue={totalRevenue}
      totalDiscounts={totalDiscounts}
      totalCollected={totalCollected}
      totalUdhaar={totalUdhaar}
      salesCount={sales?.length || 0}
      cancelledCount={cancelledCount}
      cancelledTotal={cancelledTotal}
      cogs={cogs}
      grossProfit={grossProfit}
      totalExpenses={totalExpenses}
      netProfit={netProfit}
      totalPurchases={totalPurchases}
      purchasesCount={purchases?.length || 0}
      supplierStats={supplierStats}
      totalInventoryCostValuation={totalInventoryCostValuation}
      totalPotentialRetailValuation={totalPotentialRetailValuation}
      totalStockQuantity={totalStockQuantity}
      lowStockCount={lowStockCount}
      inStockImeiCount={inStockImeiCount || 0}
      products={products || []}
      paymentMethodStats={paymentMethodStats}
      topProducts={topProducts}
      expenseCategories={expenseCategories}
      recentExpenses={((expenses || []) as unknown as ExpenseReport[]).slice(0, 10)}
    />
  );
}
