'use server';

import { createClient } from '@/lib/supabase/server';
import { requireShopAccess, hasPermission } from '@/lib/auth';
import { productSchema, productCategorySchema, brandSchema } from '@/lib/validations';
import { revalidatePath } from 'next/cache';

// ---- Products ----

export async function createProduct(formData: FormData) {
  const user = await requireShopAccess();
  if (!hasPermission(user.role, 'products:create')) {
    return { error: 'You do not have permission to create products.' };
  }

  const raw = {
    name: formData.get('name') as string,
    category_id: (formData.get('category_id') as string) || undefined,
    brand_id: (formData.get('brand_id') as string) || undefined,
    model: (formData.get('model') as string) || undefined,
    is_imei_tracked: formData.get('is_imei_tracked') === 'true',
    sale_price: Number(formData.get('sale_price')) || 0,
    purchase_price: Number(formData.get('purchase_price')) || 0,
    stock_quantity: Number(formData.get('stock_quantity')) || 0,
    low_stock_threshold: Number(formData.get('low_stock_threshold')) || 5,
  };

  const result = productSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const supabase = await createClient();

  if (result.data.category_id) {
    const { data: cat } = await supabase
      .from('product_categories')
      .select('id')
      .eq('id', result.data.category_id)
      .eq('shop_id', user.shop_id!)
      .single();
    if (!cat) return { error: 'Invalid product category for this shop.' };
  }

  if (result.data.brand_id) {
    const { data: brand } = await supabase
      .from('brands')
      .select('id')
      .eq('id', result.data.brand_id)
      .eq('shop_id', user.shop_id!)
      .single();
    if (!brand) return { error: 'Invalid brand for this shop.' };
  }

  // Convert prices to paisas for storage
  const { error } = await supabase.from('products').insert({
    shop_id: user.shop_id,
    name: result.data.name,
    category_id: result.data.category_id || null,
    brand_id: result.data.brand_id || null,
    model: result.data.model || null,
    is_imei_tracked: result.data.is_imei_tracked,
    sale_price: Math.round(result.data.sale_price * 100), // to paisas
    purchase_price: Math.round(result.data.purchase_price * 100),
    stock_quantity: result.data.is_imei_tracked ? 0 : result.data.stock_quantity,
    low_stock_threshold: result.data.low_stock_threshold,
  });

  if (error) {
    console.error('Create product error:', error);
    return { error: 'Failed to create product. Please try again.' };
  }

  revalidatePath('/products');
  return { success: true };
}

export async function updateProduct(id: string, formData: FormData) {
  const user = await requireShopAccess();
  if (!hasPermission(user.role, 'products:edit')) {
    return { error: 'You do not have permission to edit products.' };
  }

  const raw = {
    name: formData.get('name') as string,
    category_id: (formData.get('category_id') as string) || undefined,
    brand_id: (formData.get('brand_id') as string) || undefined,
    model: (formData.get('model') as string) || undefined,
    is_imei_tracked: formData.get('is_imei_tracked') === 'true',
    sale_price: Number(formData.get('sale_price')) || 0,
    purchase_price: Number(formData.get('purchase_price')) || 0,
    stock_quantity: Number(formData.get('stock_quantity')) || 0,
    low_stock_threshold: Number(formData.get('low_stock_threshold')) || 5,
  };

  const result = productSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const supabase = await createClient();

  if (result.data.category_id) {
    const { data: cat } = await supabase
      .from('product_categories')
      .select('id')
      .eq('id', result.data.category_id)
      .eq('shop_id', user.shop_id!)
      .single();
    if (!cat) return { error: 'Invalid product category for this shop.' };
  }

  if (result.data.brand_id) {
    const { data: brand } = await supabase
      .from('brands')
      .select('id')
      .eq('id', result.data.brand_id)
      .eq('shop_id', user.shop_id!)
      .single();
    if (!brand) return { error: 'Invalid brand for this shop.' };
  }

  const { error } = await supabase
    .from('products')
    .update({
      name: result.data.name,
      category_id: result.data.category_id || null,
      brand_id: result.data.brand_id || null,
      model: result.data.model || null,
      is_imei_tracked: result.data.is_imei_tracked,
      sale_price: Math.round(result.data.sale_price * 100),
      purchase_price: Math.round(result.data.purchase_price * 100),
      stock_quantity: result.data.is_imei_tracked ? 0 : result.data.stock_quantity,
      low_stock_threshold: result.data.low_stock_threshold,
    })
    .eq('id', id)
    .eq('shop_id', user.shop_id!);

  if (error) {
    console.error('Update product error:', error);
    return { error: 'Failed to update product. Please try again.' };
  }

  revalidatePath('/products');
  return { success: true };
}

