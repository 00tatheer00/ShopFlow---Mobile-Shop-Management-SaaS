import type { Metadata } from 'next';
import { requireShopAccess } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { CustomersClient } from './customers-client';

export const metadata: Metadata = { title: 'Customers' };

export default async function CustomersPage(props: {
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  const user = await requireShopAccess();
  const supabase = await createClient();
  const searchParams = await props.searchParams;

  const search = searchParams.search || '';
  const page = Number(searchParams.page) || 1;
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
  const udhaarMap = new Map<string, number>();

  if (customerIds.length > 0) {
    const { data: udhaarData } = await supabase
      .from('udhaar_ledger')
      .select('customer_id, balance_after')
      .eq('shop_id', user.shop_id!)
      .in('customer_id', customerIds)
      .order('created_at', { ascending: false });

    // Get latest balance per customer
    udhaarData?.forEach((entry) => {
      if (!udhaarMap.has(entry.customer_id)) {
        udhaarMap.set(entry.customer_id, entry.balance_after);
      }
    });
  }

  const enrichedCustomers = (customers || []).map((c) => ({
    ...c,
    udhaar_balance: udhaarMap.get(c.id) || 0,
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
