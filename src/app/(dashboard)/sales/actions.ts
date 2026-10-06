'use server';

import { createClient } from '@/lib/supabase/server';
import { requireShopAccess, hasPermission } from '@/lib/auth';
import { createSaleSchema } from '@/lib/validations';
import { toPaisas, PaymentMethod } from '@/lib/types';
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

export async function createSale(payload: CreateSalePayload) {
  const user = await requireShopAccess();
  if (!hasPermission(user.role, 'sales:create')) {
    return { error: 'You do not have permission to create sales.' };
  }

  const result = createSaleSchema.safeParse(payload);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const supabase = await createClient();

  // 1. Double Submission / Idempotency Protection (Section 14 & Test J)
  if (result.data.idempotency_key) {
    const { data: existingSale } = await supabase
      .from('sales')
      .select('id, invoice_number')
      .eq('shop_id', user.shop_id!)
      .eq('idempotency_key', result.data.idempotency_key)
      .maybeSingle();

    if (existingSale) {
      return {
        success: true,
        saleId: existingSale.id,
        invoiceNumber: existingSale.invoice_number,
        isDuplicate: true,
      };
    }
  }

  // 2. Verify Customer belongs to this shop if provided
  if (result.data.customer_id) {
    const { data: customer } = await supabase
      .from('customers')
      .select('id, name, is_active')
      .eq('id', result.data.customer_id)
      .eq('shop_id', user.shop_id!)
      .single();

    if (!customer) {
      return { error: 'Customer not found or does not belong to your shop.' };
    }
  }

  // 3. Pre-verify all products: tenant ownership, active status, stock levels, and IMEI states
  const checkedImeis = new Set<string>();

  for (const item of result.data.items) {
    if (item.unit_price <= 0) {
      return { error: 'Product unit price must be greater than zero.' };
    }

    const { data: product } = await supabase
      .from('products')
      .select('id, name, stock_quantity, is_imei_tracked, is_active, sale_price')
      .eq('id', item.product_id)
      .eq('shop_id', user.shop_id!)
      .single();

    if (!product) {
      return { error: 'One or more selected products do not belong to this shop.' };
    }

    if (!product.is_active) {
      return { error: `Product "${product.name}" is archived/inactive and cannot be sold.` };
    }

    if ((product.stock_quantity || 0) < item.quantity) {
      return {
        error: `Insufficient stock for "${product.name}". Available: ${product.stock_quantity || 0}, requested: ${item.quantity}. Overselling is prevented.`,
      };
    }

    // IMEI validation
    if (item.imei_record_id) {
      if (checkedImeis.has(item.imei_record_id)) {
        return { error: 'Duplicate IMEI selected in the sale order items.' };
      }
      checkedImeis.add(item.imei_record_id);

      const { data: imeiRecord } = await supabase
        .from('imei_records')
        .select('id, status, product_id, shop_id')
        .eq('id', item.imei_record_id)
        .eq('shop_id', user.shop_id!)
        .single();

      if (!imeiRecord || imeiRecord.product_id !== item.product_id || imeiRecord.status !== 'in_stock') {
        return {
          error: `Selected IMEI for "${product.name}" is invalid, already sold, or assigned to another shop.`,
        };
      }
    }
  }

  // 4. Calculate financial totals authoritatively in paisas (Sections 6, 7, 9, 12)
  let subtotalPaisas = 0;
  const itemsWithPaisas = result.data.items.map((item) => {
    const unitPricePaisas = toPaisas(item.unit_price);
    const itemTotal = toPaisas(item.quantity * item.unit_price);
    subtotalPaisas += itemTotal;
    return {
      product_id: item.product_id,
      imei_record_id: item.imei_record_id || null,
      quantity: item.quantity,
      unit_price: unitPricePaisas,
      total_price: itemTotal,
    };
  });

  const discountPaisas = toPaisas(result.data.discount || 0);

  if (discountPaisas < 0) {
    return { error: 'Discount amount cannot be negative.' };
  }

  if (discountPaisas > subtotalPaisas) {
    return { error: 'Discount cannot exceed the order subtotal amount.' };
  }

  const totalAmountPaisas = subtotalPaisas - discountPaisas;
  const rawPaidPaisas = toPaisas(result.data.amount_paid);

  if (rawPaidPaisas < 0) {
    return { error: 'Payment amount cannot be negative.' };
  }

  // Cash Change Rule (Section 12):
  // Customer paying cash may tender more than the total (e.g. Rs 10,000 tendered for Rs 8,500 total).
  // The excess is cash change returned to the customer and must NEVER be booked as shop revenue.
  const actualPaidPaisas = Math.min(rawPaidPaisas, totalAmountPaisas);
  const amountDuePaisas = Math.max(0, totalAmountPaisas - actualPaidPaisas);

  // If there is udhaar (amount_due > 0), a customer must be selected
  if (amountDuePaisas > 0 && !result.data.customer_id) {
    return { error: 'Customer must be selected if payment is not made in full (Udhaar sale).' };
  }

  // 5. Generate Invoice Number (e.g. INV-20261006-0012)
  const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randSuffix = Math.floor(1000 + Math.random() * 9000);
  const invoiceNumber = `INV-${todayStr}-${randSuffix}`;

  // 6. Insert Sale Header (with idempotency_key)
  const { data: sale, error: saleError } = await supabase
    .from('sales')
    .insert({
      shop_id: user.shop_id,
      customer_id: result.data.customer_id || null,
      invoice_number: invoiceNumber,
      subtotal: subtotalPaisas,
      discount: discountPaisas,
      total_amount: totalAmountPaisas,
      amount_paid: actualPaidPaisas,
      amount_due: amountDuePaisas,
      payment_method: result.data.payment_method,
      status: 'completed',
      notes: result.data.notes || null,
      created_by: user.id,
      idempotency_key: result.data.idempotency_key || null,
    })
    .select('id, invoice_number')
    .single();

  if (saleError || !sale) {
    // If caught duplicate idempotency key via DB unique constraint, return existing
    if (saleError?.code === '23505' && result.data.idempotency_key) {
      const { data: existing } = await supabase
        .from('sales')
        .select('id, invoice_number')
        .eq('shop_id', user.shop_id!)
        .eq('idempotency_key', result.data.idempotency_key)
        .maybeSingle();

      if (existing) {
        return {
          success: true,
          saleId: existing.id,
          invoiceNumber: existing.invoice_number,
          isDuplicate: true,
        };
      }
    }
    console.error('Create sale error:', saleError);
    return { error: 'Failed to record sale transaction.' };
  }

  // 7. ATOMIC INVENTORY REDUCTION & SALE ITEMS CREATION (Section 13)
  const decrementedProducts: { productId: string; quantity: number }[] = [];
  let saleAborted = false;
  let abortReason = '';

  for (const item of itemsWithPaisas) {
    // 7a. Atomic stock decrement via PostgreSQL function
    const { error: decError } = await supabase.rpc('decrement_product_stock', {
      p_shop_id: user.shop_id,
      p_product_id: item.product_id,
      p_quantity: item.quantity,
    });

    if (decError) {
      saleAborted = true;
      abortReason = `Insufficient stock or concurrent checkout conflict for product.`;
      break;
    }

    decrementedProducts.push({ productId: item.product_id, quantity: item.quantity });

    // 7b. Insert sale line item
    const { data: insertedItem, error: itemError } = await supabase
      .from('sale_items')
      .insert({
        sale_id: sale.id,
        product_id: item.product_id,
        imei_record_id: item.imei_record_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
      })
      .select('id')
      .single();

    if (itemError || !insertedItem) {
      saleAborted = true;
      abortReason = `Failed to insert sale line item.`;
      break;
    }

    // 7c. If item has IMEI, mark IMEI sold atomically
    if (item.imei_record_id) {
      const { error: imeiUpdateErr } = await supabase
        .from('imei_records')
        .update({
          status: 'sold',
          sale_item_id: insertedItem.id,
        })
        .eq('id', item.imei_record_id)
        .eq('shop_id', user.shop_id!);

      if (imeiUpdateErr) {
        saleAborted = true;
        abortReason = `Failed to update IMEI lifecycle status to sold.`;
        break;
      }
    }
  }

  // 8. ROLLBACK IF SALE ABORTED (Atomicity Guarantee)
  if (saleAborted) {
    for (const dp of decrementedProducts) {
      await supabase.rpc('increment_product_stock', {
        p_shop_id: user.shop_id,
        p_product_id: dp.productId,
        p_quantity: dp.quantity,
      });
    }

    await supabase.from('sales').delete().eq('id', sale.id).eq('shop_id', user.shop_id!);

    return { error: `Sale transaction aborted for safety: ${abortReason}` };
  }

  // 9. If actualPaidPaisas > 0, record in payments table
  if (actualPaidPaisas > 0) {
    await supabase.from('payments').insert({
      shop_id: user.shop_id,
      sale_id: sale.id,
      customer_id: result.data.customer_id || null,
      amount: actualPaidPaisas,
      payment_method: result.data.payment_method,
      payment_type: 'sale_payment',
      reference: invoiceNumber,
      notes: `POS payment for invoice ${invoiceNumber}`,
      created_by: user.id,
    });
  }

  // 10. If amountDuePaisas > 0, record in Udhaar ledger
  if (amountDuePaisas > 0 && result.data.customer_id) {
    const { data: latestUdhaar } = await supabase
      .from('udhaar_ledger')
      .select('balance_after')
      .eq('shop_id', user.shop_id!)
      .eq('customer_id', result.data.customer_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const previousBalance = latestUdhaar?.balance_after || 0;
    const newBalance = previousBalance + amountDuePaisas;

    await supabase.from('udhaar_ledger').insert({
      shop_id: user.shop_id,
      customer_id: result.data.customer_id,
      sale_id: sale.id,
      type: 'credit',
      amount: amountDuePaisas,
      balance_after: newBalance,
      description: `Remaining balance for Invoice ${invoiceNumber}`,
    });
  }

  // 11. Audit log
  await supabase.from('audit_logs').insert({
    shop_id: user.shop_id,
    user_id: user.id,
    action: 'sale_create',
    entity_type: 'sale',
    entity_id: sale.id,
    metadata: {
      invoice_number: invoiceNumber,
      total_amount: totalAmountPaisas,
      amount_paid: actualPaidPaisas,
      amount_due: amountDuePaisas,
      items_count: result.data.items.length,
      customer_id: result.data.customer_id || null,
      idempotency_key: result.data.idempotency_key || null,
    },
  });

  revalidatePath('/sales');
  revalidatePath('/products');
  revalidatePath('/udhaar');
  revalidatePath('/dashboard');

  return {
    success: true,
    saleId: sale.id,
    invoiceNumber: sale.invoice_number,
  };
}

export async function cancelSale(saleId: string) {
  const user = await requireShopAccess();
  if (user.role !== 'shop_owner' && user.role !== 'manager') {
    return { error: 'You do not have permission to cancel sales.' };
  }

  const supabase = await createClient();

  // 1. Fetch sale
  const { data: sale } = await supabase
    .from('sales')
    .select(`
      id, shop_id, status, customer_id, amount_due, invoice_number,
      sale_items (id, product_id, imei_record_id, quantity)
    `)
    .eq('id', saleId)
    .eq('shop_id', user.shop_id!)
    .single();

  if (!sale) {
    return { error: 'Sale record not found.' };
  }

  // Idempotency: Cancelling twice must NOT reverse inventory twice (Section 15 & Test I)
  if (sale.status === 'cancelled') {
    return { error: 'This sale has already been cancelled.' };
  }

  // 2. Revert product stock and IMEI records
  if (sale.sale_items) {
    for (const item of sale.sale_items) {
      // Revert product stock atomically
      await supabase.rpc('increment_product_stock', {
        p_shop_id: user.shop_id,
        p_product_id: item.product_id,
        p_quantity: item.quantity,
      });

      // Restore IMEI lifecycle: sold -> in_stock
      if (item.imei_record_id) {
        await supabase
          .from('imei_records')
          .update({
            status: 'in_stock',
            sale_item_id: null,
          })
          .eq('id', item.imei_record_id)
          .eq('shop_id', user.shop_id!);
      }
    }
  }

  // 3. Revert udhaar if there was amount_due
  if (sale.amount_due > 0 && sale.customer_id) {
    const { data: latestUdhaar } = await supabase
      .from('udhaar_ledger')
      .select('balance_after')
      .eq('shop_id', user.shop_id!)
      .eq('customer_id', sale.customer_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const previousBalance = latestUdhaar?.balance_after || 0;
    const newBalance = Math.max(0, previousBalance - sale.amount_due);

    await supabase.from('udhaar_ledger').insert({
      shop_id: user.shop_id,
      customer_id: sale.customer_id,
      sale_id: sale.id,
      type: 'debit',
      amount: sale.amount_due,
      balance_after: newBalance,
      description: `Reversal of Invoice ${sale.invoice_number} (Cancelled)`,
    });
  }

  // 4. Annotate payments table notes
  await supabase
    .from('payments')
    .update({ notes: `[SALE CANCELLED - VOID] for invoice ${sale.invoice_number}` })
    .eq('sale_id', sale.id)
    .eq('shop_id', user.shop_id!);

  // 5. Update sale status to cancelled
  const { error } = await supabase
    .from('sales')
    .update({ status: 'cancelled' })
    .eq('id', saleId)
    .eq('shop_id', user.shop_id!);

  if (error) {
    return { error: 'Failed to cancel sale.' };
  }

  // 6. Audit log
  await supabase.from('audit_logs').insert({
    shop_id: user.shop_id,
    user_id: user.id,
    action: 'sale_cancel',
    entity_type: 'sale',
    entity_id: saleId,
    metadata: {
      invoice_number: sale.invoice_number,
      reverted_items: sale.sale_items?.length || 0,
      customer_id: sale.customer_id || null,
      amount_due_reverted: sale.amount_due,
    },
  });

  revalidatePath('/sales');
  revalidatePath('/products');
  revalidatePath('/udhaar');
  revalidatePath('/dashboard');

  return { success: true };
}
