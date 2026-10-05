'use server';

import { createClient } from '@/lib/supabase/server';
import { requireShopAccess, hasPermission } from '@/lib/auth';
import { createPurchaseSchema, validateImeiString } from '@/lib/validations';
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

  // 2. Verify all products belong to this shop, check active status, and validate IMEI counts & formats
  const allImeis: string[] = [];
  const productCache = new Map<string, { id: string; name: string; is_imei_tracked: boolean; stock_quantity: number }>();

  for (const item of result.data.items) {
    const { data: product } = await supabase
      .from('products')
      .select('id, name, is_imei_tracked, stock_quantity, is_active')
      .eq('id', item.product_id)
      .eq('shop_id', user.shop_id!)
      .single();

    if (!product) {
      return { error: 'One or more selected products do not belong to your shop.' };
    }

    productCache.set(product.id, product);

    if (product.is_imei_tracked) {
      const imeis = (item.imei_numbers || [])
        .map((n) => n.trim().replace(/\s+/g, ''))
        .filter(Boolean);

      if (imeis.length !== item.quantity) {
        return {
          error: `Product "${product.name}" requires exactly ${item.quantity} IMEI(s), but ${imeis.length} were provided.`,
        };
      }

      // Validate 15-digit format for each IMEI
      for (const imei of imeis) {
        const val = validateImeiString(imei);
        if (!val.isValidFormat) {
          return {
            error: `Invalid IMEI "${imei}" for "${product.name}". Every IMEI must be exactly 15 numeric digits.`,
          };
        }
        allImeis.push(imei);
      }
    }
  }

  // 3. Pre-check for duplicate IMEIs across the entire shop
  if (allImeis.length > 0) {
    // Check duplicates within the input list itself
    const uniqueInput = new Set(allImeis);
    if (uniqueInput.size !== allImeis.length) {
      return { error: 'Duplicate IMEI numbers detected within the purchase order items.' };
    }

    // Check existing records in DB for this shop
    const { data: existingImeis } = await supabase
      .from('imei_records')
      .select('imei_number')
      .eq('shop_id', user.shop_id!)
      .in('imei_number', allImeis);

    if (existingImeis && existingImeis.length > 0) {
      return {
        error: `The following IMEI(s) already exist in your inventory: ${existingImeis.map((i) => i.imei_number).join(', ')}. Duplicate IMEIs cannot be added.`,
      };
    }
  }

  // Calculate total purchase amount in paisas
  let totalAmountPaisas = 0;
  result.data.items.forEach((item) => {
    totalAmountPaisas += toPaisas(item.quantity * item.unit_price);
  });

  // 4. Insert Purchase record
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
    return { error: 'Failed to record purchase header.' };
  }

  // 5. ATOMIC EXECUTION: Insert items, update product stock, and insert IMEIs
  // If any item or IMEI fails, cleanly roll back the entire purchase transaction
  const stockIncrementsToRollback: { productId: string; quantity: number }[] = [];
  let rollbackNeeded = false;
  let failureReason = '';

  for (const item of result.data.items) {
    const itemTotalPaisas = toPaisas(item.quantity * item.unit_price);
    const unitPricePaisas = toPaisas(item.unit_price);

    const { data: purchaseItem, error: itemError } = await supabase
      .from('purchase_items')
      .insert({
        purchase_id: purchase.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: unitPricePaisas,
        total_price: itemTotalPaisas,
      })
      .select('id')
      .single();

    if (itemError || !purchaseItem) {
      rollbackNeeded = true;
      failureReason = `Failed to insert purchase item for product.`;
      break;
    }

    // Insert IMEIs if tracked
    const prod = productCache.get(item.product_id);
    if (prod?.is_imei_tracked && item.imei_numbers && item.imei_numbers.length > 0) {
      const imeiRows = item.imei_numbers
        .map((num) => num.trim().replace(/\s+/g, ''))
        .filter(Boolean)
        .map((imeiNumber) => ({
          shop_id: user.shop_id,
          product_id: item.product_id,
          imei_number: imeiNumber,
          status: 'in_stock',
          purchase_item_id: purchaseItem.id,
        }));

      const { error: imeiError } = await supabase.from('imei_records').insert(imeiRows);
      if (imeiError) {
        rollbackNeeded = true;
        failureReason = `Failed to register IMEIs: ${imeiError.message}`;
        break;
      }
    }

    // Increment product stock and update purchase price
    const currentProd = productCache.get(item.product_id);
    const newStock = (currentProd?.stock_quantity || 0) + item.quantity;

    const { error: stockError } = await supabase
      .from('products')
      .update({
        stock_quantity: newStock,
        purchase_price: unitPricePaisas,
      })
      .eq('id', item.product_id)
      .eq('shop_id', user.shop_id!);

    if (stockError) {
      rollbackNeeded = true;
      failureReason = `Failed to update inventory stock for ${prod?.name}.`;
      break;
    }

    stockIncrementsToRollback.push({ productId: item.product_id, quantity: item.quantity });
  }

  // 6. ROLLBACK IF ANY ERROR OCCURRED (Section 12: Purchase + IMEI Atomicity)
  if (rollbackNeeded) {
    // Reverse any applied stock increments
    for (const rb of stockIncrementsToRollback) {
      const curr = productCache.get(rb.productId);
      if (curr) {
        await supabase
          .from('products')
          .update({ stock_quantity: curr.stock_quantity })
          .eq('id', rb.productId)
          .eq('shop_id', user.shop_id!);
      }
    }

    // Clean up created purchase (cascades items and IMEIs)
    await supabase.from('purchases').delete().eq('id', purchase.id).eq('shop_id', user.shop_id!);

    return { error: `Purchase transaction aborted for atomicity: ${failureReason}` };
  }

  // 7. Audit log
  await supabase.from('audit_logs').insert({
    shop_id: user.shop_id,
    user_id: user.id,
    action: 'purchase_create',
    entity_type: 'purchase',
    entity_id: purchase.id,
    metadata: {
      supplier_id: result.data.supplier_id,
      total_amount: totalAmountPaisas,
      items_count: result.data.items.length,
      imeis_count: allImeis.length,
    },
  });

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

  // 1. Fetch purchase and items
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

  // 2. Check if any IMEI associated with this purchase has been sold
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
        error: `Cannot delete purchase because device with IMEI "${soldImeis[0].imei_number}" has already been sold.`,
      };
    }
  }

  // 3. Pre-verify stock reversal: verify reversing stock won't violate non-negative stock constraint
  if (purchase.purchase_items) {
    for (const item of purchase.purchase_items) {
      const { data: prod } = await supabase
        .from('products')
        .select('name, stock_quantity')
        .eq('id', item.product_id)
        .eq('shop_id', user.shop_id!)
        .single();

      if (prod && (prod.stock_quantity || 0) < item.quantity) {
        return {
          error: `Cannot delete purchase: stock for "${prod.name}" has already been depleted (${prod.stock_quantity} available, purchase was ${item.quantity}).`,
        };
      }
    }

    // Safely decrement stock
    for (const item of purchase.purchase_items) {
      const { data: prod } = await supabase
        .from('products')
        .select('stock_quantity')
        .eq('id', item.product_id)
        .eq('shop_id', user.shop_id!)
        .single();

      if (prod) {
        await supabase
          .from('products')
          .update({
            stock_quantity: Math.max(0, (prod.stock_quantity || 0) - item.quantity),
          })
          .eq('id', item.product_id)
          .eq('shop_id', user.shop_id!);
      }
    }
  }

  // 4. Delete IMEIs associated with this purchase
  if (purchaseItemIds.length > 0) {
    await supabase
      .from('imei_records')
      .delete()
      .in('purchase_item_id', purchaseItemIds)
      .eq('shop_id', user.shop_id!);
  }

  // 5. Delete purchase (cascades purchase_items)
  const { error } = await supabase
    .from('purchases')
    .delete()
    .eq('id', purchaseId)
    .eq('shop_id', user.shop_id!);

  if (error) {
    return { error: 'Failed to delete purchase record.' };
  }

  // 6. Audit log
  await supabase.from('audit_logs').insert({
    shop_id: user.shop_id,
    user_id: user.id,
    action: 'purchase_delete',
    entity_type: 'purchase',
    entity_id: purchaseId,
    metadata: { purchase_id: purchaseId },
  });

  revalidatePath('/purchases');
  revalidatePath('/products');
  revalidatePath('/dashboard');

  return { success: true };
}
