import type { Metadata } from 'next';
import { requireShopAccess } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { PurchasesClient } from './purchases-client';
import type { Supplier } from '@/lib/types';

export const metadata: Metadata = { title: 'Purchase History' };

export default async function PurchasesPage(props: {
  searchParams: Promise<{ search?: string; supplier?: string; page?: string }>;
}) {
  const user = await requireShopAccess();
  const supabase = await createClient();
  const searchParams = await props.searchParams;

  const search = searchParams.search || '';
  const supplierId = searchParams.supplier || '';
  const page = Number(searchParams.page) || 1;
  const perPage = 20;

  // 1. Fetch suppliers for filter dropdown
  const { data: suppliers } = await supabase
    .from('suppliers')
    .select('*')
    .eq('shop_id', user.shop_id!)
    .eq('is_active', true)
    .order('name');

  // 2. Fetch purchases with join
  let query = supabase
    .from('purchases')
    .select(`
      id, shop_id, supplier_id, total_amount, notes, purchase_date, created_by, created_at,
      suppliers(id, name, company, phone),
      purchase_items(
        id, product_id, quantity, unit_price, total_price,
        products(name, model),
        imei_records(id, imei_number)
      )
    `, { count: 'exact' })
    .eq('shop_id', user.shop_id!)
    .order('purchase_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (supplierId) {
    query = query.eq('supplier_id', supplierId);
  }

  if (search) {
    query = query.or(`notes.ilike.%${search}%,purchase_date.ilike.%${search}%`);
  }

  const from = (page - 1) * perPage;
  query = query.range(from, from + perPage - 1);

  const { data: rawPurchases, count } = await query;

  // Total procurement spend
  const { data: totalSpendData } = await supabase
    .from('purchases')
    .select('total_amount')
    .eq('shop_id', user.shop_id!);

  const totalSpend = (totalSpendData || []).reduce((sum, p) => sum + (p.total_amount || 0), 0);

  const purchases = (rawPurchases || []).map((p) => ({
    id: p.id,
    shop_id: p.shop_id,
    supplier_id: p.supplier_id,
    total_amount: p.total_amount,
    notes: p.notes,
    purchase_date: p.purchase_date,
    created_by: p.created_by,
    created_at: p.created_at,
    supplier: (p.suppliers as unknown as Supplier) || undefined,
    items: ((p.purchase_items || []) as unknown as {
      id: string;
      product_id?: string;
      purchase_id?: string;
      quantity: number;
      unit_price: number;
      total_price: number;
      products?: { name: string; model: string | null } | null;
      imei_records?: { id: string; imei_number: string }[];
    }[]).map((it) => ({
      id: it.id,
      product_id: it.product_id,
      purchase_id: it.purchase_id,
      quantity: it.quantity,
      unit_price: it.unit_price,
      total_price: it.total_price,
      product: it.products || null,
      imei_records: it.imei_records || [],
    })),
  }));

  const totalPages = Math.ceil((count || 0) / perPage);

  return (
    <PurchasesClient
      purchases={purchases}
      suppliers={suppliers || []}
      totalSpend={totalSpend}
      totalCount={count || 0}
      currentPage={page}
      totalPages={totalPages}
      userRole={user.role}
      search={search}
      selectedSupplier={supplierId}
    />
  );
}
