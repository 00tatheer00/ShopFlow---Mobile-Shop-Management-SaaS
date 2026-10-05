'use server';

import { createClient } from '@/lib/supabase/server';
import { requireShopAccess, hasPermission } from '@/lib/auth';
import { supplierSchema } from '@/lib/validations';
import { revalidatePath } from 'next/cache';

export async function createSupplier(formData: FormData) {
  const user = await requireShopAccess();
  if (!hasPermission(user.role, 'purchases:create')) {
    return { error: 'You do not have permission to add suppliers.' };
  }

  const raw = {
    name: formData.get('name') as string,
    phone: (formData.get('phone') as string) || undefined,
    company: (formData.get('company') as string) || undefined,
    email: (formData.get('email') as string) || undefined,
    address: (formData.get('address') as string) || undefined,
    notes: (formData.get('notes') as string) || undefined,
  };

  const result = supplierSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const supabase = await createClient();

  const { data: supplier, error } = await supabase
    .from('suppliers')
    .insert({
      shop_id: user.shop_id,
      name: result.data.name,
      phone: result.data.phone || null,
      company: result.data.company || null,
      email: result.data.email || null,
      address: result.data.address || null,
      notes: result.data.notes || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Create supplier error:', error);
    return { error: 'Failed to add supplier. Please try again.' };
  }

  revalidatePath('/suppliers');
  return { success: true, supplier };
}

export async function updateSupplier(id: string, formData: FormData) {
  const user = await requireShopAccess();
  if (!hasPermission(user.role, 'purchases:create')) {
    return { error: 'You do not have permission to edit suppliers.' };
  }

  const raw = {
    name: formData.get('name') as string,
    phone: (formData.get('phone') as string) || undefined,
    company: (formData.get('company') as string) || undefined,
    email: (formData.get('email') as string) || undefined,
    address: (formData.get('address') as string) || undefined,
    notes: (formData.get('notes') as string) || undefined,
  };

  const result = supplierSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from('suppliers')
    .update({
      name: result.data.name,
      phone: result.data.phone || null,
      company: result.data.company || null,
      email: result.data.email || null,
      address: result.data.address || null,
      notes: result.data.notes || null,
    })
    .eq('id', id)
    .eq('shop_id', user.shop_id!);

  if (error) {
    return { error: 'Failed to update supplier.' };
  }

  revalidatePath('/suppliers');
  return { success: true };
}

export async function deleteSupplier(id: string) {
  const user = await requireShopAccess();
  if (user.role !== 'shop_owner' && user.role !== 'manager') {
    return { error: 'You do not have permission to delete suppliers.' };
  }

  const supabase = await createClient();

  // Soft delete
  const { error } = await supabase
    .from('suppliers')
    .update({ is_active: false })
    .eq('id', id)
    .eq('shop_id', user.shop_id!);

  if (error) {
    return { error: 'Failed to delete supplier.' };
  }

  revalidatePath('/suppliers');
  return { success: true };
}
