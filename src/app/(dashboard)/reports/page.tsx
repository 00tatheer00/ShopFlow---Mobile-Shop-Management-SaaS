import type { Metadata } from 'next';
import { requireShopAccess } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { ReportsClient } from './reports-client';

export const metadata: Metadata = { title: 'Reports & Analytics' };

export default async function ReportsPage(props: {
  searchParams: Promise<{ range?: string }>;
}) {
  const user = await requireShopAccess();
  const supabase = await createClient();
  const searchParams = await props.searchParams;

  const range = searchParams.range || 'month';

  // Compute date filter boundary
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

  // 1. Fetch Sales within period
  let salesQuery = supabase
    .from('sales')
    .select(`
      id, total_amount, payment_method, amount_paid, amount_due, status, created_at,
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

  const { data: sales } = await salesQuery;

  // 2. Fetch Expenses within period
  let expensesQuery = supabase
    .from('expenses')
    .select(`
      amount, expense_date,
      expense_categories(name)
    `)
    .eq('shop_id', user.shop_id!);

  if (startDate) {
    expensesQuery = expensesQuery.gte('expense_date', startDate.split('T')[0]);
  }

  const { data: expenses } = await expensesQuery;

  // 3. Compute Metrics
  let totalRevenue = 0;
  let cogs = 0;
  let totalUdhaar = 0;
  const paymentMap: Record<string, { total: number; count: number }> = {};
  const productMap: Record<string, { name: string; model: string | null; quantity: number; revenue: number }> = {};

  (sales || []).forEach((sale) => {
    totalRevenue += sale.total_amount || 0;
    totalUdhaar += sale.amount_due || 0;

    // Payment method
    const pm = sale.payment_method || 'cash';
    if (!paymentMap[pm]) {
      paymentMap[pm] = { total: 0, count: 0 };
    }
    paymentMap[pm].total += sale.total_amount || 0;
    paymentMap[pm].count += 1;

    // Items
    type SaleItemReport = {
      product_id: string;
      quantity: number;
      total_price: number;
      products?: { name: string; model: string | null; purchase_price: number | null } | null;
    };

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

  const grossProfit = Math.max(0, totalRevenue - cogs);

  // Expenses total & category grouping
  let totalExpenses = 0;
  const expenseCatMap: Record<string, number> = {};

  type ExpenseReport = {
    amount: number;
    expense_categories?: { name: string } | null;
  };

  ((expenses || []) as unknown as ExpenseReport[]).forEach((exp) => {
    totalExpenses += exp.amount || 0;
    const catName = exp.expense_categories?.name || 'General';
    expenseCatMap[catName] = (expenseCatMap[catName] || 0) + (exp.amount || 0);
  });

  const netProfit = grossProfit - totalExpenses;

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

  return (
    <ReportsClient
      dateRange={range}
      totalRevenue={totalRevenue}
      cogs={cogs}
      grossProfit={grossProfit}
      totalExpenses={totalExpenses}
      netProfit={netProfit}
      totalUdhaar={totalUdhaar}
      salesCount={sales?.length || 0}
      paymentMethodStats={paymentMethodStats}
      topProducts={topProducts}
      expenseCategories={expenseCategories}
    />
  );
}
