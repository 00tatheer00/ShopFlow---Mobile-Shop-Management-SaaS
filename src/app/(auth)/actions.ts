'use server';

import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { loginSchema } from '@/lib/validations';
import { redirect } from 'next/navigation';

export async function loginAction(formData: FormData) {
  const supabase = await createClient();

  const rawData = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  };

  // Validate input
  const result = loginSchema.safeParse(rawData);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: result.data.email,
    password: result.data.password,
  });

  if (error) {
    return { error: 'Invalid email or password. Please try again.' };
  }

  // Get user role to determine redirect
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Something went wrong. Please try again.' };
  }

  // Fetch role and shop association
  let userRole: string | null = null;
  let userShopId: string | null = null;
  let shopStatus: string | null = null;

  const { data: shopUser } = await supabase
    .from('shop_users')
    .select('role, shop_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle();

  if (shopUser) {
    userRole = shopUser.role;
    userShopId = shopUser.shop_id;
  } else {
    // Privileged fallback for super admin accounts
    const adminClient = getAdminClient();
    if (adminClient) {
      const { data: adminSu } = await adminClient
        .from('shop_users')
        .select('role, shop_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (adminSu) {
        userRole = adminSu.role;
        userShopId = adminSu.shop_id;
      }
    }
  }

  if (!userRole) {
    await supabase.auth.signOut();
    return { error: 'Your account has not been assigned to any shop. Please contact support.' };
  }

  // Check if super admin (Never blocked by lack of shop)
  if (userRole === 'super_admin') {
    redirect('/admin');
  }

  // Check shop status for tenant users
  if (userShopId) {
    const adminClient = getAdminClient() || supabase;
    const { data: shop } = await adminClient
      .from('shops')
      .select('status')
      .eq('id', userShopId)
      .maybeSingle();

    shopStatus = shop?.status || null;
  }

  if (shopStatus === 'suspended') {
    await supabase.auth.signOut();
    return { error: 'Your shop has been suspended. Please contact support.' };
  }

  if (shopStatus === 'deactivated') {
    await supabase.auth.signOut();
    return { error: 'Your shop account has been deactivated. Please contact support.' };
  }

  redirect('/dashboard');
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

export async function forgotPasswordAction(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get('email') as string;

  if (!email) {
    return { error: 'Please enter your email address.' };
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
  });

  if (error) {
    return { error: 'Could not send reset email. Please try again.' };
  }

  return { success: 'Password reset link has been sent to your email.' };
}
