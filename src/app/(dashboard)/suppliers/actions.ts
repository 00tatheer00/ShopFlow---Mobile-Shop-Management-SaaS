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
  const normalizedPhone = result.data.phone || null;

  // 1. Duplicate phone detection (if phone is provided)
  if (normalizedPhone) {
    const { data: existingPhone } = await supabase
      .from('suppliers')
      .select('id, name, is_active')
      .eq('shop_id', user.shop_id!)
      .eq('phone', normalizedPhone)
      .maybeSingle();

    if (existingPhone) {
      if (existingPhone.is_active) {
        return {
          error: `A supplier with this phone number already exists: "${existingPhone.name}". Duplicate suppliers are not allowed within the same shop.`,
        };
      } else {
        // Reactivate the archived supplier with updated data
        const { error: reactivateError } = await supabase
          .from('suppliers')
          .update({
            name: result.data.name,
            phone: normalizedPhone,
            company: result.data.company || null,
            email: result.data.email || null,
            address: result.data.address || null,
            notes: result.data.notes || null,
            is_active: true,
          })
          .eq('id', existingPhone.id)
          .eq('shop_id', user.shop_id!);

        if (reactivateError) {
          return { error: 'Failed to reactivate supplier. Please try again.' };
        }

        // Audit log
        await supabase.from('audit_logs').insert({
          shop_id: user.shop_id,
          user_id: user.id,
          action: 'supplier_reactivate',
          entity_type: 'supplier',
          entity_id: existingPhone.id,
          metadata: { name: result.data.name, phone: normalizedPhone },
        });

        revalidatePath('/suppliers');
        return { success: true, reactivated: true };
      }
    }
  }

  // 2. Duplicate name detection within the same shop
  const { data: existingName } = await supabase
    .from('suppliers')
    .select('id, name')
    .eq('shop_id', user.shop_id!)
    .ilike('name', result.data.name.trim())
    .eq('is_active', true)
    .maybeSingle();

  if (existingName) {
    return { error: `A supplier with the name "${result.data.name}" already exists in your shop.` };
  }

  // 3. Insert Supplier
  const { data: supplier, error } = await supabase
    .from('suppliers')
    .insert({
      shop_id: user.shop_id,
      name: result.data.name,
      phone: normalizedPhone,
      company: result.data.company || null,
      email: result.data.email || null,
      address: result.data.address || null,
      notes: result.data.notes || null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return { error: 'A supplier with this phone number already exists.' };
    }
    console.error('Create supplier error:', error);
    return { error: 'Failed to add supplier. Please try again.' };
  }

  // 4. Audit log
  await supabase.from('audit_logs').insert({
    shop_id: user.shop_id,
    user_id: user.id,
    action: 'supplier_create',
    entity_type: 'supplier',
    entity_id: supplier.id,
    metadata: { name: result.data.name, phone: normalizedPhone, company: result.data.company },
  });

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
  const normalizedPhone = result.data.phone || null;

  // Check duplicate phone excluding self
  if (normalizedPhone) {
    const { data: existing } = await supabase
      .from('suppliers')
      .select('id, name')
      .eq('shop_id', user.shop_id!)
      .eq('phone', normalizedPhone)
      .eq('is_active', true)
      .neq('id', id)
      .maybeSingle();

    if (existing) {
      return { error: `Another supplier "${existing.name}" already has this phone number.` };
    }
  }

  const { error } = await supabase
    .from('suppliers')
    .update({
      name: result.data.name,
      phone: normalizedPhone,
      company: result.data.company || null,
      email: result.data.email || null,
      address: result.data.address || null,
      notes: result.data.notes || null,
    })
    .eq('id', id)
    .eq('shop_id', user.shop_id!);

  if (error) {
    if (error.code === '23505') {
      return { error: 'A supplier with this phone number already exists.' };
    }
    return { error: 'Failed to update supplier.' };
  }

  // Audit log
  await supabase.from('audit_logs').insert({
    shop_id: user.shop_id,
    user_id: user.id,
    action: 'supplier_update',
    entity_type: 'supplier',
    entity_id: id,
    metadata: { name: result.data.name, phone: normalizedPhone },
  });

  revalidatePath('/suppliers');
  return { success: true };
}

export async function deleteSupplier(id: string) {
  const user = await requireShopAccess();
  if (user.role !== 'shop_owner' && user.role !== 'manager') {
    return { error: 'You do not have permission to delete suppliers.' };
  }

  const supabase = await createClient();

  // Safety check: verify supplier belongs to this shop
  const { data: supplier } = await supabase
    .from('suppliers')
    .select('id, name, phone')
    .eq('id', id)
    .eq('shop_id', user.shop_id!)
    .single();

  if (!supplier) {
    return { error: 'Supplier not found.' };
  }

  // Soft delete preserves purchase history and foreign key integrity
  const { error } = await supabase
    .from('suppliers')
    .update({ is_active: false })
    .eq('id', id)
    .eq('shop_id', user.shop_id!);

  if (error) {
    return { error: 'Failed to delete supplier.' };
  }

  // Audit log
  await supabase.from('audit_logs').insert({
    shop_id: user.shop_id,
    user_id: user.id,
    action: 'supplier_deactivate',
    entity_type: 'supplier',
    entity_id: id,
    metadata: { name: supplier.name, phone: supplier.phone },
  });

  revalidatePath('/suppliers');
  return { success: true };
}
