import type { Metadata } from 'next';
import { requireShopAccess } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { getLatestUdhaarBalances, sanitizeSearch } from '@/lib/supabase/queries';
import { CustomersClient } from './customers-client';

export const metadata: Metadata = { title: 'Customers' };

export default async function CustomersPage(props: {
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  const user = await requireShopAccess();
  const supabase = await createClient();
  const searchParams = await props.searchParams;

  // Sanitised: commas/parentheses would otherwise break the PostgREST .or() filter
  const search = sanitizeSearch(searchParams.search);
  const page = Math.max(1, Math.floor(Number(searchParams.page)) || 1);
  const perPage = 20;

  let query = supabase
    .from('customers')
    .select('*', { count: 'exact' })
    .eq('shop_id', user.shop_id!)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (search) {
    query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
  }

  const from = (page - 1) * perPage;
  query = query.range(from, from + perPage - 1);

  const { data: customers, count } = await query;

  // Get udhaar balances for each customer
  const customerIds = customers?.map((c) => c.id) || [];
  const balances = await getLatestUdhaarBalances(supabase, user.shop_id!, customerIds);

  const enrichedCustomers = (customers || []).map((c) => ({
    ...c,
    udhaar_balance: balances.get(c.id)?.balance_after || 0,
  }));

  const totalPages = Math.ceil((count || 0) / perPage);

  return (
    <CustomersClient
      customers={enrichedCustomers}
      userRole={user.role}
      totalCount={count || 0}
      currentPage={page}
      totalPages={totalPages}
      search={search}
    />
  );
}
