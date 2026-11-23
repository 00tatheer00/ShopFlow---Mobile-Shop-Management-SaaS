// ============================================
// ShopFlow — Email Dispatch & Notification Service
// ============================================

import nodemailer from 'nodemailer';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { SHOPFLOW_PAYMENT_CHANNELS } from '@/lib/payment-channels';

export { SHOPFLOW_PAYMENT_CHANNELS };

export interface SendEmailParams {
  shopId: string;
  subscriptionId?: string;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  templateType: 'payment_approved' | 'payment_reminder' | 'monthly_invoice' | 'shop_welcome';
  htmlContent: string;
  /** Version stored in email_logs (e.g. with the password masked). Defaults to htmlContent. */
  logHtml?: string;
  metadata?: Record<string, unknown>;
  sentByUserId?: string;
}

/** Escape user-provided text before placing it inside email HTML. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Template 1: Payment Approved & Official Receipt Email
 */
export function generatePaymentApprovedEmail({
  shopName,
  ownerName,
  monthName,
  amountFormatted,
  referenceId,
  paymentMethod,
  approvedDate,
}: {
  shopName: string;
  ownerName: string;
  monthName: string;
  amountFormatted: string;
  referenceId?: string | null;
  paymentMethod?: string | null;
  approvedDate: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; margin: 0; padding: 24px; color: #f8fafc; }
    .container { max-width: 600px; margin: 0 auto; background: #1e293b; border-radius: 16px; border: 1px solid #334155; overflow: hidden; }
    .header { background: linear-gradient(135deg, #4f46e5, #7c3aed); padding: 32px 24px; text-align: center; }
    .header h1 { margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
    .header p { margin: 6px 0 0; color: #e0e7ff; font-size: 14px; }
    .content { padding: 32px 24px; }
    .badge { display: inline-block; background: #059669; color: #ffffff; padding: 6px 14px; border-radius: 9999px; font-size: 13px; font-weight: 700; text-transform: uppercase; margin-bottom: 20px; }
    .receipt-box { background: #0f172a; border-radius: 12px; border: 1px solid #334155; padding: 20px; margin: 20px 0; }
    .receipt-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #1e293b; font-size: 14px; }
    .receipt-row:last-child { border-bottom: none; font-weight: 700; font-size: 16px; color: #34d399; }
    .receipt-label { color: #94a3b8; }
    .receipt-value { color: #f8fafc; text-align: right; }
    .footer { padding: 20px 24px; text-align: center; border-top: 1px solid #334155; font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>ShopFlow Technologies</h1>
      <p>Mobile Shop Management SaaS &bull; Official Subscription Receipt</p>
    </div>
    <div class="content">
      <div style="text-align: center;">
        <span class="badge">&#10003; PAYMENT CONFIRMED</span>
      </div>
      <p style="font-size: 16px; color: #e2e8f0;">Dear <strong>${escapeHtml(ownerName)}</strong> (${escapeHtml(shopName)}),</p>
      <p style="color: #94a3b8; line-height: 1.6;">
        We have received and verified your monthly subscription payment for <strong>${escapeHtml(monthName)}</strong>. 
        Your shop account is fully active with uninterrupted access to POS, Inventory, IMEI Tracking, and Udhaar Khata.
      </p>

      <div class="receipt-box">
        <div class="receipt-row">
          <span class="receipt-label">Shop Name:</span>
          <span class="receipt-value">${escapeHtml(shopName)}</span>
        </div>
        <div class="receipt-row">
          <span class="receipt-label">Billing Month:</span>
          <span class="receipt-value">${escapeHtml(monthName)}</span>
        </div>
        <div class="receipt-row">
          <span class="receipt-label">Approval Date:</span>
          <span class="receipt-value">${approvedDate}</span>
        </div>
        <div class="receipt-row">
          <span class="receipt-label">Payment Method:</span>
          <span class="receipt-value">${escapeHtml(paymentMethod || 'Online Bank Transfer / Mobile Wallet')}</span>
        </div>
        ${referenceId ? `
        <div class="receipt-row">
          <span class="receipt-label">Transaction Ref ID:</span>
          <span class="receipt-value">${escapeHtml(referenceId)}</span>
        </div>` : ''}
        <div class="receipt-row">
          <span class="receipt-label">Amount Paid:</span>
          <span class="receipt-value">${amountFormatted}</span>
        </div>
      </div>

      <p style="color: #94a3b8; font-size: 13px; line-height: 1.5;">
        Thank you for choosing ShopFlow to power your mobile shop operations. If you need any assistance, contact our support desk anytime.
      </p>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} ShopFlow Technologies. Hall Road & Hafeez Centre Support Desk.<br>
      Email: support@shopflow.pk &bull; Helpline: ${SHOPFLOW_PAYMENT_CHANNELS.whatsapp}
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Template 2: Payment Reminder & Instructions Email
 */
export function generatePaymentReminderEmail({
  shopName,
  ownerName,
  monthName,
  amountFormatted,
  dueDate,
  customNote,
}: {
  shopName: string;
  ownerName: string;
  monthName: string;
  amountFormatted: string;
  dueDate: string;
  customNote?: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; margin: 0; padding: 24px; color: #f8fafc; }
    .container { max-width: 600px; margin: 0 auto; background: #1e293b; border-radius: 16px; border: 1px solid #334155; overflow: hidden; }
    .header { background: linear-gradient(135deg, #d97706, #b45309); padding: 32px 24px; text-align: center; }
    .header h1 { margin: 0; color: #ffffff; font-size: 22px; font-weight: 800; }
    .header p { margin: 6px 0 0; color: #fef3c7; font-size: 14px; }
    .content { padding: 32px 24px; }
    .amount-box { background: #0f172a; border-radius: 12px; border: 1px solid #f59e0b; padding: 20px; text-align: center; margin: 20px 0; }
    .bank-card { background: #0f172a; border-radius: 12px; border: 1px solid #334155; padding: 18px; margin: 20px 0; }
    .bank-row { margin-bottom: 8px; font-size: 13px; color: #cbd5e1; }
    .bank-row strong { color: #f8fafc; }
    .footer { padding: 20px 24px; text-align: center; border-top: 1px solid #334155; font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>ShopFlow Subscription Notice</h1>
      <p>Monthly SaaS Fee &bull; ${escapeHtml(monthName)}</p>
    </div>
    <div class="content">
      <p style="font-size: 16px; color: #e2e8f0;">Dear <strong>${escapeHtml(ownerName)}</strong> (${escapeHtml(shopName)}),</p>
      <p style="color: #94a3b8; line-height: 1.6;">
        This is a friendly reminder that your ShopFlow monthly software subscription for <strong>${escapeHtml(monthName)}</strong> is currently pending.
      </p>

      <div class="amount-box">
        <div style="font-size: 13px; color: #f59e0b; font-weight: 600; text-transform: uppercase;">Amount Due</div>
        <div style="font-size: 32px; font-weight: 800; color: #ffffff; margin: 6px 0;">${amountFormatted}</div>
        <div style="font-size: 13px; color: #94a3b8;">Due Date: <strong>${dueDate}</strong></div>
      </div>

      ${customNote ? `<div style="background: rgba(51, 65, 85, 0.5); padding: 12px; border-radius: 8px; font-size: 13px; color: #e2e8f0; margin-bottom: 20px;">${escapeHtml(customNote)}</div>` : ''}

      <h3 style="font-size: 15px; color: #f8fafc; margin-bottom: 10px;">Payment Instructions (Official Channels):</h3>
      <div class="bank-card">
        <div class="bank-row"><strong>Bank:</strong> ${SHOPFLOW_PAYMENT_CHANNELS.bankName}</div>
        <div class="bank-row"><strong>Account Title:</strong> ${SHOPFLOW_PAYMENT_CHANNELS.accountTitle}</div>
        <div class="bank-row"><strong>Account Number:</strong> ${SHOPFLOW_PAYMENT_CHANNELS.accountNumber}</div>
        <div class="bank-row"><strong>IBAN:</strong> ${SHOPFLOW_PAYMENT_CHANNELS.iban}</div>
        <div class="bank-row"><strong>EasyPaisa / JazzCash:</strong> ${SHOPFLOW_PAYMENT_CHANNELS.easyPaisa}</div>
      </div>

      <p style="color: #94a3b8; font-size: 13px; line-height: 1.5;">
        After sending <strong>Rs. 8,000</strong>, please share your receipt screenshot or Transaction ID on WhatsApp (<strong>03143176526</strong>) or reply to this email for instant approval.
      </p>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} ShopFlow Technologies. Pakistan's Premier Mobile Shop SaaS.<br>
      Email: support@shopflow.pk &bull; Helpline: ${SHOPFLOW_PAYMENT_CHANNELS.whatsapp}
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Dispatch & Record Email Notification
 */
export type EmailStatus = 'sent' | 'failed' | 'queued';

/** Is any real email provider configured? */
export function isEmailConfigured(): boolean {
  return Boolean((process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) || process.env.RESEND_API_KEY);
}

/**
 * Deliver one email.
 *  1. SMTP (e.g. Gmail with an App Password) when SMTP_HOST/SMTP_USER/SMTP_PASS are set
 *  2. Resend when RESEND_API_KEY is set
 *  3. otherwise 'queued' (nothing is sent — callers must tell the admin)
 */
async function deliverEmail(to: string, subject: string, html: string): Promise<{ status: EmailStatus; error?: string }> {
  const from = process.env.EMAIL_FROM || (process.env.SMTP_USER ? `ShopFlow <${process.env.SMTP_USER}>` : 'ShopFlow <billing@shopflow.pk>');

  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const port = Number(process.env.SMTP_PORT || 465);
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port,
        secure: port === 465,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
      await transporter.sendMail({ from, to, subject, html });
      return { status: 'sent' };
    } catch (err) {
      console.error('SMTP send failed:', err);
      return { status: 'failed', error: 'The email server refused the message. Check the SMTP settings.' };
    }
  }

  if (process.env.RESEND_API_KEY) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
        body: JSON.stringify({ from, to, subject, html }),
      });
      if (res.ok) return { status: 'sent' };
      return { status: 'failed', error: `Email provider rejected the message (HTTP ${res.status}).` };
    } catch (err) {
      console.warn('Resend dispatch failed:', err);
      return { status: 'failed', error: 'Could not reach the email provider.' };
    }
  }

  return { status: 'queued', error: 'Email sending is not set up yet (no SMTP or Resend settings).' };
}

export async function sendAndLogEmail(
  params: SendEmailParams
): Promise<{ success: boolean; status: EmailStatus; error?: string }> {
  try {
    const { status, error } = await deliverEmail(params.recipientEmail, params.subject, params.htmlContent);

    // Always record in email_logs (never the raw password: use logHtml when given)
    const db = getAdminClient() ?? (await createClient());
    const { error: dbError } = await db.from('email_logs').insert({
      shop_id: params.shopId,
      subscription_id: params.subscriptionId || null,
      recipient_email: params.recipientEmail,
      recipient_name: params.recipientName,
      subject: params.subject,
      template_type: params.templateType,
      content_html: params.logHtml ?? params.htmlContent,
      status,
      metadata: params.metadata || {},
      sent_by: params.sentByUserId || null,
    });
    if (dbError) console.error('Failed to log email in email_logs table:', dbError);

    return { success: status === 'sent', status, error };
  } catch (error) {
    console.error('sendAndLogEmail error:', error);
    return { success: false, status: 'failed', error: 'Failed to dispatch email notification.' };
  }
}

/**
 * Template 3: Welcome email for a new shop owner, with login details.
 */
export function generateShopWelcomeEmail({
  ownerName,
  shopName,
  displayShopId,
  loginUrl,
  email,
  password,
}: {
  ownerName: string;
  shopName: string;
  displayShopId: string;
  loginUrl: string;
  email: string;
  password: string;
}): string {
  const row = (label: string, value: string, mono = false) =>
    `<tr><td style="padding:10px 14px;color:#64748b;font-size:14px;border-bottom:1px solid #e2e8f0;">${label}</td>` +
    `<td style="padding:10px 14px;color:#0f172a;font-size:15px;font-weight:700;border-bottom:1px solid #e2e8f0;${mono ? 'font-family:Consolas,monospace;' : ''}">${escapeHtml(value)}</td></tr>`;
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:24px;background:#f4f4f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
    <div style="background:#4f46e5;padding:28px 24px;text-align:center;color:#ffffff;">
      <div style="font-size:40px;line-height:1;">🎉</div>
      <h1 style="margin:12px 0 4px;font-size:22px;">Congratulations, ${escapeHtml(ownerName)}!</h1>
      <p style="margin:0;font-size:15px;opacity:.9;">Your shop <strong>${escapeHtml(shopName)}</strong> is ready on ShopFlow.</p>
      <p style="margin:8px 0 0;font-size:16px;" dir="rtl">مبارک ہو! آپ کی دکان ShopFlow پر بن گئی ہے۔</p>
    </div>
    <div style="padding:24px;">
      <p style="margin:0 0 14px;color:#334155;font-size:15px;">Use these details to sign in on your phone or computer:</p>
      <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:12px;">
        ${row('Shop', `${shopName} (${displayShopId})`)}
        ${row('Login link', loginUrl)}
        ${row('Username (email)', email, true)}
        ${row('Password', password, true)}
      </table>
      <div style="text-align:center;margin:24px 0 8px;">
        <a href="${escapeHtml(loginUrl)}" style="display:inline-block;background:#059669;color:#ffffff;text-decoration:none;font-weight:700;font-size:16px;padding:14px 28px;border-radius:12px;">Open ShopFlow &amp; sign in</a>
      </div>
      <p style="margin:18px 0 0;color:#64748b;font-size:13px;">For your safety, keep this email private. You can change your password anytime from the login page (“Forgot password?”).</p>
      <p style="margin:6px 0 0;color:#64748b;font-size:13px;" dir="rtl">یہ معلومات کسی کو نہ دیں۔ مدد کے لیے واٹس ایپ کریں: ${SHOPFLOW_PAYMENT_CHANNELS.whatsapp}</p>
    </div>
    <div style="padding:14px 24px;background:#f8fafc;color:#94a3b8;font-size:12px;text-align:center;">ShopFlow — Mobile Shop POS · Helpline ${SHOPFLOW_PAYMENT_CHANNELS.whatsapp}</div>
  </div>
</body>
</html>`;
}
