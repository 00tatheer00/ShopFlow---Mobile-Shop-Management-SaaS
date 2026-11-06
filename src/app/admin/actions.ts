'use server';

import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { requireSuperAdmin } from '@/lib/auth';
import {
  createShopSchema,
  updateShopStatusSchema,
  updateShopPlanSchema,
  softDeleteShopSchema,
  restoreShopSchema,
  permanentDeleteShopSchema,
} from '@/lib/validations';
import { SUBSCRIPTION_PRICE_PAISAS } from '@/lib/constants';
import { revalidatePath } from 'next/cache';

/**
 * Helper to generate the next display shop ID (e.g. SHOP-001, SHOP-002)
 */
async function getNextDisplayShopId(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string> {
  const { data: shops } = await supabase
    .from('shops')
    .select('display_shop_id')
    .not('display_shop_id', 'is', null);

  let maxNum = 0;
  if (shops && shops.length > 0) {
    for (const s of shops) {
      if (s.display_shop_id && s.display_shop_id.startsWith('SHOP-')) {
        const numPart = parseInt(s.display_shop_id.replace('SHOP-', ''), 10);
        if (!isNaN(numPart) && numPart > maxNum) {
          maxNum = numPart;
        }
      }
    }
  }

  const nextNum = maxNum + 1;
  return `SHOP-${String(nextNum).padStart(3, '0')}`;
}

/**
 * Super Admin Action: Provision a new Shop, Settings, and Owner Account
 */
export async function createShopAction(formData: FormData) {
  const admin = await requireSuperAdmin();

  const raw = {
    name: formData.get('name') as string,
    display_shop_id: (formData.get('display_shop_id') as string) || undefined,
    city: formData.get('city') as string,
    address: (formData.get('address') as string) || undefined,
    phone: (formData.get('phone') as string) || undefined,
    email: (formData.get('email') as string) || undefined,
    plan_id: (formData.get('plan_id') as string) || undefined,
    status: ((formData.get('status') as string) || 'active') as 'active' | 'suspended' | 'deactivated',
    owner_name: formData.get('owner_name') as string,
    owner_email: formData.get('owner_email') as string,
    owner_password: formData.get('owner_password') as string,
    owner_phone: (formData.get('owner_phone') as string) || undefined,
  };

  const result = createShopSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const supabase = await createClient();

  // 1. Determine Display Shop ID
  let displayId = result.data.display_shop_id;
  if (displayId) {
    displayId = displayId.trim().toUpperCase();
    const { data: existingShopId } = await supabase
      .from('shops')
      .select('id')
      .eq('display_shop_id', displayId)
      .maybeSingle();

    if (existingShopId) {
      return { error: `Shop ID "${displayId}" is already taken. Please choose another.` };
    }
  } else {
    displayId = await getNextDisplayShopId(supabase);
  }

  // 2. Generate unique slug
  const baseSlug = result.data.name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 30);
  const rand = Math.floor(1000 + Math.random() * 9000);
  const slug = `${baseSlug || 'shop'}-${rand}`;

  // 3. Provision Owner Account
  let ownerUserId: string | null = null;
  const adminClient = getAdminClient();

  // Check if owner already exists in profiles
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', result.data.owner_email.toLowerCase())
    .maybeSingle();

  if (existingProfile) {
    ownerUserId = existingProfile.id;
  } else if (adminClient) {
    // Create new Supabase Auth user with admin client
    const { data: newAuthUser, error: authError } = await adminClient.auth.admin.createUser({
      email: result.data.owner_email.toLowerCase(),
      password: result.data.owner_password,
      email_confirm: true,
      user_metadata: {
        full_name: result.data.owner_name,
        phone: result.data.owner_phone || null,
      },
    });

    if (authError || !newAuthUser.user) {
      console.error('Admin create auth user error:', authError);
      return {
        error: authError?.message || 'Failed to create owner authentication account.',
      };
    }

    ownerUserId = newAuthUser.user.id;

    // Ensure profile row exists (if trigger didn't fire)
    await adminClient.from('profiles').upsert({
      id: ownerUserId,
      email: result.data.owner_email.toLowerCase(),
      full_name: result.data.owner_name,
      phone: result.data.owner_phone || null,
    });
  } else {
    return {
      error:
        'Service role key is not configured. Please set SUPABASE_SERVICE_ROLE_KEY to provision new user accounts.',
    };
  }

  // 4. Compute Subscription Expiry and Insert Shop Record
  const now = new Date();
  const billingMonth = now.toISOString().slice(0, 7);
  const monthName = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 7);
  const dueDate = nextMonth.toISOString().split('T')[0];

  const { data: shop, error: shopError } = await supabase
    .from('shops')
    .insert({
      name: result.data.name,
      slug,
      display_shop_id: displayId,
      city: result.data.city,
      address: result.data.address || null,
      phone: result.data.phone || null,
      email: result.data.email || null,
      status: result.data.status || 'active',
      plan_id: result.data.plan_id || null,
      subscription_status: 'active',
      subscription_started_at: now.toISOString(),
      subscription_expires_at: nextMonth.toISOString(),
    })
    .select('id, name, display_shop_id')
    .single();

  if (shopError || !shop) {
    console.error('Create shop error:', shopError);
    return { error: 'Failed to create shop record.' };
  }

  // 5. Create initial subscription invoice row (Rs. 8,000 / month)
  await supabase.from('shop_subscriptions').insert({
    shop_id: shop.id,
    billing_month: billingMonth,
    month_name: monthName,
    amount: SUBSCRIPTION_PRICE_PAISAS,
    status: 'unpaid',
    due_date: dueDate,
  });

  // 6. Create default shop settings
  await supabase.from('shop_settings').insert({
    shop_id: shop.id,
    receipt_header: shop.name,
    receipt_footer: 'Thank you for your business!',
    low_stock_threshold: 5,
    default_payment_method: 'cash',
    invoice_prefix: 'INV',
    next_invoice_number: 1,
  });

  // 7. Link Owner in shop_users
  const { error: shopUserError } = await supabase.from('shop_users').insert({
    shop_id: shop.id,
    user_id: ownerUserId,
    role: 'shop_owner',
    is_active: true,
  });

  if (shopUserError) {
    console.error('Shop user link error:', shopUserError);
  }

  // 8. Log Super Admin Action in audit_logs
  await supabase.from('audit_logs').insert({
    shop_id: shop.id,
    user_id: admin.id,
    action: 'shop_created',
    entity_type: 'shop',
    entity_id: shop.id,
    metadata: {
      shop_name: shop.name,
      display_shop_id: shop.display_shop_id,
      owner_email: result.data.owner_email,
      plan_id: result.data.plan_id || null,
      created_by_admin: admin.email,
    },
  });

  revalidatePath('/admin/shops');
  revalidatePath('/admin/dashboard');
  revalidatePath('/admin/subscriptions');

  return {
    success: true,
    shopId: shop.id,
    displayShopId: shop.display_shop_id,
  };
}

