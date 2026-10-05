'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import type { ShopSettings } from '@/lib/types';
import { updateShopPreferences } from '../actions';

interface PreferencesFormProps {
  settings: ShopSettings | null;
}

export function PreferencesForm({ settings }: PreferencesFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFeedback(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await updateShopPreferences(formData);
      if (res?.error) {
        setFeedback({ type: 'error', message: res.error });
      } else {
        setFeedback({ type: 'success', message: 'Preferences updated successfully!' });
        router.refresh();
      }
    });
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Settings Navigation Tabs */}
      <div className="flex gap-4 border-b border-border pb-1">
        <Link
          href="/settings"
          className="border-b-2 border-transparent pb-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Shop Profile
        </Link>
        <Link
          href="/settings/preferences"
          className="border-b-2 border-primary pb-2 text-sm font-semibold text-primary"
        >
          POS & Invoice Preferences
        </Link>
        <Link
          href="/settings/users"
          className="border-b-2 border-transparent pb-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Staff & Roles
        </Link>
      </div>

      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">POS & Invoice Preferences</h1>
        <p className="text-xs text-muted-foreground">
          Customize receipt notes, low stock alerts, and invoice numbering.
        </p>
      </div>

      {feedback && (
        <div
          className={`flex items-center gap-2 rounded-xl p-4 text-sm font-medium ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
              : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          {feedback.message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Invoice Prefix
            </label>
            <input
              type="text"
              name="invoice_prefix"
              defaultValue={settings?.invoice_prefix || 'INV'}
              placeholder="e.g. INV, SF, SHOP"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none uppercase font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Default Payment Method
            </label>
            <select
              name="default_payment_method"
              defaultValue={settings?.default_payment_method || 'cash'}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            >
              <option value="cash">Cash</option>
              <option value="easypaisa">EasyPaisa</option>
              <option value="jazzcash">JazzCash</option>
              <option value="bank_transfer">Bank Transfer</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">
            Global Low Stock Alert Level (Units)
          </label>
          <input
            type="number"
            name="low_stock_threshold"
            min="0"
            defaultValue={settings?.low_stock_threshold ?? 5}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
          />
          <p className="text-[11px] text-muted-foreground mt-1">
            Products will trigger low stock warnings when stock drops to or below this amount.
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">
            Receipt Header Message
          </label>
          <input
            type="text"
            name="receipt_header"
            defaultValue={settings?.receipt_header || ''}
            placeholder="e.g. Welcome to Star Mobile Centre! All types of mobile phones & accessories."
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">
            Receipt Footer / Terms & Warranty Note
          </label>
          <textarea
            name="receipt_footer"
            rows={3}
            defaultValue={settings?.receipt_footer || ''}
            placeholder="e.g. 7-day checking warranty. Goods once sold will not be returned without original invoice."
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
          />
        </div>

        <div className="flex justify-end pt-3 border-t border-border">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isPending ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </form>
    </div>
  );
}
