'use server';

import { createClient } from '@/lib/supabase/server';
import { requireShopAccess, hasPermission } from '@/lib/auth';
import { recordPaymentSchema } from '@/lib/validations';
import { toPaisas, PaymentMethod } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// Helper to get latest balance of a customer
async function getCustomerLatestBalance(
  supabase: Awaited<ReturnType<typeof createClient>>,
  shopId: string,
  customerId: string
): Promise<number> {
  const { data } = await supabase
    .from('udhaar_ledger')
    .select('balance_after')
    .eq('shop_id', shopId)
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.balance_after || 0;
}

export async function recordUdhaarPayment(formData: FormData) {
  const user = await requireShopAccess();
  if (!hasPermission(user.role, 'payments:create')) {
    return { error: 'You do not have permission to record payments.' };
  }

  const raw = {
    customer_id: formData.get('customer_id') as string,
    amount: Number(formData.get('amount')) || 0,
    payment_method: (formData.get('payment_method') as PaymentMethod) || 'cash',
    reference: (formData.get('reference') as string) || undefined,
    notes: (formData.get('notes') as string) || undefined,
  };

  const result = recordPaymentSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const supabase = await createClient();

  // Verify customer belongs to shop
  const { data: customer } = await supabase
    .from('customers')
    .select('id, is_active')
    .eq('id', result.data.customer_id)
    .eq('shop_id', user.shop_id!)
    .single();

  if (!customer) {
    return { error: 'Customer not found or does not belong to this shop.' };
  }

  const amountPaisas = toPaisas(result.data.amount);

  const currentBalance = await getCustomerLatestBalance(supabase, user.shop_id!, result.data.customer_id);
  const newBalance = Math.max(0, currentBalance - amountPaisas);

  // 1. Insert into payments table
  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .insert({
      shop_id: user.shop_id,
      customer_id: result.data.customer_id,
      amount: amountPaisas,
      payment_method: result.data.payment_method,
      payment_type: 'udhaar_payment',
      reference: result.data.reference || null,
      notes: result.data.notes || null,
      created_by: user.id,
    })
    .select('id')
    .single();

  if (paymentError) {
    console.error('Payment insert error:', paymentError);
    return { error: 'Failed to record payment.' };
  }

  // 2. Insert into udhaar_ledger table
  const { error: ledgerError } = await supabase.from('udhaar_ledger').insert({
    shop_id: user.shop_id,
    customer_id: result.data.customer_id,
    payment_id: payment.id,
    type: 'debit',
    amount: amountPaisas,
    balance_after: newBalance,
    description: result.data.notes || `Udhaar recovery via ${result.data.payment_method}`,
  });

  if (ledgerError) {
    console.error('Ledger insert error:', ledgerError);
    return { error: 'Payment recorded, but ledger update failed.' };
  }

  revalidatePath('/udhaar');
  revalidatePath('/customers');
  revalidatePath('/dashboard');
  return { success: true };
}

const manualCreditSchema = z.object({
  customer_id: z.string().uuid('Customer is required'),
  amount: z.number().min(1, 'Amount must be greater than 0'),
  description: z.string().min(1, 'Description is required').max(500),
});

export async function addManualUdhaarCredit(formData: FormData) {
  const user = await requireShopAccess();
  if (!hasPermission(user.role, 'payments:create')) {
    return { error: 'You do not have permission to add credit.' };
  }

  const raw = {
    customer_id: formData.get('customer_id') as string,
    amount: Number(formData.get('amount')) || 0,
    description: formData.get('description') as string,
  };

  const result = manualCreditSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const supabase = await createClient();

  // Verify customer belongs to shop
  const { data: customer } = await supabase
    .from('customers')
    .select('id, is_active')
    .eq('id', result.data.customer_id)
    .eq('shop_id', user.shop_id!)
    .single();

  if (!customer) {
    return { error: 'Customer not found or does not belong to this shop.' };
  }

  const amountPaisas = toPaisas(result.data.amount);

  const currentBalance = await getCustomerLatestBalance(supabase, user.shop_id!, result.data.customer_id);
  const newBalance = currentBalance + amountPaisas;

  const { error } = await supabase.from('udhaar_ledger').insert({
    shop_id: user.shop_id,
    customer_id: result.data.customer_id,
    type: 'credit',
    amount: amountPaisas,
    balance_after: newBalance,
    description: result.data.description,
  });

  if (error) {
    console.error('Manual credit error:', error);
    return { error: 'Failed to add udhaar credit.' };
  }

  revalidatePath('/udhaar');
  revalidatePath('/customers');
  revalidatePath('/dashboard');
  return { success: true };
}
