import type { Metadata } from 'next';
import { requireShopAccess } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { SuppliersClient } from './suppliers-client';

export const metadata: Metadata = { title: 'Suppliers' };

export default async function SuppliersPage(props: {
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  const user = await requireShopAccess();
  const supabase = await createClient();
  const searchParams = await props.searchParams;

  const search = searchParams.search || '';
  const page = Number(searchParams.page) || 1;
  const perPage = 20;

  let query = supabase
    .from('suppliers')
    .select('*', { count: 'exact' })
    .eq('shop_id', user.shop_id!)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (search) {
    query = query.or(`name.ilike.%${search}%,company.ilike.%${search}%,phone.ilike.%${search}%`);
  }

  const from = (page - 1) * perPage;
  query = query.range(from, from + perPage - 1);

  const { data: suppliers, count } = await query;
  const totalPages = Math.ceil((count || 0) / perPage);

  return (
    <SuppliersClient
      suppliers={suppliers || []}
      userRole={user.role}
      totalCount={count || 0}
      currentPage={page}
      totalPages={totalPages}
      search={search}
    />
  );
}
