import type { Metadata } from 'next';
import { requireShopAccess } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { PurchaseForm } from './purchase-form';

export const metadata: Metadata = { title: 'New Purchase' };

export default async function NewPurchasePage() {
  const user = await requireShopAccess();
  const supabase = await createClient();

  // 1. Fetch suppliers
  const { data: suppliers } = await supabase
    .from('suppliers')
    .select('*')
    .eq('shop_id', user.shop_id!)
    .eq('is_active', true)
    .order('name');

  // 2. Fetch products
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('shop_id', user.shop_id!)
    .eq('is_active', true)
    .order('name');

  return (
    <PurchaseForm
      suppliers={suppliers || []}
      products={products || []}
    />
  );
}
