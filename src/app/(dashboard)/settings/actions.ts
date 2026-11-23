'use server';

import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { requireRole } from '@/lib/auth';
import { createStaffSchema, shopProfileSchema, shopSettingsSchema } from '@/lib/validations';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const SERVICE_KEY_MISSING =
  'Server is missing SUPABASE_SERVICE_ROLE_KEY. Please contact ShopFlow support.';

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

  // Shop rows are only writable by the platform (RLS), so that shop users can
  // never change their own status/subscription. After the role check above we
  // update ONLY the profile columns with the server admin client.
  // (Before this fix the update silently changed 0 rows and still said "saved".)
  const admin = getAdminClient();
  if (!admin) return { error: SERVICE_KEY_MISSING };

  const { data: updated, error } = await admin
    .from('shops')
    .update({
      name: result.data.name,
      city: result.data.city,
      address: result.data.address || null,
      phone: result.data.phone || null,
      email: result.data.email || null,
    })
    .eq('id', user.shop_id!)
    .select('id');

  if (error || !updated || updated.length === 0) {
    return { error: 'Failed to update shop details.' };
  }

  revalidatePath('/settings');
  revalidatePath('/', 'layout');
  return { success: true };
}

export async function updateShopPreferences(formData: FormData) {
  const user = await requireRole(['shop_owner', 'manager']);

  const thresholdRaw = formData.get('low_stock_threshold');
  const raw = {
    receipt_header: (formData.get('receipt_header') as string) || undefined,
    receipt_footer: (formData.get('receipt_footer') as string) || undefined,
    low_stock_threshold:
      thresholdRaw === null || String(thresholdRaw).trim() === '' ? 5 : Number(thresholdRaw),
    default_payment_method: (formData.get('default_payment_method') as string) || 'cash',
    invoice_prefix: ((formData.get('invoice_prefix') as string) || 'INV').toUpperCase().replace(/[^A-Z0-9]/g, '') || 'INV',
  };

  const result = shopSettingsSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  // RLS only lets the owner write shop_settings; managers are allowed by the
  // page, so write through the admin client after the role check.
  const client = getAdminClient() ?? (await createClient());

  const { error } = await client.from('shop_settings').upsert(
    {
      shop_id: user.shop_id!,
      receipt_header: result.data.receipt_header || null,
      receipt_footer: result.data.receipt_footer || null,
      low_stock_threshold: result.data.low_stock_threshold,
      default_payment_method: result.data.default_payment_method,
      invoice_prefix: result.data.invoice_prefix,
    },
    { onConflict: 'shop_id' }
  );

  if (error) {
    return { error: 'Failed to save shop preferences.' };
  }

  revalidatePath('/settings/preferences');
  revalidatePath('/sales/new');
  return { success: true };
}

/**
 * Add a staff member. Creates the login (email + password) directly, because
 * asking shop staff to "sign up first" never worked: there is no sign-up page
 * and RLS hides other users' profiles from the owner.
 */
