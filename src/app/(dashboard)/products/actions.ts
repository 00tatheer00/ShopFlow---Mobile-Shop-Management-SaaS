'use server';

import { createClient } from '@/lib/supabase/server';
import { requireShopAccess, hasPermission } from '@/lib/auth';
import {
  productSchema,
  productCategorySchema,
  brandSchema,
  stockAdjustmentSchema,
} from '@/lib/validations';
import { revalidatePath } from 'next/cache';

// ---- Products ----

export async function createProduct(formData: FormData) {
  const user = await requireShopAccess();
  if (!hasPermission(user.role, 'products:create')) {
    return { error: 'You do not have permission to create products.' };
  }

  const raw = {
    name: (formData.get('name') as string)?.trim(),
    category_id: (formData.get('category_id') as string) || undefined,
    brand_id: (formData.get('brand_id') as string) || undefined,
    model: (formData.get('model') as string)?.trim() || undefined,
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

  // Check for duplicate active product with the exact same name in this shop
  const { data: duplicate } = await supabase
    .from('products')
    .select('id')
    .eq('shop_id', user.shop_id!)
    .ilike('name', result.data.name)
    .eq('is_active', true)
    .maybeSingle();

  if (duplicate) {
    return { error: `A product named "${result.data.name}" already exists in your inventory.` };
  }

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
  // IMEI-tracked products must always start with 0 stock (stocked via purchases / IMEI inwarding)
  const initialStock = result.data.is_imei_tracked ? 0 : Math.max(0, result.data.stock_quantity);

  const { data: insertedProduct, error } = await supabase
    .from('products')
    .insert({
      shop_id: user.shop_id,
      name: result.data.name,
      category_id: result.data.category_id || null,
      brand_id: result.data.brand_id || null,
      model: result.data.model || null,
      is_imei_tracked: result.data.is_imei_tracked,
      sale_price: Math.round(result.data.sale_price * 100), // to paisas
      purchase_price: Math.round(result.data.purchase_price * 100),
      stock_quantity: initialStock,
      low_stock_threshold: result.data.low_stock_threshold,
      is_active: true,
    })
    .select('id, name')
    .single();

  if (error || !insertedProduct) {
    console.error('Create product error:', error);
    return { error: 'Failed to create product. Please try again.' };
  }

  // Audit log
  await supabase.from('audit_logs').insert({
    shop_id: user.shop_id,
    user_id: user.id,
    action: 'product_create',
    entity_type: 'product',
    entity_id: insertedProduct.id,
    metadata: {
      product_name: insertedProduct.name,
      is_imei_tracked: result.data.is_imei_tracked,
      sale_price: result.data.sale_price,
    },
  });

  revalidatePath('/products');
  return { success: true, productId: insertedProduct.id };
}

export async function updateProduct(id: string, formData: FormData) {
  const user = await requireShopAccess();
  if (!hasPermission(user.role, 'products:edit')) {
    return { error: 'You do not have permission to edit products.' };
  }

  const raw = {
    name: (formData.get('name') as string)?.trim(),
    category_id: (formData.get('category_id') as string) || undefined,
    brand_id: (formData.get('brand_id') as string) || undefined,
    model: (formData.get('model') as string)?.trim() || undefined,
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

  // 1. Fetch existing product to verify ownership and validate state transitions
  const { data: existing } = await supabase
    .from('products')
    .select('id, name, is_imei_tracked, stock_quantity')
    .eq('id', id)
    .eq('shop_id', user.shop_id!)
    .single();

  if (!existing) {
    return { error: 'Product not found or does not belong to your shop.' };
  }

  // 2. Safe IMEI mode transitions
  if (existing.is_imei_tracked && !result.data.is_imei_tracked) {
    // Attempting to disable IMEI tracking: check if any IMEI records exist
    const { count: imeiCount } = await supabase
      .from('imei_records')
      .select('id', { count: 'exact', head: true })
      .eq('product_id', id)
      .eq('shop_id', user.shop_id!);

    if (imeiCount && imeiCount > 0) {
      return {
        error: `Cannot disable IMEI tracking: ${imeiCount} IMEI record(s) exist for this device. Disabling would corrupt serial tracking.`,
      };
    }
  }

  if (!existing.is_imei_tracked && result.data.is_imei_tracked) {
    // Attempting to enable IMEI tracking on non-tracked product: check existing stock
    if (existing.stock_quantity > 0) {
      return {
        error: `Cannot enable IMEI tracking while non-IMEI stock (${existing.stock_quantity} units) exists. Please adjust stock to 0 first or create a separate tracked product.`,
      };
    }
  }

  // Check duplicate product name if renamed
  if (result.data.name.toLowerCase() !== existing.name.toLowerCase()) {
    const { data: duplicate } = await supabase
      .from('products')
      .select('id')
      .eq('shop_id', user.shop_id!)
      .ilike('name', result.data.name)
      .eq('is_active', true)
      .neq('id', id)
      .maybeSingle();

    if (duplicate) {
      return { error: `Another active product named "${result.data.name}" already exists.` };
    }
  }

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

  // Preserve existing stock quantity! Stock adjustments must go through adjustStock or Purchases/Sales
  const updatedStock = existing.is_imei_tracked
    ? existing.stock_quantity
    : existing.stock_quantity;

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
      stock_quantity: updatedStock,
      low_stock_threshold: result.data.low_stock_threshold,
    })
    .eq('id', id)
    .eq('shop_id', user.shop_id!);

  if (error) {
    console.error('Update product error:', error);
    return { error: 'Failed to update product. Please try again.' };
  }

  // Audit log
  await supabase.from('audit_logs').insert({
    shop_id: user.shop_id,
    user_id: user.id,
    action: 'product_update',
    entity_type: 'product',
    entity_id: id,
    metadata: {
      name: result.data.name,
      sale_price: result.data.sale_price,
    },
  });

  revalidatePath('/products');
  return { success: true };
}

