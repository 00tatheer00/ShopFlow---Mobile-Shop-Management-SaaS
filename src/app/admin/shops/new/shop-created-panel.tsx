'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, Copy, MailCheck, MailWarning, MessageCircle, Plus, Store } from 'lucide-react';
import { toast } from 'sonner';

export interface CreatedShopInfo {
  shopId: string;
  displayShopId: string;
  shopName: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone?: string;
  password: string;
  loginUrl: string;
  emailStatus: 'sent' | 'failed' | 'queued';
  emailError?: string;
}

/** Success screen after creating a shop: login details to hand over, plus email status. */
export function ShopCreatedPanel({ info, onCreateAnother }: { info: CreatedShopInfo; onCreateAnother: () => void }) {
  const [copied, setCopied] = useState<string | null>(null);

  const message = [
    `Assalam-o-Alaikum ${info.ownerName},`,
    `Mubarak ho! Aap ki dukaan "${info.shopName}" ShopFlow par ban gayi hai.`,
    '',
    `Login link: ${info.loginUrl}`,
    `Username (email): ${info.ownerEmail}`,
    `Password: ${info.password}`,
    '',
    'Login ke baad password kisi ko na batayein. Shukriya!',
  ].join('\n');

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      toast.success('Copied');
      setTimeout(() => setCopied(null), 1800);
    } catch {
      toast.error('Could not copy — please select and copy manually');
    }
  }

  const waPhone = (info.ownerPhone || '').replace(/\D/g, '').replace(/^0/, '92');
  const waUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`;

  const rows: [string, string, string][] = [
    ['Shop', `${info.shopName} (${info.displayShopId})`, 'shop'],
    ['Login link', info.loginUrl, 'url'],
    ['Username (email)', info.ownerEmail, 'email'],
    ['Password', info.password, 'password'],
  ];

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div className="panel overflow-hidden">
        <div className="flex flex-col items-center gap-2 border-b border-border bg-emerald-50 px-6 py-7 text-center dark:bg-emerald-950/30">
          <span className="animate-pop flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white">
            <Check className="h-8 w-8" strokeWidth={3} />
          </span>
          <h1 className="text-xl font-bold text-foreground">Shop created successfully</h1>
          <p className="text-sm text-muted-foreground">Share these login details with {info.ownerName}.</p>
        </div>

        <dl className="divide-y divide-border">
          {rows.map(([label, value, key]) => (
            <div key={key} className="flex items-center gap-3 px-5 py-3">
              <div className="min-w-0 flex-1">
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt>
                <dd className={`truncate text-[15px] font-semibold text-foreground ${key === 'password' || key === 'email' ? 'font-mono' : ''}`}>{value}</dd>
              </div>
              <button type="button" onClick={() => copy(value, key)} className="icon-btn" aria-label={`Copy ${label}`}>
                {copied === key ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          ))}
        </dl>

        <div className="px-5 py-4">
          {info.emailStatus === 'sent' ? (
            <p className="flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
              <MailCheck className="mt-0.5 h-4 w-4 shrink-0" />
              Welcome email with these login details was sent to <strong className="font-mono">{info.ownerEmail}</strong>.
            </p>
          ) : (
            <p className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              <MailWarning className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                The welcome email was <strong>not sent</strong>
                {info.emailError ? ` (${info.emailError})` : ''}. Please send the details on WhatsApp below.
              </span>
            </p>
          )}
        </div>

        <div className="grid gap-2 border-t border-border p-4 sm:grid-cols-2">
          <button type="button" onClick={() => copy(message, 'all')} className="btn btn-outline">
            {copied === 'all' ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />} Copy all details
          </button>
          <a href={waUrl} target="_blank" rel="noopener noreferrer" className="btn btn-success">
            <MessageCircle className="h-4 w-4" /> Send on WhatsApp
          </a>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Link href={`/admin/shops/${info.shopId}`} className="btn btn-primary flex-1">
          <Store className="h-4 w-4" /> Open shop
        </Link>
        <button type="button" onClick={onCreateAnother} className="btn btn-outline flex-1">
          <Plus className="h-4 w-4" /> Create another shop
        </button>
      </div>
    </div>
  );
}
