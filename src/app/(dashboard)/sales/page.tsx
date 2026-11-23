import type { Metadata } from 'next';
import { requireShopAccess } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { fetchAllRows, getLatestUdhaarBalances, sanitizeSearch } from '@/lib/supabase/queries';
import { pktTodayRange } from '@/lib/time';
import { SalesClient } from './sales-client';
import type { Customer } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Sales History',
};

export default async function SalesPage(props: {
  searchParams: Promise<{ search?: string; status?: string; page?: string }>;
}) {
  const user = await requireShopAccess();
  const supabase = await createClient();
  const searchParams = await props.searchParams;

  const search = sanitizeSearch(searchParams.search);
  const status = ['completed', 'cancelled'].includes(searchParams.status || '') ? searchParams.status! : '';
  const page = Math.max(1, Math.floor(Number(searchParams.page)) || 1);
  const perPage = 20;

  // Build query
  let query = supabase
    .from('sales')
    .select(`
      id, shop_id, customer_id, invoice_number, subtotal, discount, total_amount,
      amount_paid, amount_due, payment_method, status, notes, created_by, created_at,
      customers(id, name, phone, address),
      sale_items(
        id, product_id, quantity, unit_price, total_price,
        products(name, model),
        imei_records(imei_number)
      )
    `, { count: 'exact' })
    .eq('shop_id', user.shop_id!)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  if (search) {
    query = query.ilike('invoice_number', `%${search}%`);
  }

  const from = (page - 1) * perPage;
  query = query.range(from, from + perPage - 1);

  // Aggregate metrics concurrently. "Today" = Pakistan day.
  const { start: todayStart, end: todayEnd } = pktTodayRange();

  const [{ data: rawSales, count }, revenueRows, { count: todayCount }, { data: shop }, balances] = await Promise.all([
    query,
    fetchAllRows<{ total_amount: number }>(() =>
      supabase
        .from('sales')
        .select('total_amount')
        .eq('shop_id', user.shop_id!)
        .eq('status', 'completed')
        .order('created_at', { ascending: true })
    ),
    supabase
      .from('sales')
      .select('id', { count: 'exact', head: true })
      .eq('shop_id', user.shop_id!)
      .gte('created_at', todayStart)
      .lt('created_at', todayEnd),
    supabase
      .from('shops')
      .select('name, phone, address')
      .eq('id', user.shop_id!)
      .maybeSingle(),
    getLatestUdhaarBalances(supabase, user.shop_id!),
  ]);

  const totalRevenue = revenueRows.reduce((sum, s) => sum + (s.total_amount || 0), 0);
  // Real outstanding udhaar today (falls as customers pay), not original invoice dues
  let totalUdhaarDue = 0;
  for (const b of balances.values()) {
    if (b.balance_after > 0) totalUdhaarDue += b.balance_after;
  }
  const todaySalesCount = todayCount || 0;

  const sales = (rawSales || []).map((s) => ({
    id: s.id,
    shop_id: s.shop_id,
    customer_id: s.customer_id,
    invoice_number: s.invoice_number,
    subtotal: s.subtotal,
    discount: s.discount,
    total_amount: s.total_amount,
    amount_paid: s.amount_paid,
    amount_due: s.amount_due,
    payment_method: s.payment_method,
    status: s.status,
    notes: s.notes,
    created_by: s.created_by,
    created_at: s.created_at,
    customer: (s.customers as unknown as Customer) || undefined,
    sale_items: ((s.sale_items || []) as unknown as {
      id: string;
      product_id: string;
      quantity: number;
      unit_price: number;
      total_price: number;
      products?: { name: string; model: string | null } | null;
      imei_records?: { imei_number: string } | null;
    }[]).map((item) => ({
      id: item.id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price,
      product: item.products || null,
      imei: item.imei_records?.imei_number || null,
    })),
  }));

  const totalPages = Math.ceil((count || 0) / perPage);

  return (
    <SalesClient
      sales={sales}
      totalRevenue={totalRevenue}
      todaySalesCount={todaySalesCount}
      totalUdhaarDue={totalUdhaarDue}
      userRole={user.role}
      currentPage={page}
      totalPages={totalPages}
      totalCount={count || 0}
      search={search}
      statusFilter={status}
      shopName={shop?.name || 'ShopFlow Mobile'}
      shopPhone={shop?.phone || null}
      shopAddress={shop?.address || null}
    />
  );
}
