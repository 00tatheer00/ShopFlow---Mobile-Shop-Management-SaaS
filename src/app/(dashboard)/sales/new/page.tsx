import type { Metadata } from 'next';
import { requireShopAccess } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { PosTerminal } from './pos-terminal';

export const metadata: Metadata = { title: 'New Sale (POS)' };

export default async function NewSalePage() {
  const user = await requireShopAccess();
  const supabase = await createClient();

  // 1. Fetch active products with in_stock IMEI records
  const { data: products } = await supabase
    .from('products')
    .select(`
      *,
      imei_records(id, imei_number, status)
    `)
    .eq('shop_id', user.shop_id!)
    .eq('is_active', true)
    .order('name');

  // 2. Fetch active customers
  const { data: customers } = await supabase
    .from('customers')
    .select('*')
    .eq('shop_id', user.shop_id!)
    .eq('is_active', true)
    .order('name');

  // 3. Fetch categories and brands
  const [{ data: categories }, { data: brands }, { data: shop }] = await Promise.all([
    supabase
      .from('product_categories')
      .select('*')
      .eq('shop_id', user.shop_id!)
      .order('name'),
    supabase
      .from('brands')
      .select('*')
      .eq('shop_id', user.shop_id!)
      .order('name'),
    supabase
      .from('shops')
      .select('name')
      .eq('id', user.shop_id!)
      .single(),
  ]);

  const activeProducts = (products || []).map((p) => ({
    ...p,
    imei_records: ((p.imei_records as Array<{ id: string; imei_number: string; status: string }>) || []).filter(
      (i) => i.status === 'in_stock'
    ),
  }));

  return (
    <PosTerminal
      products={activeProducts}
      customers={customers || []}
      categories={categories || []}
      brands={brands || []}
      shopName={shop?.name || 'Mobile Shop'}
    />
  );
}
