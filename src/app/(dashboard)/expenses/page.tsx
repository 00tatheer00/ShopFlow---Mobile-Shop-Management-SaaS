import type { Metadata } from 'next';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { pktRangeStart, pktTodayDateStr } from '@/lib/time';
import type { ExpenseCategory, PaymentMethod } from '@/lib/types';
import { ExpensesClient } from './expenses-client';

export const metadata: Metadata = { title: 'Expenses' };

export default async function ExpensesPage(props: {
  searchParams: Promise<{ category?: string; page?: string }>;
}) {
  const user = await requireRole(['shop_owner', 'manager']);
  const supabase = await createClient();
  const searchParams = await props.searchParams;

  const category = searchParams.category || '';
  const page = Math.max(1, Math.floor(Number(searchParams.page)) || 1);
  const perPage = 20;

  let query = supabase
    .from('expenses')
    .select('*, expense_categories(*)', { count: 'exact' })
    .eq('shop_id', user.shop_id!)
    .order('expense_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (category && /^[0-9a-f-]{36}$/i.test(category)) {
    query = query.eq('category_id', category);
  }

  const from = (page - 1) * perPage;
  query = query.range(from, from + perPage - 1);

  // 3. Compute Today's Total and This Month's Total & fetch list in parallel
  // Pakistan calendar dates (expense_date is a DATE column)
  const todayStr = pktTodayDateStr();
  const startOfMonth = pktRangeStart('month')!.date;

  const [{ data: categories }, { data: rawExpenses, count }, { data: todayData }, { data: monthData }] = await Promise.all([
    supabase
      .from('expense_categories')
      .select('*')
      .eq('shop_id', user.shop_id!)
      .order('name'),
    query,
    supabase
      .from('expenses')
      .select('amount')
      .eq('shop_id', user.shop_id!)
      .eq('expense_date', todayStr),
    supabase
      .from('expenses')
      .select('amount')
      .eq('shop_id', user.shop_id!)
      .gte('expense_date', startOfMonth),
  ]);

  const todayTotal = (todayData || []).reduce((sum: number, item: { amount: number | null }) => sum + (item.amount || 0), 0);
  const monthTotal = (monthData || []).reduce((sum: number, item: { amount: number | null }) => sum + (item.amount || 0), 0);

  type ExpenseRow = {
    id: string;
    shop_id: string;
    category_id: string | null;
    amount: number;
    description: string | null;
    expense_date: string;
    payment_method: PaymentMethod;
    notes: string | null;
    created_by: string;
    created_at: string;
    expense_categories?: unknown;
  };

  const expenses = ((rawExpenses || []) as ExpenseRow[]).map((exp) => ({
    id: exp.id,
    shop_id: exp.shop_id,
    category_id: exp.category_id,
    amount: exp.amount,
    description: exp.description,
    expense_date: exp.expense_date,
    payment_method: exp.payment_method,
    notes: exp.notes,
    created_by: exp.created_by,
    created_at: exp.created_at,
    category: (exp.expense_categories as unknown as ExpenseCategory) || undefined,
  }));

  const totalPages = Math.ceil((count || 0) / perPage);

  return (
    <ExpensesClient
      expenses={expenses}
      categories={categories || []}
      userRole={user.role}
      todayTotal={todayTotal}
      monthTotal={monthTotal}
      totalCount={count || 0}
      currentPage={page}
      totalPages={totalPages}
      selectedCategory={category}
    />
  );
}
