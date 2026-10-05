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

  const { data: customer, error } = await supabase
    .from('customers')
    .insert({
      shop_id: user.shop_id,
      name: result.data.name,
      phone: result.data.phone,
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

  const { error } = await supabase
    .from('customers')
    .update({
      name: result.data.name,
      phone: result.data.phone,
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

  // Soft delete
  const { error } = await supabase
    .from('customers')
    .update({ is_active: false })
    .eq('id', id)
    .eq('shop_id', user.shop_id!);

  if (error) {
    return { error: 'Failed to delete customer.' };
  }

  revalidatePath('/customers');
  return { success: true };
}
