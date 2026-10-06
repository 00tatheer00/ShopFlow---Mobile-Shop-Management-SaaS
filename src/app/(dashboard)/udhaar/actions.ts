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

  // 1. Verify customer belongs to shop
  const { data: customer } = await supabase
    .from('customers')
    .select('id, name, is_active')
    .eq('id', result.data.customer_id)
    .eq('shop_id', user.shop_id!)
    .single();

  if (!customer) {
    return { error: 'Customer not found or does not belong to this shop.' };
  }

  const amountPaisas = toPaisas(result.data.amount);
  if (amountPaisas <= 0) {
    return { error: 'Payment amount must be greater than zero.' };
  }

  // 2. Fetch authoritative outstanding balance
  const currentBalance = await getCustomerLatestBalance(supabase, user.shop_id!, result.data.customer_id);

  if (currentBalance <= 0) {
    return { error: `Customer "${customer.name}" has no outstanding Udhaar balance to settle.` };
  }

  // 3. Reject overpayment safely (Test F requirement)
  if (amountPaisas > currentBalance) {
    return {
      error: `Payment amount (Rs. ${(amountPaisas / 100).toLocaleString()}) cannot exceed the outstanding balance of Rs. ${(currentBalance / 100).toLocaleString()}.`,
    };
  }

  const newBalance = currentBalance - amountPaisas;

  // 4. Insert into payments table
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

  if (paymentError || !payment) {
    console.error('Payment insert error:', paymentError);
    return { error: 'Failed to record payment transaction.' };
  }

  // 5. Insert into udhaar_ledger table
  const { data: ledgerEntry, error: ledgerError } = await supabase
    .from('udhaar_ledger')
    .insert({
      shop_id: user.shop_id,
      customer_id: result.data.customer_id,
      payment_id: payment.id,
      type: 'debit',
      amount: amountPaisas,
      balance_after: newBalance,
      description: result.data.notes || `Udhaar recovery via ${result.data.payment_method}`,
    })
    .select('id')
    .single();

  if (ledgerError) {
    console.error('Ledger insert error:', ledgerError);
    // Rollback payment row to avoid orphaned financial records
    await supabase.from('payments').delete().eq('id', payment.id).eq('shop_id', user.shop_id!);
    return { error: 'Payment transaction failed while updating customer ledger.' };
  }

  // 6. Audit log
  await supabase.from('audit_logs').insert({
    shop_id: user.shop_id,
    user_id: user.id,
    action: 'udhaar_payment',
    entity_type: 'payment',
    entity_id: payment.id,
    metadata: {
      customer_id: result.data.customer_id,
      customer_name: customer.name,
      amount: amountPaisas,
      previous_balance: currentBalance,
      balance_after: newBalance,
      payment_method: result.data.payment_method,
      ledger_id: ledgerEntry?.id,
    },
  });

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
    .select('id, name, is_active')
    .eq('id', result.data.customer_id)
    .eq('shop_id', user.shop_id!)
    .single();

  if (!customer) {
    return { error: 'Customer not found or does not belong to this shop.' };
  }

  const amountPaisas = toPaisas(result.data.amount);
  const currentBalance = await getCustomerLatestBalance(supabase, user.shop_id!, result.data.customer_id);
  const newBalance = currentBalance + amountPaisas;

  const { data: ledgerEntry, error } = await supabase
    .from('udhaar_ledger')
    .insert({
      shop_id: user.shop_id,
      customer_id: result.data.customer_id,
      type: 'credit',
      amount: amountPaisas,
      balance_after: newBalance,
      description: result.data.description,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Manual credit error:', error);
    return { error: 'Failed to add udhaar credit.' };
  }

  // Audit log
  await supabase.from('audit_logs').insert({
    shop_id: user.shop_id,
    user_id: user.id,
    action: 'udhaar_credit_add',
    entity_type: 'udhaar_ledger',
    entity_id: ledgerEntry?.id,
    metadata: {
      customer_id: result.data.customer_id,
      customer_name: customer.name,
      amount: amountPaisas,
      previous_balance: currentBalance,
      balance_after: newBalance,
      description: result.data.description,
    },
  });

  revalidatePath('/udhaar');
  revalidatePath('/customers');
  revalidatePath('/dashboard');
  return { success: true };
}