export async function deleteProduct(id: string) {
  const user = await requireShopAccess();
  if (!hasPermission(user.role, 'products:delete')) {
    return { error: 'You do not have permission to delete products.' };
  }

  const supabase = await createClient();

  // 1. Verify product ownership and check integrity dependencies
  const { data: product } = await supabase
    .from('products')
    .select('id, name, stock_quantity')
    .eq('id', id)
    .eq('shop_id', user.shop_id!)
    .single();

  if (!product) {
    return { error: 'Product not found.' };
  }

  // Check IMEIs
  const { count: imeiCount } = await supabase
    .from('imei_records')
    .select('id', { count: 'exact', head: true })
    .eq('product_id', id)
    .eq('shop_id', user.shop_id!);

  // Check sales history
  const { count: saleCount } = await supabase
    .from('sale_items')
    .select('id', { count: 'exact', head: true })
    .eq('product_id', id);

  // Check purchase history
  const { count: purchaseCount } = await supabase
    .from('purchase_items')
    .select('id', { count: 'exact', head: true })
    .eq('product_id', id);

  const hasHistory = (saleCount && saleCount > 0) || (purchaseCount && purchaseCount > 0);
  const hasInventory = product.stock_quantity > 0 || (imeiCount && imeiCount > 0);

  if (hasHistory || hasInventory) {
    // Unsafe for permanent deletion — deactivate/archive instead to protect ledger and history
    const { error: archiveError } = await supabase
      .from('products')
      .update({ is_active: false })
      .eq('id', id)
      .eq('shop_id', user.shop_id!);

    if (archiveError) {
      return { error: 'Failed to archive product.' };
    }

    await supabase.from('audit_logs').insert({
      shop_id: user.shop_id,
      user_id: user.id,
      action: 'product_archive',
      entity_type: 'product',
      entity_id: id,
      metadata: {
        product_name: product.name,
        stock_quantity: product.stock_quantity,
        imei_count: imeiCount || 0,
        sale_count: saleCount || 0,
        purchase_count: purchaseCount || 0,
        reason: 'Archived due to historical records or remaining stock',
      },
    });

    revalidatePath('/products');
    return {
      success: true,
      archived: true,
      message: `"${product.name}" has historical transactions or stock. It has been deactivated and archived instead of permanently deleted.`,
    };
  }

  // Safe for hard permanent delete (no history, no stock, no IMEIs)
  const { error: deleteError } = await supabase
    .from('products')
    .delete()
    .eq('id', id)
    .eq('shop_id', user.shop_id!);

  if (deleteError) {
    console.error('Delete product error:', deleteError);
    return { error: 'Failed to delete product.' };
  }

  await supabase.from('audit_logs').insert({
    shop_id: user.shop_id,
    user_id: user.id,
    action: 'product_delete',
    entity_type: 'product',
    entity_id: id,
    metadata: { product_name: product.name },
  });

  revalidatePath('/products');
  return { success: true, deleted: true, message: `Product "${product.name}" permanently deleted.` };
}

