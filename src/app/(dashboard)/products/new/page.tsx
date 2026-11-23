import type { Metadata } from 'next';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { ProductForm } from './product-form';

export const metadata: Metadata = { title: 'Add New Product' };

export default async function NewProductPage() {
  const user = await requireRole(['shop_owner', 'manager']);
  const supabase = await createClient();

  const [{ data: categories }, { data: brands }] = await Promise.all([
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
  ]);

  return (
    <ProductForm
      categories={categories || []}
      brands={brands || []}
    />
  );
}
