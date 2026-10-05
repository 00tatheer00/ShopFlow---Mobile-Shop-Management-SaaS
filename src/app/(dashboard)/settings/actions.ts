'use server';

import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth';
import { shopProfileSchema, shopSettingsSchema } from '@/lib/validations';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

export async function updateShopProfile(formData: FormData) {
  const user = await requireRole(['shop_owner', 'manager']);

  const raw = {
    name: formData.get('name') as string,
    city: formData.get('city') as string,
    address: (formData.get('address') as string) || undefined,
    phone: (formData.get('phone') as string) || undefined,
    email: (formData.get('email') as string) || undefined,
  };

  const result = shopProfileSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from('shops')
    .update({
      name: result.data.name,
      city: result.data.city,
      address: result.data.address || null,
      phone: result.data.phone || null,
      email: result.data.email || null,
    })
    .eq('id', user.shop_id!);

  if (error) {
    return { error: 'Failed to update shop details.' };
  }

  revalidatePath('/settings');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function updateShopPreferences(formData: FormData) {
  const user = await requireRole(['shop_owner', 'manager']);

  const raw = {
    receipt_header: (formData.get('receipt_header') as string) || undefined,
    receipt_footer: (formData.get('receipt_footer') as string) || undefined,
    low_stock_threshold: Number(formData.get('low_stock_threshold')) || 5,
    default_payment_method: (formData.get('default_payment_method') as string) || 'cash',
    invoice_prefix: (formData.get('invoice_prefix') as string) || 'INV',
  };

  const result = shopSettingsSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from('shop_settings')
    .upsert({
      shop_id: user.shop_id!,
      receipt_header: result.data.receipt_header || null,
      receipt_footer: result.data.receipt_footer || null,
      low_stock_threshold: result.data.low_stock_threshold,
      default_payment_method: result.data.default_payment_method,
      invoice_prefix: result.data.invoice_prefix,
    }, { onConflict: 'shop_id' });

  if (error) {
    return { error: 'Failed to save shop preferences.' };
  }

  revalidatePath('/settings/preferences');
  return { success: true };
}

const addStaffSchema = z.object({
  email: z.string().email('Invalid email address'),
  full_name: z.string().min(2, 'Name is required'),
  role: z.enum(['manager', 'cashier']),
  phone: z.string().optional(),
});

export async function addStaffMember(formData: FormData) {
  const user = await requireRole(['shop_owner']);

  const raw = {
    email: formData.get('email') as string,
    full_name: formData.get('full_name') as string,
    role: (formData.get('role') as string) || 'cashier',
    phone: (formData.get('phone') as string) || undefined,
  };

  const result = addStaffSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const supabase = await createClient();

  // Find if user already has an account by email in profiles
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', result.data.email)
    .maybeSingle();

  if (!profile) {
    return {
      error:
        'User with this email has not signed up yet. Ask them to register first, or provide their existing ShopFlow account email.',
    };
  }

  // Check if user already belongs to shop
  const { data: existingShopUser } = await supabase
    .from('shop_users')
    .select('id')
    .eq('shop_id', user.shop_id!)
    .eq('user_id', profile.id)
    .maybeSingle();

  if (existingShopUser) {
    return { error: 'This user is already a member of your shop.' };
  }

  const { error } = await supabase.from('shop_users').insert({
    shop_id: user.shop_id,
    user_id: profile.id,
    role: result.data.role,
    is_active: true,
  });

  if (error) {
    return { error: 'Failed to assign user to shop.' };
  }

  revalidatePath('/settings/users');
  return { success: true };
}

export async function updateStaffRole(shopUserId: string, role: 'manager' | 'cashier') {
  const user = await requireRole(['shop_owner']);
  const supabase = await createClient();

  const { error } = await supabase
    .from('shop_users')
    .update({ role })
    .eq('id', shopUserId)
    .eq('shop_id', user.shop_id!);

  if (error) {
    return { error: 'Failed to update role.' };
  }

  revalidatePath('/settings/users');
  return { success: true };
}

export async function toggleStaffStatus(shopUserId: string, isActive: boolean) {
  const user = await requireRole(['shop_owner']);
  const supabase = await createClient();

  const { error } = await supabase
    .from('shop_users')
    .update({ is_active: isActive })
    .eq('id', shopUserId)
    .eq('shop_id', user.shop_id!);

  if (error) {
    return { error: 'Failed to update user status.' };
  }

  revalidatePath('/settings/users');
  return { success: true };
}
