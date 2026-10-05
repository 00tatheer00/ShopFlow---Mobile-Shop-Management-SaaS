import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireShopAccess } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { ProductForm } from '../../new/product-form';

export const metadata: Metadata = { title: 'Edit Product' };

export default async function EditProductPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const user = await requireShopAccess();
  const supabase = await createClient();

  const [{ data: product }, { data: categories }, { data: brands }] = await Promise.all([
    supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .eq('shop_id', user.shop_id!)
      .single(),
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

  if (!product) {
    notFound();
  }

  return (
    <ProductForm
      initialProduct={product}
      categories={categories || []}
      brands={brands || []}
    />
  );
}
