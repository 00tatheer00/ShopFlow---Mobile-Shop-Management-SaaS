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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getNextDisplayShopId(db: any): Promise<string> {
  const { data: shops } = await db
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
 * Super Admin Action: Check if an owner email or shop email is already taken
 */
export async function checkShopEmailAvailabilityAction(ownerEmail: string, shopOfficialEmail?: string) {
  await requireSuperAdmin();
  const supabase = await createClient();
  const adminClient = getAdminClient();
  const db = adminClient || supabase;

  const normalizedOwner = ownerEmail.trim().toLowerCase();

  // 1. Check profiles for existing user account
  const { data: profile } = await db
    .from('profiles')
    .select('id, full_name, email')
    .eq('email', normalizedOwner)
    .maybeSingle();

  if (profile) {
    // Check which shop they are attached to
    const { data: su } = await db
      .from('shop_users')
      .select('shop_id, shops(name, display_shop_id, deleted_at)')
      .eq('user_id', profile.id)
      .maybeSingle();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const shopName = (su?.shops as any)?.name || 'an existing shop';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const displayId = (su?.shops as any)?.display_shop_id || '';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isTrashed = !!(su?.shops as any)?.deleted_at;

    return {
      available: false,
      field: 'owner_email',
      error: `An owner account with "${normalizedOwner}" already exists for ${shopName} ${displayId ? `(${displayId})` : ''}${isTrashed ? ' [in Trash]' : ''}. It is not possible to create a shop with existing email credentials. Please change it so it won't conflict, or permanently delete the old shop.`,
    };
  }

  // 2. Check auth.users directly via admin client
  if (adminClient && 'auth' in adminClient && adminClient.auth?.admin) {
    try {
      const { data: userList } = await adminClient.auth.admin.listUsers();
      const existingAuth = userList?.users?.find(
        (u) => u.email?.toLowerCase() === normalizedOwner
      );
      if (existingAuth) {
        return {
          available: false,
          field: 'owner_email',
          error: `The email "${normalizedOwner}" is already registered in the database credentials. It is not possible to reuse this email. Please change it so it won't conflict.`,
        };
      }
    } catch (e) {
      console.warn('Error checking auth user list:', e);
    }
  }

  // 3. If shopOfficialEmail is provided, check existing shops
  if (shopOfficialEmail && shopOfficialEmail.trim()) {
    const normalizedShopEmail = shopOfficialEmail.trim().toLowerCase();
    const { data: existingShop } = await db
      .from('shops')
      .select('id, name, display_shop_id')
      .eq('email', normalizedShopEmail)
      .maybeSingle();

    if (existingShop) {
      return {
        available: false,
        field: 'email',
        error: `A shop with official email "${normalizedShopEmail}" already exists (${existingShop.name} [${existingShop.display_shop_id}]). Please use a different official email.`,
      };
    }
  }

  return { available: true };
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
  const adminClient = getAdminClient();
  const db = adminClient || supabase;

  // STRICT VALIDATION: Check if a shop or user with this email already exists
  const emailCheck = await checkShopEmailAvailabilityAction(result.data.owner_email, result.data.email);
  if (!emailCheck.available && emailCheck.error) {
    return { error: emailCheck.error };
  }

  // 1. Determine Display Shop ID
  let displayId = result.data.display_shop_id;
  if (displayId) {
    displayId = displayId.trim().toUpperCase();
    const { data: existingShopId } = await db
      .from('shops')
      .select('id')
      .eq('display_shop_id', displayId)
      .maybeSingle();

    if (existingShopId) {
      return { error: `Shop ID "${displayId}" is already taken. Please choose another.` };
    }
  } else {
    displayId = await getNextDisplayShopId(db);
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

  if (adminClient) {
    const { data: newAuthUser, error: authError } = await adminClient.auth.admin.createUser({
      email: result.data.owner_email.toLowerCase(),
      password: result.data.owner_password,
      email_confirm: true,
      user_metadata: {
        full_name: result.data.owner_name,
        phone: result.data.owner_phone || null,
      },
    });

    if (authError || !newAuthUser?.user) {
      console.error('Admin create auth user error:', authError);
      return {
        error: authError?.message || 'Failed to create owner authentication account.',
      };
    }

    ownerUserId = newAuthUser.user.id;

    // Ensure profile row exists
    await db.from('profiles').upsert({
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

  const { data: shop, error: shopError } = await db
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
    return { error: shopError?.message || 'Failed to create shop record.' };
  }

  // 5. Create initial subscription invoice row (Rs. 8,000 / month)
  await db.from('shop_subscriptions').insert({
    shop_id: shop.id,
    billing_month: billingMonth,
    month_name: monthName,
    amount: SUBSCRIPTION_PRICE_PAISAS,
    status: 'unpaid',
    due_date: dueDate,
  });

  // 6. Create default shop settings
  await db.from('shop_settings').insert({
    shop_id: shop.id,
    receipt_header: shop.name,
    receipt_footer: 'Thank you for your business!',
    low_stock_threshold: 5,
    default_payment_method: 'cash',
    invoice_prefix: 'INV',
    next_invoice_number: 1,
  });

  // 7. Link Owner in shop_users
  const { error: shopUserError } = await db.from('shop_users').insert({
    shop_id: shop.id,
    user_id: ownerUserId,
    role: 'shop_owner',
    is_active: true,
  });

  if (shopUserError) {
    console.error('Shop user link error:', shopUserError);
  }

  // 8. Log Super Admin Action in audit_logs
  await db.from('audit_logs').insert({
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
  const db = getAdminClient() || supabase;

  // Fetch shop before update
  const { data: shop } = await db
    .from('shops')
    .select('id, name, status, display_shop_id')
    .eq('id', result.data.shop_id)
    .single();

  if (!shop) {
    return { error: 'Shop not found.' };
  }

  const previousStatus = shop.status;

  const { error } = await db
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

  await db.from('audit_logs').insert({
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
  const db = getAdminClient() || supabase;

  const { error } = await db
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

  await db.from('audit_logs').insert({
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
  const db = getAdminClient() || supabase;
  const { data: shop } = await db
    .from('shops')
    .select('id, name')
    .eq('id', parsed.data.shop_id)
    .single();

  if (!shop) {
    return { error: 'Shop not found.' };
  }

  const now = new Date().toISOString();
  const { error } = await db
    .from('shops')
    .update({
      deleted_at: now,
      deleted_by: admin.id,
    })
    .eq('id', parsed.data.shop_id);

  if (error) {
    return { error: 'Failed to move shop to trash.' };
  }

  await db.from('audit_logs').insert({
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
  const db = getAdminClient() || supabase;
  const { data: shop } = await db
    .from('shops')
    .select('id, name')
    .eq('id', parsed.data.shop_id)
    .single();

  if (!shop) {
    return { error: 'Shop not found.' };
  }

  const { error } = await db
    .from('shops')
    .update({
      deleted_at: null,
      deleted_by: null,
    })
    .eq('id', parsed.data.shop_id);

  if (error) {
    return { error: 'Failed to restore shop.' };
  }

  await db.from('audit_logs').insert({
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
 * Internal Helper: Deeply and permanently remove a shop, all child records,
 * and associated auth credentials from auth.users and profiles
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function executePermanentShopDeletion(db: any, shopId: string) {
  const adminClient = getAdminClient();
  const client = adminClient || db;

  // 1. Collect all users belonging to this shop
  const { data: shopUsers } = await client
    .from('shop_users')
    .select('user_id, role')
    .eq('shop_id', shopId);

  // 2. Cascade delete all relational data in strict foreign-key order
  const { data: sales } = await client.from('sales').select('id').eq('shop_id', shopId);
  if (sales && sales.length > 0) {
    const saleIds = sales.map((s: { id: string }) => s.id);
    await client.from('sale_items').delete().in('sale_id', saleIds);
  }
  await client.from('sales').delete().eq('shop_id', shopId);

  const { data: purchases } = await client.from('purchases').select('id').eq('shop_id', shopId);
  if (purchases && purchases.length > 0) {
    const purchaseIds = purchases.map((p: { id: string }) => p.id);
    await client.from('purchase_items').delete().in('purchase_id', purchaseIds);
  }
  await client.from('purchases').delete().eq('shop_id', shopId);

  await client.from('udhaar_ledger').delete().eq('shop_id', shopId);
  await client.from('payments').delete().eq('shop_id', shopId);
  await client.from('stock_adjustments').delete().eq('shop_id', shopId);
  await client.from('imei_records').delete().eq('shop_id', shopId);
  await client.from('products').delete().eq('shop_id', shopId);
  await client.from('brands').delete().eq('shop_id', shopId);
  await client.from('product_categories').delete().eq('shop_id', shopId);
  await client.from('expenses').delete().eq('shop_id', shopId);
  await client.from('expense_categories').delete().eq('shop_id', shopId);
  await client.from('customers').delete().eq('shop_id', shopId);
  await client.from('suppliers').delete().eq('shop_id', shopId);
  await client.from('shop_settings').delete().eq('shop_id', shopId);
  await client.from('shop_subscriptions').delete().eq('shop_id', shopId);
  await client.from('email_logs').delete().eq('shop_id', shopId);
  await client.from('audit_logs').delete().eq('shop_id', shopId);
  await client.from('shop_users').delete().eq('shop_id', shopId);

  // 3. Delete the shop row itself
  await client.from('shops').delete().eq('id', shopId);

  // 4. Run stored procedure as supplemental cleanup if present
  try {
    await client.rpc('delete_shop_permanently', { p_shop_id: shopId });
  } catch {
    // Ignore RPC failure if direct delete succeeded
  }

  // 5. Hard delete auth accounts and profiles for non-super-admin users belonging only to this shop
  if (adminClient && 'auth' in adminClient && adminClient.auth?.admin && shopUsers && shopUsers.length > 0) {
    for (const su of shopUsers) {
      if (su.role === 'super_admin') continue;

      // Check if user is associated with any other shop
      const { data: otherShops } = await client
        .from('shop_users')
        .select('id')
        .eq('user_id', su.user_id)
        .neq('shop_id', shopId);

      if (!otherShops || otherShops.length === 0) {
        try {
          await adminClient.auth.admin.deleteUser(su.user_id);
        } catch (e) {
          console.warn('Failed to delete auth account:', su.user_id, e);
        }
        try {
          await client.from('profiles').delete().eq('id', su.user_id);
        } catch (e) {
          console.warn('Failed to delete profile:', su.user_id, e);
        }
      }
    }
  }
}

/**
 * Super Admin Action: Permanently delete a shop and all associated data
 */
export async function permanentDeleteShopAction(payload: {
  shop_id: string;
  confirm_name?: string;
}) {
  const admin = await requireSuperAdmin();
  const supabase = await createClient();
  const adminClient = getAdminClient();
  const db = adminClient || supabase;

  const { data: shop } = await db
    .from('shops')
    .select('id, name')
    .eq('id', payload.shop_id)
    .single();

  if (!shop) {
    return { error: 'Shop not found.' };
  }

  if (payload.confirm_name && shop.name.trim().toLowerCase() !== payload.confirm_name.trim().toLowerCase()) {
    return { error: `Confirmation name does not match "${shop.name}".` };
  }

  try {
    await executePermanentShopDeletion(db, payload.shop_id);

    await db.from('audit_logs').insert({
      shop_id: null,
      user_id: admin.id,
      action: 'shop_permanently_deleted',
      entity_type: 'shop',
      entity_id: payload.shop_id,
      metadata: {
        shop_name: shop.name,
        deleted_by_admin: admin.email,
      },
    });

    revalidatePath('/admin/shops');
    revalidatePath('/admin/dashboard');

    return { success: true };
  } catch (err: unknown) {
    console.error('Permanent delete error:', err);
    const msg = err instanceof Error ? err.message : 'Failed to permanently delete shop.';
    return { error: msg };
  }
}

/**
 * Super Admin Action: Purge All Trashed Shops AND Orphaned Auth Credentials
 * Completely clears out deleted shops and unused auth accounts from the database
 */
export async function purgeAllTrashAndOrphansAction() {
  const admin = await requireSuperAdmin();
  const supabase = await createClient();
  const adminClient = getAdminClient();
  const db = adminClient || supabase;

  let purgedShopsCount = 0;
  let purgedUsersCount = 0;

  // 1. Find all soft-deleted shops and permanently delete them
  const { data: trashedShops } = await db
    .from('shops')
    .select('id, name')
    .not('deleted_at', 'is', null);

  if (trashedShops && trashedShops.length > 0) {
    for (const shop of trashedShops) {
      try {
        await executePermanentShopDeletion(db, shop.id);
        purgedShopsCount++;
      } catch (err) {
        console.warn('Error purging shop:', shop.id, err);
      }
    }
  }

  // 2. Scan auth.users for orphaned non-super-admin accounts not linked to any active shop
  if (adminClient && 'auth' in adminClient && adminClient.auth?.admin) {
    try {
      const { data: userList } = await adminClient.auth.admin.listUsers();
      if (userList?.users) {
        for (const u of userList.users) {
          // Never touch super admin
          if (u.email?.toLowerCase() === admin.email?.toLowerCase()) continue;

          // Check if user has any active shop_user association
          const { data: su } = await db
            .from('shop_users')
            .select('id, role')
            .eq('user_id', u.id)
            .maybeSingle();

          if (su?.role === 'super_admin') continue;

          if (!su) {
            // Orphaned auth user! Delete from auth.users and profiles
            try {
              await adminClient.auth.admin.deleteUser(u.id);
              await db.from('profiles').delete().eq('id', u.id);
              purgedUsersCount++;
            } catch (err) {
              console.warn('Failed to delete orphaned user:', u.id, err);
            }
          }
        }
      }
    } catch (err) {
      console.warn('Error listing auth users for cleanup:', err);
    }
  }

  revalidatePath('/admin/shops');
  revalidatePath('/admin/dashboard');

  return {
    success: true,
    purgedShopsCount,
    purgedUsersCount,
  };
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

/**
 * Super Admin Action: Clear all past audit activity logs
 */
export async function clearAuditLogsAction() {
  await requireSuperAdmin();
  const supabase = await createClient();
  const adminClient = getAdminClient() || supabase;

  const { error } = await adminClient
    .from('audit_logs')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (error) {
    return { error: 'Failed to clear activity logs: ' + error.message };
  }

  revalidatePath('/admin/dashboard');
  revalidatePath('/admin/settings');

  return { success: true };
}
