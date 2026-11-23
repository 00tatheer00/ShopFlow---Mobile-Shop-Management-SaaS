'use server';

import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { requireShopAccess, hasPermission } from '@/lib/auth';
import { getCustomerBalance } from '@/lib/supabase/queries';
import { createSaleSchema } from '@/lib/validations';
import { toPaisas, PaymentMethod } from '@/lib/types';
import { pktDateStamp } from '@/lib/time';
import { revalidatePath } from 'next/cache';

interface CreateSalePayload {
  customer_id?: string;
  items: {
    product_id: string;
    imei_record_id?: string;
    quantity: number;
    unit_price: number; // in rupees
  }[];
  discount?: number; // in rupees
  payment_method: PaymentMethod;
  amount_paid: number; // in rupees
  notes?: string;
  idempotency_key?: string;
}

type SaleResult =
  | { success: true; saleId: string; invoiceNumber: string; isDuplicate?: boolean; error?: undefined }
  | { error: string; success?: undefined };

type ServerClient = Awaited<ReturnType<typeof createClient>>;

function revalidateSalePaths() {
  revalidatePath('/sales');
  revalidatePath('/products');
  revalidatePath('/udhaar');
  revalidatePath('/customers');
  revalidatePath('/dashboard');
  revalidatePath('/reports');
}

/** PostgREST "function does not exist" — migration 009/011 not applied yet. */
function isMissingFunction(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return (
    error.code === 'PGRST202' ||
    error.code === '42883' ||
    /could not find the function/i.test(error.message || '')
  );
}

export async function createSale(payload: CreateSalePayload): Promise<SaleResult> {
  const user = await requireShopAccess();
  if (!hasPermission(user.role, 'sales:create')) {
    return { error: 'You do not have permission to create sales.' };
  }

  const result = createSaleSchema.safeParse(payload);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const data = result.data;
  const shopId = user.shop_id!;
  const supabase = await createClient();

  const items = data.items.map((item) => ({
    product_id: item.product_id,
    imei_record_id: item.imei_record_id || null,
    quantity: item.quantity,
    unit_price: toPaisas(item.unit_price),
  }));

  const discountPaisas = toPaisas(data.discount || 0);
  const amountPaidPaisas = toPaisas(data.amount_paid);

  // ---- Preferred path: one atomic database transaction (migration 017) ----
  const { data: rpcData, error: rpcError } = await supabase.rpc('process_sale', {
    p_shop_id: shopId,
    p_created_by: user.id,
    p_customer_id: data.customer_id || null,
    p_items: items,
    p_discount: discountPaisas,
    p_payment_method: data.payment_method,
    p_amount_paid: amountPaidPaisas,
    p_notes: data.notes || null,
    p_idempotency_key: data.idempotency_key || null,
  });

  if (!rpcError && rpcData) {
    const res = rpcData as { sale_id: string; invoice_number: string; is_duplicate?: boolean };
    revalidateSalePaths();
    return {
      success: true,
      saleId: res.sale_id,
      invoiceNumber: res.invoice_number,
      isDuplicate: res.is_duplicate,
    };
  }

  if (rpcError && !isMissingFunction(rpcError)) {
    console.error('process_sale error:', rpcError);
    // Messages raised by process_sale are written for the shopkeeper.
    return { error: rpcError.message || 'Sale could not be saved. Please try again.' };
  }

  // ---- Fallback path (database function not installed yet) ----
  return createSaleLegacy(supabase, user.id, shopId, data, items, discountPaisas, amountPaidPaisas);
}