/**
 * Super Admin Action: Update Shop Status (Activate, Suspend, Deactivate)
 */
export async function updateShopStatusAction(payload: {
  shop_id: string;
  status: 'active' | 'suspended' | 'deactivated';
  reason?: string;
}) {
  const admin = await requireSuperAdmin();

  const result = updateShopStatusSchema.safeParse(payload);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const supabase = await createClient();

  // Fetch shop before update
  const { data: shop } = await supabase
    .from('shops')
    .select('id, name, status, display_shop_id')
    .eq('id', result.data.shop_id)
    .single();

  if (!shop) {
    return { error: 'Shop not found.' };
  }

  const previousStatus = shop.status;

  const { error } = await supabase
    .from('shops')
    .update({ status: result.data.status })
    .eq('id', result.data.shop_id);

  if (error) {
    return { error: 'Failed to update shop status.' };
  }

  // Map to audit action
  let auditAction = 'shop_updated';
  if (result.data.status === 'active') auditAction = 'shop_activated';
  if (result.data.status === 'suspended') auditAction = 'shop_suspended';
  if (result.data.status === 'deactivated') auditAction = 'shop_deactivated';

  await supabase.from('audit_logs').insert({
    shop_id: shop.id,
    user_id: admin.id,
    action: auditAction,
    entity_type: 'shop',
    entity_id: shop.id,
    metadata: {
      previous_status: previousStatus,
      new_status: result.data.status,
      reason: result.data.reason || null,
      admin_email: admin.email,
    },
  });

  revalidatePath('/admin/shops');
  revalidatePath(`/admin/shops/${shop.id}`);
  revalidatePath('/admin/dashboard');

  return { success: true };
}

/**
 * Super Admin Action: Update Shop Subscription Plan & Expiry
 */
export async function updateShopPlanAction(payload: {
  shop_id: string;
  plan_id: string;
  subscription_expires_at?: string;
}) {
  const admin = await requireSuperAdmin();

  const result = updateShopPlanSchema.safeParse(payload);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from('shops')
    .update({
      plan_id: result.data.plan_id,
      subscription_expires_at: result.data.subscription_expires_at || null,
      subscription_status: 'active',
    })
    .eq('id', result.data.shop_id);

  if (error) {
    return { error: 'Failed to update subscription plan.' };
  }

  await supabase.from('audit_logs').insert({
    shop_id: result.data.shop_id,
    user_id: admin.id,
    action: 'shop_updated',
    entity_type: 'shop',
    entity_id: result.data.shop_id,
    metadata: {
      type: 'plan_changed',
      plan_id: result.data.plan_id,
      expires_at: result.data.subscription_expires_at || null,
      admin_email: admin.email,
    },
  });

  revalidatePath('/admin/shops');
  revalidatePath(`/admin/shops/${result.data.shop_id}`);

  return { success: true };
}

/**
 * Super Admin Action: Trigger Password Reset Email for Shop Owner
 */
