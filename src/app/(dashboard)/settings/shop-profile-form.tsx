'use client';

import { SettingsTabs } from './settings-tabs';
import { PageHeader } from '@/components/ui/kit';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  AlertCircle,
  Store,
} from 'lucide-react';
import type { Shop } from '@/lib/types';
import { updateShopProfile } from './actions';

interface ShopProfileFormProps {
  shop: Shop;
}

export function ShopProfileForm({ shop }: ShopProfileFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFeedback(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await updateShopProfile(formData);
      if (res?.error) {
        setFeedback({ type: 'error', message: res.error });
      } else {
        setFeedback({ type: 'success', message: 'Shop profile successfully updated!' });
        router.refresh();
      }
    });
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Settings Navigation Tabs */}
      <SettingsTabs active="/settings" />

      <PageHeader
        title="Shop Profile"
        ur="دکان کی معلومات"
        icon={Store}
        tone="slate"
        description={<>Update your store&apos;s business details, city, and customer contact information.</>}
      />

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
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">
            Shop Name <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            name="name"
            required
            defaultValue={shop.name}
            className="field"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              City <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              name="city"
              required
              defaultValue={shop.city}
              placeholder="e.g. Lahore, Karachi, Rawalpindi"
              className="field"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Contact Phone
            </label>
            <input
              type="text"
              name="phone"
              defaultValue={shop.phone || ''}
              placeholder="e.g. 03001234567"
              className="field"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">
            Business Email
          </label>
          <input
            type="email"
            name="email"
            defaultValue={shop.email || ''}
            placeholder="e.g. info@shopflow.pk"
            className="field"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">
            Shop Address
          </label>
          <input
            type="text"
            name="address"
            defaultValue={shop.address || ''}
            placeholder="e.g. Shop # 14, 2nd Floor, Hafeez Centre, Main Boulevard Gulberg, Lahore"
            className="field"
          />
        </div>

        <div className="flex justify-end pt-3 border-t border-border">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isPending ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </form>
    </div>
  );
}
