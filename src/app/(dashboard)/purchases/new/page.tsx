import type { Metadata } from 'next';
import { requireShopAccess } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { PurchaseForm } from './purchase-form';

export const metadata: Metadata = { title: 'New Purchase' };

export default async function NewPurchasePage() {
  const user = await requireShopAccess();
  const supabase = await createClient();

  // Fetch suppliers and products concurrently in a single round-trip
  const [{ data: suppliers }, { data: products }] = await Promise.all([
    supabase
      .from('suppliers')
      .select('*')
      .eq('shop_id', user.shop_id!)
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('products')
      .select('*')
      .eq('shop_id', user.shop_id!)
      .eq('is_active', true)
      .order('name'),
  ]);

  return (
    <PurchaseForm
      suppliers={suppliers || []}
      products={products || []}
    />
  );
}