export async function toggleProductStatus(id: string, isActive: boolean) {
  const user = await requireShopAccess();
  if (!hasPermission(user.role, 'products:edit')) {
    return { error: 'You do not have permission to change product status.' };
  }

  const supabase = await createClient();

  const { data: product } = await supabase
    .from('products')
    .select('id, name')
    .eq('id', id)
    .eq('shop_id', user.shop_id!)
    .single();

  if (!product) {
    return { error: 'Product not found.' };
  }

  const { error } = await supabase
    .from('products')
    .update({ is_active: isActive })
    .eq('id', id)
    .eq('shop_id', user.shop_id!);

  if (error) {
    return { error: 'Failed to update product status.' };
  }

  await supabase.from('audit_logs').insert({
    shop_id: user.shop_id,
    user_id: user.id,
    action: isActive ? 'product_activate' : 'product_deactivate',
    entity_type: 'product',
    entity_id: id,
    metadata: { product_name: product.name, is_active: isActive },
  });

  revalidatePath('/products');
  return { success: true, is_active: isActive };
}

// ---- Stock Adjustments (Section 13) ----

export async function adjustStock(payload: {
  product_id: string;
  adjustment: number;
  reason: string;
}) {
  const user = await requireShopAccess();
  if (!hasPermission(user.role, 'products:edit')) {
    return { error: 'Only shop owners and managers can perform manual stock adjustments.' };
  }

  const result = stockAdjustmentSchema.safeParse(payload);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const supabase = await createClient();

  // 1. Fetch product & verify tenant ownership
  const { data: product } = await supabase
    .from('products')
    .select('id, name, stock_quantity, is_imei_tracked')
    .eq('id', result.data.product_id)
    .eq('shop_id', user.shop_id!)
    .single();

  if (!product) {
    return { error: 'Product not found in your shop.' };
  }

  // IMEI products cannot be manually stock-adjusted by arbitrary numbers
  if (product.is_imei_tracked) {
    return {
      error: 'Manual numerical stock adjustment is not allowed for IMEI-tracked devices. Please record a purchase or disposal with specific 15-digit IMEIs.',
    };
  }

  const oldStock = product.stock_quantity || 0;
  const newStock = oldStock + result.data.adjustment;

  if (newStock < 0) {
    return {
      error: `Stock cannot become negative. Current stock is ${oldStock}, adjustment requested is ${result.data.adjustment}.`,
    };
  }

  // 2. Perform atomic stock update
  const { error: updateError } = await supabase
    .from('products')
    .update({ stock_quantity: newStock })
    .eq('id', product.id)
    .eq('shop_id', user.shop_id!);

  if (updateError) {
    return { error: 'Failed to update stock quantity.' };
  }

  // 3. Record in stock_adjustments table for complete auditability
  await supabase.from('stock_adjustments').insert({
    shop_id: user.shop_id,
    product_id: product.id,
    adjustment: result.data.adjustment,
    old_stock: oldStock,
    new_stock: newStock,
    reason: result.data.reason.trim(),
    created_by: user.id,
  });

  // 4. Record in audit_logs
  await supabase.from('audit_logs').insert({
    shop_id: user.shop_id,
    user_id: user.id,
    action: 'stock_adjustment',
    entity_type: 'product',
    entity_id: product.id,
    metadata: {
      product_name: product.name,
      old_stock: oldStock,
      new_stock: newStock,
      adjustment: result.data.adjustment,
      reason: result.data.reason.trim(),
    },
  });

  revalidatePath('/products');
  revalidatePath('/dashboard');
  return { success: true, oldStock, newStock };
}

// ---- IMEI Search / Lifecycle Lookup (Section 10) ----

export interface ImeiSearchResult {
  id: string;
  imei_number: string;
  status: string;
  created_at: string;
  updated_at: string;
  product: {
    id: string;
    name: string;
    model: string | null;
    brand_name: string | null;
  };
  purchase?: {
    id: string;
    purchase_date: string;
    supplier_name: string | null;
  } | null;
  sale?: {
    id: string;
    invoice_number: string;
    created_at: string;
    customer_name: string | null;
    customer_phone: string | null;
  } | null;
}