async function createSaleLegacy(
  supabase: ServerClient,
  userId: string,
  shopId: string,
  data: ReturnType<typeof createSaleSchema.parse>,
  items: { product_id: string; imei_record_id: string | null; quantity: number; unit_price: number }[],
  discountPaisas: number,
  amountPaidPaisas: number
): Promise<SaleResult> {
  // Deletes during rollback need elevated rights (cashiers cannot delete sales).
  const privileged = getAdminClient() ?? supabase;

  // 1. Idempotency
  if (data.idempotency_key) {
    const { data: existingSale } = await supabase
      .from('sales')
      .select('id, invoice_number')
      .eq('shop_id', shopId)
      .eq('idempotency_key', data.idempotency_key)
      .maybeSingle();
    if (existingSale) {
      return { success: true, saleId: existingSale.id, invoiceNumber: existingSale.invoice_number, isDuplicate: true };
    }
  }

  // 2. Customer
  if (data.customer_id) {
    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('id', data.customer_id)
      .eq('shop_id', shopId)
      .eq('is_active', true)
      .maybeSingle();
    if (!customer) return { error: 'Customer not found or does not belong to your shop.' };
  }

  // 3. Products
  const uniqueProductIds = Array.from(new Set(items.map((i) => i.product_id)));
  const { data: dbProducts } = await supabase
    .from('products')
    .select('id, name, stock_quantity, is_imei_tracked, is_active')
    .in('id', uniqueProductIds)
    .eq('shop_id', shopId);

  if (!dbProducts || dbProducts.length !== uniqueProductIds.length) {
    return { error: 'One or more selected products do not belong to this shop.' };
  }
  const productMap = new Map(dbProducts.map((p) => [p.id, p]));

  const requestedQty = new Map<string, number>();
  for (const item of items) {
    const product = productMap.get(item.product_id)!;
    if (product.is_imei_tracked && (!item.imei_record_id || item.quantity !== 1)) {
      return { error: `Please select the IMEI for "${product.name}" (one phone per line).` };
    }
    requestedQty.set(item.product_id, (requestedQty.get(item.product_id) || 0) + item.quantity);
  }

  for (const [productId, qty] of requestedQty) {
    const product = productMap.get(productId)!;
    if (!product.is_active) return { error: `Product "${product.name}" is archived and cannot be sold.` };
    if ((product.stock_quantity || 0) < qty) {
      return { error: `Not enough stock for "${product.name}". Available: ${product.stock_quantity || 0}, requested: ${qty}.` };
    }
  }

  // 4. IMEIs
  const imeiIds = items.map((i) => i.imei_record_id).filter((id): id is string => Boolean(id));
  if (imeiIds.length > 0) {
    const { data: dbImeis } = await supabase
      .from('imei_records')
      .select('id, status, product_id')
      .in('id', imeiIds)
      .eq('shop_id', shopId);
    const imeiMap = new Map((dbImeis || []).map((r) => [r.id, r]));
    for (const item of items) {
      if (!item.imei_record_id) continue;
      const rec = imeiMap.get(item.imei_record_id);
      if (!rec || rec.product_id !== item.product_id || rec.status !== 'in_stock') {
        return { error: `Selected IMEI for "${productMap.get(item.product_id)?.name}" is invalid or already sold.` };
      }
    }
  }

  // 5. Money (paisas)
  const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0);
  if (discountPaisas > subtotal) return { error: 'Discount cannot exceed the order subtotal amount.' };
  const total = subtotal - discountPaisas;
  const paid = Math.min(amountPaidPaisas, total); // extra cash is change, not revenue
  const due = Math.max(0, total - paid);
  if (due > 0 && !data.customer_id) {
    return { error: 'Customer must be selected if payment is not made in full (Udhaar sale).' };
  }

  // 6. Header — retry on (rare) invoice-number collision
  let sale: { id: string; invoice_number: string } | null = null;
  for (let attempt = 0; attempt < 5 && !sale; attempt++) {
    const invoiceNumber = `INV-${pktDateStamp()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const { data: inserted, error } = await supabase
      .from('sales')
      .insert({
        shop_id: shopId,
        customer_id: data.customer_id || null,
        invoice_number: invoiceNumber,
        subtotal,
        discount: discountPaisas,
        total_amount: total,
        amount_paid: paid,
        amount_due: due,
        payment_method: data.payment_method,
        status: 'completed',
        notes: data.notes || null,
        created_by: userId,
        idempotency_key: data.idempotency_key || null,
      })
      .select('id, invoice_number')
      .single();

    if (inserted) {
      sale = inserted;
    } else if (error?.code === '23505' && data.idempotency_key && /idempotency/i.test(error.message)) {
      const { data: existing } = await supabase
        .from('sales')
        .select('id, invoice_number')
        .eq('shop_id', shopId)
        .eq('idempotency_key', data.idempotency_key)
        .maybeSingle();
      if (existing) {
        return { success: true, saleId: existing.id, invoiceNumber: existing.invoice_number, isDuplicate: true };
      }
    } else if (error?.code !== '23505') {
      console.error('Create sale error:', error);
      return { error: 'Failed to record sale transaction.' };
    }
  }
  if (!sale) return { error: 'Could not generate an invoice number. Please try again.' };

  const decremented: { productId: string; qty: number }[] = [];
  const flippedImeis: string[] = [];
  const rollback = async (message: string): Promise<SaleResult> => {
    await Promise.all(
      decremented.map((d) =>
        supabase.rpc('increment_product_stock', { p_shop_id: shopId, p_product_id: d.productId, p_quantity: d.qty })
      )
    );
    // Only restore IMEIs that THIS sale marked as sold
    if (flippedImeis.length > 0) {
      await supabase
        .from('imei_records')
        .update({ status: 'in_stock', sale_item_id: null })
        .in('id', flippedImeis)
        .eq('shop_id', shopId);
    }
    await privileged.from('sales').delete().eq('id', sale!.id).eq('shop_id', shopId);
    return { error: message };
  };

  // 7. Stock (atomic per product)
  for (const [productId, qty] of requestedQty) {
    const { error } = await supabase.rpc('decrement_product_stock', {
      p_shop_id: shopId,
      p_product_id: productId,
      p_quantity: qty,
    });
    if (error) return rollback('Stock changed while saving (another counter sold it). Please try again.');
    decremented.push({ productId, qty });
  }

  // 8. Lines
  const { data: insertedItems, error: itemsError } = await supabase
    .from('sale_items')
    .insert(
      items.map((i) => ({
        sale_id: sale!.id,
        product_id: i.product_id,
        imei_record_id: i.imei_record_id,
        quantity: i.quantity,
        unit_price: i.unit_price,
        total_price: i.quantity * i.unit_price,
      }))
    )
    .select('id, imei_record_id');
  if (itemsError || !insertedItems) return rollback('Failed to record sale items.');

  // 9. IMEIs — only flip rows that are still in stock (prevents double-selling)
  for (const it of insertedItems.filter((x) => x.imei_record_id)) {
    const { data: flipped } = await supabase
      .from('imei_records')
      .update({ status: 'sold', sale_item_id: it.id })
      .eq('id', it.imei_record_id!)
      .eq('shop_id', shopId)
      .eq('status', 'in_stock')
      .select('id');
    if (!flipped || flipped.length === 0) {
      return rollback('This phone (IMEI) was just sold on another counter. Please refresh.');
    }
    flippedImeis.push(it.imei_record_id!);
  }

  // 10. Payment, udhaar, audit
  if (paid > 0) {
    await supabase.from('payments').insert({
      shop_id: shopId,
      sale_id: sale.id,
      customer_id: data.customer_id || null,
      amount: paid,
      payment_method: data.payment_method,
      payment_type: 'sale_payment',
      reference: sale.invoice_number,
      notes: `POS payment for invoice ${sale.invoice_number}`,
      created_by: userId,
    });
  }

  if (due > 0 && data.customer_id) {
    const previous = await getCustomerBalance(supabase, shopId, data.customer_id);
    await supabase.from('udhaar_ledger').insert({
      shop_id: shopId,
      customer_id: data.customer_id,
      sale_id: sale.id,
      type: 'credit',
      amount: due,
      balance_after: previous + due,
      description: `Remaining balance for Invoice ${sale.invoice_number}`,
    });
  }

  await supabase.from('audit_logs').insert({
    shop_id: shopId,
    user_id: userId,
    action: 'sale_create',
    entity_type: 'sale',
    entity_id: sale.id,
    metadata: {
      invoice_number: sale.invoice_number,
      total_amount: total,
      amount_paid: paid,
      amount_due: due,
      items_count: items.length,
      customer_id: data.customer_id || null,
      idempotency_key: data.idempotency_key || null,
    },
  });

  revalidateSalePaths();
  return { success: true, saleId: sale.id, invoiceNumber: sale.invoice_number };
}

export async function cancelSale(saleId: string) {
  const user = await requireShopAccess();
  if (!hasPermission(user.role, 'sales:cancel') && user.role !== 'manager') {
    return { error: 'You do not have permission to cancel sales.' };
  }

  const supabase = await createClient();
  const shopId = user.shop_id!;

  // 1. Atomically flip completed -> cancelled. Only ONE request can win this,
  //    so double-clicks can never return stock twice.
  const { data: flipped, error: flipError } = await supabase
    .from('sales')
    .update({ status: 'cancelled' })
    .eq('id', saleId)
    .eq('shop_id', shopId)
    .eq('status', 'completed')
    .select('id, customer_id, amount_due, invoice_number, sale_items (id, product_id, imei_record_id, quantity)');

  if (flipError) {
    console.error('Cancel sale error:', flipError);
    return { error: 'Failed to cancel sale.' };
  }

  const sale = flipped?.[0];
  if (!sale) {
    return { error: 'Sale not found or already cancelled.' };
  }

  // 2. Return stock & IMEIs
  const items = (sale.sale_items || []) as { id: string; product_id: string; imei_record_id: string | null; quantity: number }[];
  const qtyByProduct = new Map<string, number>();
  for (const item of items) {
    qtyByProduct.set(item.product_id, (qtyByProduct.get(item.product_id) || 0) + item.quantity);
  }

  const tasks: PromiseLike<unknown>[] = [];
  for (const [productId, qty] of qtyByProduct) {
    tasks.push(supabase.rpc('increment_product_stock', { p_shop_id: shopId, p_product_id: productId, p_quantity: qty }));
  }
  const imeiIds = items.map((i) => i.imei_record_id).filter((id): id is string => Boolean(id));
  if (imeiIds.length > 0) {
    tasks.push(
      supabase
        .from('imei_records')
        .update({ status: 'in_stock', sale_item_id: null })
        .in('id', imeiIds)
        .eq('shop_id', shopId)
    );
  }
  await Promise.all(tasks);

  // 3. Reverse udhaar
  if (sale.amount_due > 0 && sale.customer_id) {
    const previous = await getCustomerBalance(supabase, shopId, sale.customer_id);
    const reverseAmount = Math.min(sale.amount_due, previous);
    if (reverseAmount > 0) {
      await supabase.from('udhaar_ledger').insert({
        shop_id: shopId,
        customer_id: sale.customer_id,
        sale_id: sale.id,
        type: 'debit',
        amount: reverseAmount,
        balance_after: previous - reverseAmount,
        description: `Reversal of Invoice ${sale.invoice_number} (Cancelled)`,
      });
    }
  }

  // 4. Mark payments as void
  await supabase
    .from('payments')
    .update({ notes: `[SALE CANCELLED - VOID] for invoice ${sale.invoice_number}` })
    .eq('sale_id', sale.id)
    .eq('shop_id', shopId);

  await supabase.from('audit_logs').insert({
    shop_id: shopId,
    user_id: user.id,
    action: 'sale_cancel',
    entity_type: 'sale',
    entity_id: sale.id,
    metadata: {
      invoice_number: sale.invoice_number,
      reverted_items: items.length,
      customer_id: sale.customer_id || null,
      amount_due_reverted: sale.amount_due,
    },
  });

  revalidateSalePaths();
  return { success: true };
}
