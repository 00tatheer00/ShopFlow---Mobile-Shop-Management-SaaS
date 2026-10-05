'use server';

import { createClient } from '@/lib/supabase/server';
import { requireShopAccess, hasPermission } from '@/lib/auth';
import { createPurchaseSchema } from '@/lib/validations';
import { toPaisas } from '@/lib/types';
import { revalidatePath } from 'next/cache';

interface CreatePurchasePayload {
  supplier_id: string;
  items: {
    product_id: string;
    quantity: number;
    unit_price: number; // in rupees
    imei_numbers?: string[];
  }[];
  purchase_date: string;
  notes?: string;
}

export async function createPurchase(payload: CreatePurchasePayload) {
  const user = await requireShopAccess();
  if (!hasPermission(user.role, 'purchases:create')) {
    return { error: 'You do not have permission to record purchases.' };
  }

  const result = createPurchaseSchema.safeParse(payload);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const supabase = await createClient();

  // 1. Verify Supplier belongs to this shop
  const { data: supplier } = await supabase
    .from('suppliers')
    .select('id, is_active')
    .eq('id', result.data.supplier_id)
    .eq('shop_id', user.shop_id!)
    .single();

  if (!supplier) {
    return { error: 'Supplier not found or does not belong to this shop.' };
  }

  // 2. Verify all products belong to this shop and collect IMEIs
  const allImeis: string[] = [];
  for (const item of result.data.items) {
    const { data: product } = await supabase
      .from('products')
      .select('id, is_imei_tracked')
      .eq('id', item.product_id)
      .eq('shop_id', user.shop_id!)
      .single();

    if (!product) {
      return { error: 'One or more products do not belong to this shop.' };
    }

    if (item.imei_numbers && item.imei_numbers.length > 0) {
      const cleaned = item.imei_numbers.map((n) => n.trim()).filter(Boolean);
      allImeis.push(...cleaned);
    }
  }

  // 3. Pre-check for duplicate IMEIs across the entire shop
  if (allImeis.length > 0) {
    const { data: existingImeis } = await supabase
      .from('imei_records')
      .select('imei_number')
      .eq('shop_id', user.shop_id!)
      .in('imei_number', allImeis);

    if (existingImeis && existingImeis.length > 0) {
      return {
        error: `The following IMEI(s) already exist in your inventory: ${existingImeis.map((i) => i.imei_number).join(', ')}.`,
      };
    }
  }

  // Calculate total purchase amount in paisas
  let totalAmountPaisas = 0;
  result.data.items.forEach((item) => {
    totalAmountPaisas += toPaisas(item.quantity * item.unit_price);
  });

  // 4. Insert Purchase
  const { data: purchase, error: purchaseError } = await supabase
    .from('purchases')
    .insert({
      shop_id: user.shop_id,
      supplier_id: result.data.supplier_id,
      total_amount: totalAmountPaisas,
      purchase_date: result.data.purchase_date,
      notes: result.data.notes || null,
      created_by: user.id,
    })
    .select('id')
    .single();

  if (purchaseError || !purchase) {
    console.error('Purchase create error:', purchaseError);
    return { error: 'Failed to record purchase.' };
  }

  // 2. Insert items, update product stock, and insert IMEIs
  for (const item of result.data.items) {
    const itemTotalPaisas = toPaisas(item.quantity * item.unit_price);

    const { data: purchaseItem, error: itemError } = await supabase
      .from('purchase_items')
      .insert({
        purchase_id: purchase.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: toPaisas(item.unit_price),
        total_price: itemTotalPaisas,
      })
      .select('id')
      .single();

    if (itemError) {
      console.error('Purchase item error:', itemError);
      continue;
    }

    // Increment stock quantity & update purchase price in products
    const { data: existingProduct } = await supabase
      .from('products')
      .select('stock_quantity')
      .eq('id', item.product_id)
      .single();

    if (existingProduct) {
      await supabase
        .from('products')
        .update({
          stock_quantity: (existingProduct.stock_quantity || 0) + item.quantity,
          purchase_price: toPaisas(item.unit_price),
        })
        .eq('id', item.product_id);
    }

    // Insert IMEIs if tracked
    if (item.imei_numbers && item.imei_numbers.length > 0) {
      const imeiRows = item.imei_numbers
        .map((num) => num.trim())
        .filter((num) => num.length > 0)
        .map((imeiNumber) => ({
          shop_id: user.shop_id,
          product_id: item.product_id,
          imei_number: imeiNumber,
          status: 'in_stock',
          purchase_item_id: purchaseItem.id,
        }));

      if (imeiRows.length > 0) {
        const { error: imeiError } = await supabase.from('imei_records').insert(imeiRows);
        if (imeiError) {
          console.error('IMEI insert error:', imeiError);
        }
      }
    }
  }

  revalidatePath('/purchases');
  revalidatePath('/products');
  revalidatePath('/dashboard');

  return { success: true, purchaseId: purchase.id };
}

export async function deletePurchase(purchaseId: string) {
  const user = await requireShopAccess();
  if (user.role !== 'shop_owner') {
    return { error: 'Only the shop owner can delete purchase records.' };
  }

  const supabase = await createClient();

  // Fetch purchase and items
  const { data: purchase } = await supabase
    .from('purchases')
    .select(`
      id, shop_id,
      purchase_items (id, product_id, quantity)
    `)
    .eq('id', purchaseId)
    .eq('shop_id', user.shop_id!)
    .single();

  if (!purchase) {
    return { error: 'Purchase record not found.' };
  }

  // Check if any IMEI associated with this purchase has been sold
  const purchaseItemIds = purchase.purchase_items?.map((i) => i.id) || [];
  if (purchaseItemIds.length > 0) {
    const { data: soldImeis } = await supabase
      .from('imei_records')
      .select('imei_number')
      .in('purchase_item_id', purchaseItemIds)
      .eq('status', 'sold')
      .limit(1);

    if (soldImeis && soldImeis.length > 0) {
      return {
        error: `Cannot delete purchase because device with IMEI ${soldImeis[0].imei_number} has already been sold.`,
      };
    }
  }

  // Reverse stock for items
  if (purchase.purchase_items) {
    for (const item of purchase.purchase_items) {
      const { data: prod } = await supabase
        .from('products')
        .select('stock_quantity')
        .eq('id', item.product_id)
        .single();

      if (prod) {
        await supabase
          .from('products')
          .update({
            stock_quantity: Math.max(0, (prod.stock_quantity || 0) - item.quantity),
          })
          .eq('id', item.product_id);
      }
    }
  }

  // Delete purchase (cascades purchase_items)
  const { error } = await supabase
    .from('purchases')
    .delete()
    .eq('id', purchaseId)
    .eq('shop_id', user.shop_id!);

  if (error) {
    return { error: 'Failed to delete purchase record.' };
  }

  revalidatePath('/purchases');
  revalidatePath('/products');
  revalidatePath('/dashboard');

  return { success: true };
}
