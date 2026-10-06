'use server';

import { createClient } from '@/lib/supabase/server';
import { requireShopAccess, hasPermission } from '@/lib/auth';
import { customerSchema } from '@/lib/validations';
import { revalidatePath } from 'next/cache';

export async function createCustomer(formData: FormData) {
  const user = await requireShopAccess();
  if (!hasPermission(user.role, 'customers:create')) {
    return { error: 'You do not have permission to add customers.' };
  }

  const raw = {
    name: formData.get('name') as string,
    phone: formData.get('phone') as string,
    email: (formData.get('email') as string) || undefined,
    address: (formData.get('address') as string) || undefined,
    notes: (formData.get('notes') as string) || undefined,
  };

  const result = customerSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const supabase = await createClient();

  // Pre-check: duplicate phone detection (normalized) within the same shop
  const normalizedPhone = result.data.phone; // already normalized by Zod transform
  const { data: existing } = await supabase
    .from('customers')
    .select('id, name, is_active')
    .eq('shop_id', user.shop_id!)
    .eq('phone', normalizedPhone)
    .maybeSingle();

  if (existing) {
    if (existing.is_active) {
      return { error: `A customer with this phone number already exists: "${existing.name}". Duplicate customers are not allowed within the same shop.` };
    } else {
      // Reactivate the archived customer with updated data
      const { error: reactivateError } = await supabase
        .from('customers')
        .update({
          name: result.data.name,
          phone: normalizedPhone,
          email: result.data.email || null,
          address: result.data.address || null,
          notes: result.data.notes || null,
          is_active: true,
        })
        .eq('id', existing.id)
        .eq('shop_id', user.shop_id!);

      if (reactivateError) {
        return { error: 'Failed to reactivate customer. Please try again.' };
      }

      // Audit log
      await supabase.from('audit_logs').insert({
        shop_id: user.shop_id,
        user_id: user.id,
        action: 'customer_reactivate',
        entity_type: 'customer',
        entity_id: existing.id,
        metadata: { phone: normalizedPhone, name: result.data.name },
      });

      revalidatePath('/customers');
      return { success: true, reactivated: true };
    }
  }

  const { data: customer, error } = await supabase
    .from('customers')
    .insert({
      shop_id: user.shop_id,
      name: result.data.name,
      phone: normalizedPhone,
      email: result.data.email || null,
      address: result.data.address || null,
      notes: result.data.notes || null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return { error: 'A customer with this phone number already exists.' };
    }
    console.error('Create customer error:', error);
    return { error: 'Failed to add customer. Please try again.' };
  }

  // Audit log
  await supabase.from('audit_logs').insert({
    shop_id: user.shop_id,
    user_id: user.id,
    action: 'customer_create',
    entity_type: 'customer',
    entity_id: customer.id,
    metadata: { phone: normalizedPhone, name: result.data.name },
  });

  revalidatePath('/customers');
  return { success: true, customer };
}

export async function updateCustomer(id: string, formData: FormData) {
  const user = await requireShopAccess();
  if (!hasPermission(user.role, 'customers:edit')) {
    return { error: 'You do not have permission to edit customers.' };
  }

  const raw = {
    name: formData.get('name') as string,
    phone: formData.get('phone') as string,
    email: (formData.get('email') as string) || undefined,
    address: (formData.get('address') as string) || undefined,
    notes: (formData.get('notes') as string) || undefined,
  };

  const result = customerSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const supabase = await createClient();
  const normalizedPhone = result.data.phone;

  // Check for duplicate phone in same shop (exclude self)
  const { data: existing } = await supabase
    .from('customers')
    .select('id, name')
    .eq('shop_id', user.shop_id!)
    .eq('phone', normalizedPhone)
    .eq('is_active', true)
    .neq('id', id)
    .maybeSingle();

  if (existing) {
    return { error: `Another customer "${existing.name}" already has this phone number.` };
  }

  const { error } = await supabase
    .from('customers')
    .update({
      name: result.data.name,
      phone: normalizedPhone,
      email: result.data.email || null,
      address: result.data.address || null,
      notes: result.data.notes || null,
    })
    .eq('id', id)
    .eq('shop_id', user.shop_id!);

  if (error) {
    if (error.code === '23505') {
      return { error: 'A customer with this phone number already exists.' };
    }
    return { error: 'Failed to update customer.' };
  }

  revalidatePath('/customers');
  return { success: true };
}

export async function deleteCustomer(id: string) {
  const user = await requireShopAccess();
  if (!hasPermission(user.role, 'customers:delete')) {
    return { error: 'You do not have permission to delete customers.' };
  }

  const supabase = await createClient();

  // Safety check: verify customer belongs to this shop
  const { data: customer } = await supabase
    .from('customers')
    .select('id, name, phone')
    .eq('id', id)
    .eq('shop_id', user.shop_id!)
    .single();

  if (!customer) {
    return { error: 'Customer not found.' };
  }

  // Check for outstanding udhaar balance
  const { data: latestLedger } = await supabase
    .from('udhaar_ledger')
    .select('balance_after')
    .eq('shop_id', user.shop_id!)
    .eq('customer_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestLedger && latestLedger.balance_after > 0) {
    return {
      error: `Cannot delete customer "${customer.name}" — they have an outstanding Udhaar balance of Rs. ${(latestLedger.balance_after / 100).toLocaleString()}. Please settle the balance first.`,
    };
  }

  // Soft delete (preserves sales history and ledger references)
  const { error } = await supabase
    .from('customers')
    .update({ is_active: false })
    .eq('id', id)
    .eq('shop_id', user.shop_id!);

  if (error) {
    return { error: 'Failed to delete customer.' };
  }

  // Audit log
  await supabase.from('audit_logs').insert({
    shop_id: user.shop_id,
    user_id: user.id,
    action: 'customer_deactivate',
    entity_type: 'customer',
    entity_id: id,
    metadata: { name: customer.name, phone: customer.phone },
  });

  revalidatePath('/customers');
  return { success: true };
}
