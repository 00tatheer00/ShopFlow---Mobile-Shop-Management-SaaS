import type { Metadata } from 'next';
import { requireShopAccess } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { CategoriesClient } from './categories-client';

export const metadata: Metadata = { title: 'Product Categories' };

export default async function CategoriesPage() {
  const user = await requireShopAccess();
  const supabase = await createClient();

  const { data: categories } = await supabase
    .from('product_categories')
    .select(`
      *,
      products (count)
    `)
    .eq('shop_id', user.shop_id!)
    .order('name');

  interface CategoryWithCount {
    id: string;
    name: string;
    description: string | null;
    shop_id: string;
    created_at: string;
    products?: { count: number }[];
  }

  const mapped = ((categories as unknown as CategoryWithCount[]) || []).map((c) => ({
    ...c,
    product_count: c.products?.[0]?.count || 0,
  }));

  return <CategoriesClient categories={mapped} userRole={user.role} />;
}