export async function searchImei(imeiQuery: string): Promise<{
  error?: string;
  results?: ImeiSearchResult[];
}> {
  const user = await requireShopAccess();
  const trimmed = imeiQuery?.trim();
  if (!trimmed || trimmed.length < 3) {
    return { error: 'Please enter at least 3 digits to search IMEI.' };
  }

  const supabase = await createClient();

  // Tenant-scoped IMEI search
  const { data: records, error } = await supabase
    .from('imei_records')
    .select(`
      id,
      imei_number,
      status,
      created_at,
      updated_at,
      product:products (id, name, model, brand:brands(name)),
      purchase_item:purchase_items (
        id,
        purchase:purchases (id, purchase_date, supplier:suppliers(name))
      ),
      sale_item:sale_items (
        id,
        sale:sales (id, invoice_number, created_at, customer:customers(name, phone))
      )
    `)
    .eq('shop_id', user.shop_id!)
    .ilike('imei_number', `%${trimmed}%`)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('IMEI search error:', error);
    return { error: 'Failed to search IMEI records.' };
  }

  interface RawImeiRecord {
    id: string;
    imei_number: string;
    status: string;
    created_at: string;
    updated_at: string;
    product?: { id?: string; name?: string; model?: string | null; brand?: { name?: string } | null } | null;
    purchase_item?: { purchase?: { id: string; purchase_date: string; supplier?: { name?: string } | null } | null } | null;
    sale_item?: { sale?: { id: string; invoice_number: string; created_at: string; customer?: { name?: string; phone?: string } | null } | null } | null;
  }

  const results: ImeiSearchResult[] = ((records as unknown as RawImeiRecord[]) || []).map((r) => {
    const prod = r.product;
    const purItem = r.purchase_item;
    const sItem = r.sale_item;

    return {
      id: r.id,
      imei_number: r.imei_number,
      status: r.status,
      created_at: r.created_at,
      updated_at: r.updated_at,
      product: {
        id: prod?.id || '',
        name: prod?.name || 'Unknown Product',
        model: prod?.model || null,
        brand_name: prod?.brand?.name || null,
      },
      purchase: purItem?.purchase
        ? {
            id: purItem.purchase.id,
            purchase_date: purItem.purchase.purchase_date,
            supplier_name: purItem.purchase.supplier?.name || null,
          }
        : null,
      sale: sItem?.sale
        ? {
            id: sItem.sale.id,
            invoice_number: sItem.sale.invoice_number,
            created_at: sItem.sale.created_at,
            customer_name: sItem.sale.customer?.name || null,
            customer_phone: sItem.sale.customer?.phone || null,
          }
        : null,
    };
  });

  return { results };
}

// ---- Categories ----

export async function createCategory(formData: FormData) {
  const user = await requireShopAccess();
  if (!hasPermission(user.role, 'categories:manage')) {
    return { error: 'You do not have permission to manage categories.' };
  }

  const raw = {
    name: (formData.get('name') as string)?.trim(),
    description: (formData.get('description') as string)?.trim() || undefined,
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
    name: (formData.get('name') as string)?.trim(),
    description: (formData.get('description') as string)?.trim() || undefined,
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

  // Safety check: verify no products are referencing this category
  const { count: productCount } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('category_id', id)
    .eq('shop_id', user.shop_id!);

  if (productCount && productCount > 0) {
    return {
      error: `Cannot delete category: ${productCount} product(s) are currently assigned to it. Please reassign or delete the products first.`,
    };
  }

  const { error } = await supabase
    .from('product_categories')
    .delete()
    .eq('id', id)
    .eq('shop_id', user.shop_id!);

  if (error) {
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

  const raw = { name: (formData.get('name') as string)?.trim() };

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

  const raw = { name: (formData.get('name') as string)?.trim() };

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

  // Safety check: verify no products are referencing this brand
  const { count: productCount } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('brand_id', id)
    .eq('shop_id', user.shop_id!);

  if (productCount && productCount > 0) {
    return {
      error: `Cannot delete brand: ${productCount} product(s) are currently assigned to it. Please reassign or delete the products first.`,
    };
  }

  const { error } = await supabase
    .from('brands')
    .delete()
    .eq('id', id)
    .eq('shop_id', user.shop_id!);

  if (error) {
    return { error: 'Failed to delete brand.' };
  }

  revalidatePath('/products/brands');
  return { success: true };
}
