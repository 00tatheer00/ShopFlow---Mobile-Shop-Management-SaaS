import type { Metadata } from 'next';
import { requireShopAccess } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { ReportsClient } from './reports-client';

export const metadata: Metadata = { title: 'Reports & Analytics' };

export default async function ReportsPage(props: {
  searchParams: Promise<{ range?: string; tab?: string }>;
}) {
  const user = await requireShopAccess();
  const supabase = await createClient();
  const searchParams = await props.searchParams;

  const range = searchParams.range || 'month';
  const activeTab = searchParams.tab || 'pnl';

  // Compute date filter boundary in UTC
  const now = new Date();
  let startDate: string | null = null;

  if (range === 'today') {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  } else if (range === 'week') {
    const day = now.getDay() || 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - day + 1);
    monday.setHours(0, 0, 0, 0);
    startDate = monday.toISOString();
  } else if (range === 'month') {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  }

  // 1. Fetch Completed Sales within period
  let salesQuery = supabase
    .from('sales')
    .select(`
      id, invoice_number, total_amount, discount, payment_method, amount_paid, amount_due, status, created_at,
      customers(name),
      sale_items(
        quantity, unit_price, total_price, product_id,
        products(name, model, purchase_price)
      )
    `)
    .eq('shop_id', user.shop_id!)
    .eq('status', 'completed');

  if (startDate) {
    salesQuery = salesQuery.gte('created_at', startDate);
  }

  // 2. Fetch Cancelled Sales separately (Preserves history without polluting active revenue)
  let cancelledSalesQuery = supabase
    .from('sales')
    .select('id, invoice_number, total_amount, created_at')
    .eq('shop_id', user.shop_id!)
    .eq('status', 'cancelled');

  if (startDate) {
    cancelledSalesQuery = cancelledSalesQuery.gte('created_at', startDate);
  }

  // 3. Fetch Purchases within period
  let purchasesQuery = supabase
    .from('purchases')
    .select(`
      id, total_amount, purchase_date, notes, supplier_id,
      suppliers(name, company)
    `)
    .eq('shop_id', user.shop_id!);

  if (startDate) {
    purchasesQuery = purchasesQuery.gte('purchase_date', startDate.split('T')[0]);
  }

  // 4. Fetch Expenses within period
  let expensesQuery = supabase
    .from('expenses')
    .select(`
      id, amount, expense_date, payment_method, description, notes, category_id,
      expense_categories(name)
    `)
    .eq('shop_id', user.shop_id!);

  if (startDate) {
    expensesQuery = expensesQuery.gte('expense_date', startDate.split('T')[0]);
  }

  // 5. Fetch Inventory catalog snapshot & IMEIs
  const [
    { data: sales },
    { data: cancelledSales },
    { data: purchases },
    { data: expenses },
    { data: products },
    { count: inStockImeiCount },
  ] = await Promise.all([
    salesQuery.order('created_at', { ascending: false }),
    cancelledSalesQuery.order('created_at', { ascending: false }),
    purchasesQuery.order('purchase_date', { ascending: false }),
    expensesQuery.order('expense_date', { ascending: false }),
    supabase
      .from('products')
      .select('id, name, model, stock_quantity, low_stock_threshold, purchase_price, sale_price, is_imei_tracked')
      .eq('shop_id', user.shop_id!)
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

  // Profit calculation
  const grossProfit = Math.max(0, totalRevenue - cogs);

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