export async function deleteProduct(id: string) {
  const user = await requireShopAccess();
  if (!hasPermission(user.role, 'products:delete')) {
    return { error: 'You do not have permission to delete products.' };
  }

  const supabase = await createClient();

  // Soft delete — mark as inactive
  const { error } = await supabase
    .from('products')
    .update({ is_active: false })
    .eq('id', id)
    .eq('shop_id', user.shop_id!);

  if (error) {
    console.error('Delete product error:', error);
    return { error: 'Failed to delete product. Please try again.' };
  }

  revalidatePath('/products');
  return { success: true };
}

// ---- Categories ----

export async function createCategory(formData: FormData) {
  const user = await requireShopAccess();
  if (!hasPermission(user.role, 'categories:manage')) {
    return { error: 'You do not have permission to manage categories.' };
  }

  const raw = {
    name: formData.get('name') as string,
    description: (formData.get('description') as string) || undefined,
  };

  const result = productCategorySchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const supabase = await createClient();

  const { error } = await supabase.from('product_categories').insert({
    shop_id: user.shop_id,
    name: result.data.name,
    description: result.data.description || null,
  });

  if (error) {
    if (error.code === '23505') {
      return { error: 'A category with this name already exists.' };
    }
    console.error('Create category error:', error);
    return { error: 'Failed to create category. Please try again.' };
  }

  revalidatePath('/products/categories');
  revalidatePath('/products');
  return { success: true };
}

export async function updateCategory(id: string, formData: FormData) {
  const user = await requireShopAccess();
  if (!hasPermission(user.role, 'categories:manage')) {
    return { error: 'You do not have permission to manage categories.' };
  }

  const raw = {
    name: formData.get('name') as string,
    description: (formData.get('description') as string) || undefined,
  };

  const result = productCategorySchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from('product_categories')
    .update({
      name: result.data.name,
      description: result.data.description || null,
    })
    .eq('id', id)
    .eq('shop_id', user.shop_id!);

  if (error) {
    if (error.code === '23505') {
      return { error: 'A category with this name already exists.' };
    }
    return { error: 'Failed to update category.' };
  }

  revalidatePath('/products/categories');
  revalidatePath('/products');
  return { success: true };
}

export async function deleteCategory(id: string) {
  const user = await requireShopAccess();
  if (!hasPermission(user.role, 'categories:manage')) {
    return { error: 'You do not have permission to manage categories.' };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from('product_categories')
    .delete()
    .eq('id', id)
    .eq('shop_id', user.shop_id!);

  if (error) {
    if (error.code === '23503') {
      return { error: 'Cannot delete — products are using this category.' };
    }
    return { error: 'Failed to delete category.' };
  }

  revalidatePath('/products/categories');
  return { success: true };
}

// ---- Brands ----

export async function createBrand(formData: FormData) {
  const user = await requireShopAccess();
  if (!hasPermission(user.role, 'brands:manage')) {
    return { error: 'You do not have permission to manage brands.' };
  }

  const raw = { name: formData.get('name') as string };

  const result = brandSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const supabase = await createClient();

  const { error } = await supabase.from('brands').insert({
    shop_id: user.shop_id,
    name: result.data.name,
  });

  if (error) {
    if (error.code === '23505') {
      return { error: 'A brand with this name already exists.' };
    }
    return { error: 'Failed to create brand.' };
  }

  revalidatePath('/products/brands');
  revalidatePath('/products');
  return { success: true };
}

export async function updateBrand(id: string, formData: FormData) {
  const user = await requireShopAccess();
  if (!hasPermission(user.role, 'brands:manage')) {
    return { error: 'You do not have permission to manage brands.' };
  }

  const raw = { name: formData.get('name') as string };

  const result = brandSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from('brands')
    .update({ name: result.data.name })
    .eq('id', id)
    .eq('shop_id', user.shop_id!);

  if (error) {
    if (error.code === '23505') {
      return { error: 'A brand with this name already exists.' };
    }
    return { error: 'Failed to update brand.' };
  }

  revalidatePath('/products/brands');
  revalidatePath('/products');
  return { success: true };
}

export async function deleteBrand(id: string) {
  const user = await requireShopAccess();
  if (!hasPermission(user.role, 'brands:manage')) {
    return { error: 'You do not have permission to manage brands.' };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from('brands')
    .delete()
    .eq('id', id)
    .eq('shop_id', user.shop_id!);

  if (error) {
    if (error.code === '23503') {
      return { error: 'Cannot delete — products are using this brand.' };
    }
    return { error: 'Failed to delete brand.' };
  }

  revalidatePath('/products/brands');
  return { success: true };
}
