'use server';

import { createClient } from '@/lib/supabase/server';
import { requireSuperAdmin } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import {
  generatePaymentApprovedEmail,
  generatePaymentReminderEmail,
  sendAndLogEmail,
} from '@/lib/email';
import { toRupees } from '@/lib/types';

export interface ApprovePaymentPayload {
  subscriptionId: string;
  amountRupees?: number; // Defaults to 6500
  paymentMethod: string; // 'bank_transfer', 'easypaisa', 'jazzcash', 'cash'
  referenceId?: string;  // e.g. TR-8921829
  notes?: string;
  sendEmail?: boolean;
}

/**
 * Super Admin Action: Approve Monthly Payment for a Shop
 */
export async function approveSubscriptionPayment(payload: ApprovePaymentPayload) {
  const user = await requireSuperAdmin();
  const supabase = await createClient();

  // 1. Fetch Subscription and Shop
  const { data: sub, error: subError } = await supabase
    .from('shop_subscriptions')
    .select('*, shop:shops(*)')
    .eq('id', payload.subscriptionId)
    .single();

  if (subError || !sub) {
    return { error: 'Subscription record not found.' };
  }

  const amountPaisas = payload.amountRupees ? payload.amountRupees * 100 : sub.amount || 650000;
  const now = new Date().toISOString();

  // 2. Mark subscription as PAID
  const { error: updateError } = await supabase
    .from('shop_subscriptions')
    .update({
      status: 'paid',
      amount: amountPaisas,
      paid_at: now,
      payment_method: payload.paymentMethod,
      reference_id: payload.referenceId?.trim() || null,
      notes: payload.notes?.trim() || null,
      approved_by: user.id,
      approved_at: now,
      updated_at: now,
    })
    .eq('id', sub.id);

  if (updateError) {
    console.error('Update subscription error:', updateError);
    return { error: 'Failed to approve subscription payment.' };
  }

  // 3. Update Shop's active subscription status & expiry date (end of that billing month + 7 days grace)
  const [yearStr, monthStr] = sub.billing_month.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  // Last day of that month + 7 days grace
  const expiryDate = new Date(year, month, 7, 23, 59, 59).toISOString();

  await supabase
    .from('shops')
    .update({
      subscription_status: 'active',
      subscription_expires_at: expiryDate,
      updated_at: now,
    })
    .eq('id', sub.shop_id);

  // 4. Find Shop Owner contact info to dispatch Confirmation Email
  let ownerEmail = sub.shop?.email;
  let ownerName = sub.shop?.name || 'Shop Owner';

  const { data: shopOwnerUser } = await supabase
    .from('shop_users')
    .select('user_id, role')
    .eq('shop_id', sub.shop_id)
    .eq('role', 'shop_owner')
    .limit(1)
    .single();

  if (shopOwnerUser) {
    const { data: ownerProfile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', shopOwnerUser.user_id)
      .single();

    if (ownerProfile) {
      ownerEmail = ownerProfile.email;
      ownerName = ownerProfile.full_name || ownerName;
    }
  }

  // 5. Send Confirmation Receipt Email if enabled
  if (payload.sendEmail !== false && ownerEmail) {
    const emailHtml = generatePaymentApprovedEmail({
      shopName: sub.shop?.name || 'Your Shop',
      ownerName,
      monthName: sub.month_name,
      amountFormatted: `Rs. ${toRupees(amountPaisas).toLocaleString()}`,
      referenceId: payload.referenceId,
      paymentMethod: payload.paymentMethod,
      approvedDate: new Date().toLocaleDateString('en-PK', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    });

    await sendAndLogEmail({
      shopId: sub.shop_id,
      subscriptionId: sub.id,
      recipientEmail: ownerEmail,
      recipientName: ownerName,
      subject: `Payment Confirmed: Rs. ${toRupees(amountPaisas).toLocaleString()} for ${sub.month_name} — ShopFlow`,
      templateType: 'payment_approved',
      htmlContent: emailHtml,
      sentByUserId: user.id,
      metadata: {
        billing_month: sub.billing_month,
        amount_paisas: amountPaisas,
        reference_id: payload.referenceId,
        payment_method: payload.paymentMethod,
      },
    });
  }

  // 6. Record Audit Log
  await supabase.from('audit_logs').insert({
    shop_id: sub.shop_id,
    user_id: user.id,
    action: 'settings_changed',
    entity_type: 'shop_subscriptions',
    entity_id: sub.id,
    details: {
      action: 'subscription_approved',
      month: sub.billing_month,
      amount_paisas: amountPaisas,
      method: payload.paymentMethod,
      reference_id: payload.referenceId,
      email_dispatched_to: ownerEmail,
    },
  });

  revalidatePath('/admin/subscriptions');
  revalidatePath(`/admin/shops/${sub.shop_id}`);
  revalidatePath('/admin/dashboard');

  return { success: true };
}

/**
 * Super Admin Action: Revoke / Mark Unpaid (if marked by mistake)
 */
export async function revokeSubscriptionPayment(subscriptionId: string) {
  const user = await requireSuperAdmin();
  const supabase = await createClient();

  const { data: sub } = await supabase
    .from('shop_subscriptions')
    .select('id, shop_id, billing_month')
    .eq('id', subscriptionId)
    .single();

  if (!sub) return { error: 'Subscription not found.' };

  const { error } = await supabase
    .from('shop_subscriptions')
    .update({
      status: 'unpaid',
      paid_at: null,
      approved_by: null,
      approved_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', subscriptionId);

  if (error) return { error: 'Failed to revoke payment.' };

  revalidatePath('/admin/subscriptions');
  return { success: true };
}

/**
 * Super Admin Action: Send Subscription Reminder Email to Shop Owner
 */
export async function sendSubscriptionReminder(subscriptionId: string, customNote?: string) {
  const user = await requireSuperAdmin();
  const supabase = await createClient();

  const { data: sub, error } = await supabase
    .from('shop_subscriptions')
    .select('*, shop:shops(*)')
    .eq('id', subscriptionId)
    .single();

  if (error || !sub) return { error: 'Subscription not found.' };

  // Locate shop owner email
  let ownerEmail = sub.shop?.email;
  let ownerName = sub.shop?.name || 'Shopkeeper';

  const { data: shopOwnerUser } = await supabase
    .from('shop_users')
    .select('user_id')
    .eq('shop_id', sub.shop_id)
    .eq('role', 'shop_owner')
    .limit(1)
    .single();

  if (shopOwnerUser) {
    const { data: ownerProfile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', shopOwnerUser.user_id)
      .single();

    if (ownerProfile) {
      ownerEmail = ownerProfile.email;
      ownerName = ownerProfile.full_name || ownerName;
    }
  }

  if (!ownerEmail) {
    return { error: 'No owner email address associated with this shop.' };
  }

  const emailHtml = generatePaymentReminderEmail({
    shopName: sub.shop?.name || 'Your Shop',
    ownerName,
    monthName: sub.month_name,
    amountFormatted: `Rs. ${toRupees(sub.amount).toLocaleString()}`,
    dueDate: new Date(sub.due_date).toLocaleDateString('en-PK', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
    customNote,
  });

  const res = await sendAndLogEmail({
    shopId: sub.shop_id,
    subscriptionId: sub.id,
    recipientEmail: ownerEmail,
    recipientName: ownerName,
    subject: `Subscription Due: Rs. ${toRupees(sub.amount).toLocaleString()} for ${sub.month_name} — ShopFlow`,
    templateType: 'payment_reminder',
    htmlContent: emailHtml,
    sentByUserId: user.id,
    metadata: {
      custom_note: customNote,
      billing_month: sub.billing_month,
    },
  });

  if (!res.success) {
    return { error: 'Failed to send reminder email.' };
  }

  revalidatePath('/admin/subscriptions');
  return { success: true, recipient: ownerEmail };
}

/**
 * Super Admin Action: Generate Invoices for Chosen Month
 */
export async function generateMonthlyBillsAction(month: string, monthName: string, dueDate: string) {
  await requireSuperAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('generate_monthly_shop_subscriptions', {
    p_month: month,
    p_month_name: monthName,
    p_due_date: dueDate,
  });

  if (error) {
    console.error('Error generating bills:', error);
    return { error: 'Failed to generate monthly bills.' };
  }

  revalidatePath('/admin/subscriptions');
  return { success: true, count: data };
}