export async function addStaffMember(formData: FormData) {
  const user = await requireRole(['shop_owner']);

  const raw = {
    full_name: ((formData.get('full_name') as string) || '').trim(),
    email: ((formData.get('email') as string) || '').trim().toLowerCase(),
    password: (formData.get('password') as string) || '',
    phone: (formData.get('phone') as string) || undefined,
    role: (formData.get('role') as string) || 'cashier',
  };

  const result = createStaffSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const admin = getAdminClient();
  if (!admin) return { error: SERVICE_KEY_MISSING };

  // Existing account?
  const { data: profile } = await admin
    .from('profiles')
    .select('id')
    .eq('email', result.data.email)
    .maybeSingle();

  let userId = profile?.id as string | undefined;

  if (userId) {
    const { data: memberships } = await admin
      .from('shop_users')
      .select('shop_id, is_active')
      .eq('user_id', userId);
    if (memberships?.some((m) => m.shop_id === user.shop_id)) {
      return { error: 'This person is already in your staff list.' };
    }
    if (memberships?.some((m) => m.is_active)) {
      return { error: 'This email is already used by another shop. Please use a different email.' };
    }
  } else {
    const { data: created, error: authError } = await admin.auth.admin.createUser({
      email: result.data.email,
      password: result.data.password,
      email_confirm: true,
      user_metadata: { full_name: result.data.full_name, phone: result.data.phone || null },
    });
    if (authError || !created.user) {
      return { error: authError?.message || 'Could not create the staff login.' };
    }
    userId = created.user.id;
    await admin.from('profiles').upsert({
      id: userId,
      email: result.data.email,
      full_name: result.data.full_name,
      phone: result.data.phone || null,
    });
  }

  const { error } = await admin.from('shop_users').insert({
    shop_id: user.shop_id,
    user_id: userId,
    role: result.data.role,
    is_active: true,
  });

  if (error) {
    return { error: 'Failed to add staff member to your shop.' };
  }

  await admin.from('audit_logs').insert({
    shop_id: user.shop_id,
    user_id: user.id,
    action: 'user_created',
    entity_type: 'user',
    entity_id: userId,
    metadata: { email: result.data.email, role: result.data.role },
  });

  revalidatePath('/settings/users');
  return { success: true };
}

const staffRoleSchema = z.enum(['manager', 'cashier']);

/** Load a staff row of the caller's shop that the owner is allowed to change. */
async function getEditableStaff(shopUserId: string, ownerId: string, shopId: string) {
  const supabase = await createClient();
  const { data: member } = await supabase
    .from('shop_users')
    .select('id, user_id, role')
    .eq('id', shopUserId)
    .eq('shop_id', shopId)
    .maybeSingle();

  if (!member) return { error: 'Staff member not found.' } as const;
  if (member.user_id === ownerId) return { error: 'You cannot change your own account here.' } as const;
  if (member.role === 'shop_owner' || member.role === 'super_admin') {
    return { error: 'The shop owner account cannot be changed here.' } as const;
  }
  return { member, supabase } as const;
}

export async function updateStaffRole(shopUserId: string, role: 'manager' | 'cashier') {
  const user = await requireRole(['shop_owner']);

  // Server actions can be called with ANY argument from the browser —
  // never trust `role` without validating it.
  const parsedRole = staffRoleSchema.safeParse(role);
  if (!parsedRole.success) return { error: 'Invalid role.' };

  const found = await getEditableStaff(shopUserId, user.id, user.shop_id!);
  if ('error' in found) return { error: found.error };

  const { error } = await found.supabase
    .from('shop_users')
    .update({ role: parsedRole.data })
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

  const found = await getEditableStaff(shopUserId, user.id, user.shop_id!);
  if ('error' in found) return { error: found.error };

  const { error } = await found.supabase
    .from('shop_users')
    .update({ is_active: Boolean(isActive) })
    .eq('id', shopUserId)
    .eq('shop_id', user.shop_id!);

  if (error) {
    return { error: 'Failed to update user status.' };
  }

  revalidatePath('/settings/users');
  return { success: true };
}

/** Owner sets a new password for a staff member (e.g. cashier forgot it). */
export async function resetStaffPassword(shopUserId: string, newPassword: string) {
  const user = await requireRole(['shop_owner']);

  if (typeof newPassword !== 'string' || newPassword.length < 8) {
    return { error: 'Password must be at least 8 characters.' };
  }

  const found = await getEditableStaff(shopUserId, user.id, user.shop_id!);
  if ('error' in found) return { error: found.error };

  const admin = getAdminClient();
  if (!admin) return { error: SERVICE_KEY_MISSING };

  const { error } = await admin.auth.admin.updateUserById(found.member.user_id, { password: newPassword });
  if (error) return { error: 'Could not change password. Please try again.' };

  return { success: true };
}
