import type { Metadata } from 'next';
import { requireShopAccess } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { BrandsClient } from './brands-client';

export const metadata: Metadata = { title: 'Brands' };

export default async function BrandsPage() {
  const user = await requireShopAccess();
  const supabase = await createClient();

  const { data: brands } = await supabase
    .from('brands')
    .select(`
      *,
      products (count)
    `)
    .eq('shop_id', user.shop_id!)
    .order('name');

  interface BrandWithCount {
    id: string;
    name: string;
    logo_url: string | null;
    shop_id: string;
    created_at: string;
    products?: { count: number }[];
  }

  const mapped = ((brands as unknown as BrandWithCount[]) || []).map((b) => ({
    ...b,
    product_count: b.products?.[0]?.count || 0,
  }));

  return <BrandsClient brands={mapped} userRole={user.role} />;
}
