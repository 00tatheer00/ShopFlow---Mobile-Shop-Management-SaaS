'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Store,
  User,
  Shield,
  Loader2,
  ArrowLeft,
  AlertCircle,
  AlertTriangle,
  Eye,
  EyeOff,
  CheckCircle2,
} from 'lucide-react';
import { createShopAction, checkShopEmailAvailabilityAction } from '@/app/admin/actions';
import type { Plan } from '@/lib/types';
import { toast } from 'sonner';

interface NewShopFormProps {
  plans: Plan[];
  suggestedDisplayId: string;
}

export function NewShopForm({ plans, suggestedDisplayId }: NewShopFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Email conflict states
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerEmailConflict, setOwnerEmailConflict] = useState<string | null>(null);
  const [checkingOwnerEmail, setCheckingOwnerEmail] = useState(false);

  const [shopEmail, setShopEmail] = useState('');
  const [shopEmailConflict, setShopEmailConflict] = useState<string | null>(null);

  // Live validator for Owner Email
  const validateOwnerEmail = useCallback(async (emailVal: string) => {
    const trimmed = emailVal.trim();
    if (!trimmed || !trimmed.includes('@') || !trimmed.includes('.')) {
      setOwnerEmailConflict(null);
      return;
    }

    setCheckingOwnerEmail(true);
    try {
      const res = await checkShopEmailAvailabilityAction(trimmed);
      if (!res.available && res.error) {
        setOwnerEmailConflict(res.error);
      } else {
        setOwnerEmailConflict(null);
      }
    } catch {
      // Ignore network error on live check
    } finally {
      setCheckingOwnerEmail(false);
    }
  }, []);

  // Live validator for Shop Official Email
  const validateShopEmail = useCallback(async (shopEmailVal: string) => {
    const trimmed = shopEmailVal.trim();
    if (!trimmed || !trimmed.includes('@') || !trimmed.includes('.')) {
      setShopEmailConflict(null);
      return;
    }

    try {
      const res = await checkShopEmailAvailabilityAction('dummy-check@example.com', trimmed);
      if (!res.available && res.field === 'email' && res.error) {
        setShopEmailConflict(res.error);
      } else {
        setShopEmailConflict(null);
      }
    } catch {
      // Ignore
    }
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (ownerEmailConflict) {
      toast.error('Please change the owner email to avoid credentials conflict.');
      return;
    }

    if (shopEmailConflict) {
      toast.error('Please change the official shop email to avoid credentials conflict.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData(e.currentTarget);
      const result = await createShopAction(formData);

      if (result?.error) {
        setError(result.error);
        toast.error(result.error);
        if (result.error.toLowerCase().includes('email')) {
          setOwnerEmailConflict(result.error);
        }
        setLoading(false);
      } else if (result?.shopId) {
        toast.success(`Shop "${result.displayShopId || ''}" provisioned successfully!`);
        router.push('/admin/shops');
        router.refresh();
      } else {
        const fallbackMsg = 'Unexpected response while provisioning shop. Please check your shop list.';
        setError(fallbackMsg);
        toast.error(fallbackMsg);
        setLoading(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred while creating the shop.';
      setError(msg);
      toast.error(msg);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl">
      {/* Top action bar */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/shops"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Shops</span>
        </Link>
      </div>

      {error && (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive flex items-center gap-3">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* 1. Shop Information Card */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-6">
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Store className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Shop Details</h2>
            <p className="text-xs text-muted-foreground">Tenant business identity and location information</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Shop Name <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              name="name"
              required
              placeholder="e.g. New York Mobile Center"
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Shop ID (Internal Display)
            </label>
            <input
              type="text"
              name="display_shop_id"
              defaultValue={suggestedDisplayId}
              placeholder={suggestedDisplayId}
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <p className="text-[11px] text-muted-foreground">
              Auto-generated sequential ID. Can be customized if following standard format (e.g. SHOP-005).
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              City <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              name="city"
              required
              placeholder="e.g. Lahore, Karachi, Rawalpindi"
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Shop Phone</label>
            <input
              type="tel"
              name="phone"
              placeholder="e.g. 03001234567"
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-semibold text-foreground">Shop Address</label>
            <input
              type="text"
              name="address"
              placeholder="e.g. Shop #12, Hafeez Center, Main Boulevard, Gulberg III"
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-semibold text-foreground">Shop Official Email</label>
            <input
              type="email"
              name="email"
              value={shopEmail}
              onChange={(e) => {
                setShopEmail(e.target.value);
                validateShopEmail(e.target.value);
              }}
              onBlur={() => validateShopEmail(shopEmail)}
              placeholder="e.g. contact@newyorkmobiles.com"
              className={`w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 ${
                shopEmailConflict
                  ? 'border-destructive focus:ring-destructive/20 text-destructive'
                  : 'border-border focus:ring-primary/20'
              }`}
            />
            {shopEmailConflict && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-start gap-2 animate-in fade-in-0 duration-150">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <p>{shopEmailConflict}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Owner Account Provisioning Card */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-6">
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            <User className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Shop Owner Account</h2>
            <p className="text-xs text-muted-foreground">
              Primary administrative credentials for the shopkeeper to log in at /login
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Owner Full Name <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              name="owner_name"
              required
              placeholder="e.g. Muhammad Usman"
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground">
                Owner Email Address <span className="text-destructive">*</span>
              </label>
              {checkingOwnerEmail && (
                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Checking credentials...
                </span>
              )}
            </div>
            <input
              type="email"
              name="owner_email"
              required
              value={ownerEmail}
              onChange={(e) => {
                setOwnerEmail(e.target.value);
                validateOwnerEmail(e.target.value);
              }}
              onBlur={() => validateOwnerEmail(ownerEmail)}
              placeholder="e.g. usman@example.com"
              className={`w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 ${
                ownerEmailConflict
                  ? 'border-destructive bg-destructive/5 focus:ring-destructive/20 text-destructive'
                  : 'border-border focus:ring-primary/20'
              }`}
            />
            {ownerEmailConflict ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-start gap-2.5 animate-in fade-in-0 duration-150">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-destructive" />
                <div className="space-y-1">
                  <p className="font-bold">Credentials Conflict Detected</p>
                  <p className="text-[11px] leading-relaxed">{ownerEmailConflict}</p>
                  <p className="text-[11px] font-semibold text-destructive/90">
                    👉 It is not possible to create a shop with an existing email. Please change this email address so it won&apos;t conflict later.
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                This email will be used for authentication and password recovery. Must be unique across all shops.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Temporary Password <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="owner_password"
                required
                minLength={8}
                placeholder="At least 8 characters"
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Provide this password to the owner. They can change it at any time.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Owner Mobile Phone</label>
            <input
              type="tel"
              name="owner_phone"
              placeholder="e.g. 03001234567"
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
      </div>

      {/* 3. Subscription & Initial Status Card */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-6">
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Subscription & Access</h2>
            <p className="text-xs text-muted-foreground">Plan tier and initial operational status</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Subscription Plan</label>
            <select
              name="plan_id"
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.max_users} users, {p.max_products} products)
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Initial Status</label>
            <select
              name="status"
              defaultValue="active"
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="active">Active (Operational immediately)</option>
              <option value="suspended">Suspended (Blocked until activated)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
        <Link
          href="/admin/shops"
          className="rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-muted transition-colors"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={loading || !!ownerEmailConflict || !!shopEmailConflict || checkingOwnerEmail}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          <span>{loading ? 'Provisioning Shop...' : 'Create & Provision Shop'}</span>
        </button>
      </div>
    </form>
  );
}