export async function sendOwnerPasswordResetAction(email: string, shopId: string) {
  const admin = await requireSuperAdmin();
  const supabase = await createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
  });

  if (error) {
    return { error: 'Could not send reset password email.' };
  }

  await supabase.from('audit_logs').insert({
    shop_id: shopId,
    user_id: admin.id,
    action: 'user_updated',
    entity_type: 'user',
    metadata: {
      action: 'owner_password_reset_sent',
      target_email: email,
      admin_email: admin.email,
    },
  });

  return { success: true };
}

/**
 * Super Admin Action: Soft-delete a shop (move to Trash with 30-day retention)
 */
export async function softDeleteShopAction(payload: { shop_id: string }) {
  const admin = await requireSuperAdmin();
  const parsed = softDeleteShopSchema.safeParse(payload);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { data: shop } = await supabase
    .from('shops')
    .select('id, name')
    .eq('id', parsed.data.shop_id)
    .single();

  if (!shop) {
    return { error: 'Shop not found.' };
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from('shops')
    .update({
      deleted_at: now,
      deleted_by: admin.id,
    })
    .eq('id', parsed.data.shop_id);

  if (error) {
    return { error: 'Failed to move shop to trash.' };
  }

  await supabase.from('audit_logs').insert({
    shop_id: shop.id,
    user_id: admin.id,
    action: 'shop_deleted',
    entity_type: 'shop',
    entity_id: shop.id,
    metadata: {
      shop_name: shop.name,
      deleted_at: now,
      deleted_by_admin: admin.email,
    },
  });

  revalidatePath('/admin/shops');
  revalidatePath('/admin/dashboard');

  return { success: true };
}

/**
 * Super Admin Action: Restore a soft-deleted shop from Trash
 */
export async function restoreShopAction(payload: { shop_id: string }) {
  const admin = await requireSuperAdmin();
  const parsed = restoreShopSchema.safeParse(payload);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { data: shop } = await supabase
    .from('shops')
    .select('id, name')
    .eq('id', parsed.data.shop_id)
    .single();

  if (!shop) {
    return { error: 'Shop not found.' };
  }

  const { error } = await supabase
    .from('shops')
    .update({
      deleted_at: null,
      deleted_by: null,
    })
    .eq('id', parsed.data.shop_id);

  if (error) {
    return { error: 'Failed to restore shop.' };
  }

  await supabase.from('audit_logs').insert({
    shop_id: shop.id,
    user_id: admin.id,
    action: 'shop_restored',
    entity_type: 'shop',
    entity_id: shop.id,
    metadata: {
      shop_name: shop.name,
      restored_by_admin: admin.email,
    },
  });

  revalidatePath('/admin/shops');
  revalidatePath('/admin/dashboard');

  return { success: true };
}

/**
 * Super Admin Action: Permanently delete a shop and all associated data
 */
export async function permanentDeleteShopAction(payload: {
  shop_id: string;
  confirm_name: string;
}) {
  const admin = await requireSuperAdmin();
  const parsed = permanentDeleteShopSchema.safeParse(payload);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { data: shop } = await supabase
    .from('shops')
    .select('id, name')
    .eq('id', parsed.data.shop_id)
    .single();

  if (!shop) {
    return { error: 'Shop not found.' };
  }

  if (shop.name.trim().toLowerCase() !== parsed.data.confirm_name.trim().toLowerCase()) {
    return { error: `Confirmation name does not match "${shop.name}".` };
  }

  const adminClient = getAdminClient() || supabase;
  const { error: rpcError } = await adminClient.rpc('delete_shop_permanently', {
    p_shop_id: parsed.data.shop_id,
  });

  if (rpcError) {
    console.error('Permanent delete RPC error:', rpcError);
    return { error: 'Failed to permanently delete shop: ' + rpcError.message };
  }

  await supabase.from('audit_logs').insert({
    shop_id: null,
    user_id: admin.id,
    action: 'shop_permanently_deleted',
    entity_type: 'shop',
    entity_id: parsed.data.shop_id,
    metadata: {
      shop_name: shop.name,
      deleted_by_admin: admin.email,
    },
  });

  revalidatePath('/admin/shops');
  revalidatePath('/admin/dashboard');

  return { success: true };
}

/**
 * Super Admin Action: Lazy Purge expired trashed shops (older than 30 days)
 */
export async function lazyPurgeExpiredShopsAction() {
  await requireSuperAdmin();
  const supabase = await createClient();
  const adminClient = getAdminClient() || supabase;

  try {
    const { data: count, error } = await adminClient.rpc('purge_expired_trashed_shops');
    if (error) {
      console.warn('Lazy purge error:', error);
      return { purged: 0 };
    }
    if (count && count > 0) {
      revalidatePath('/admin/shops');
      revalidatePath('/admin/dashboard');
    }
    return { purged: count || 0 };
  } catch (err) {
    console.warn('Lazy purge caught error:', err);
    return { purged: 0 };
  }
}
