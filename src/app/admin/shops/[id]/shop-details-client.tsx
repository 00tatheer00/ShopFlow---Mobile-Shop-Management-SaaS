'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Store,
  User,
  Shield,
  Calendar,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowLeft,
  Loader2,
  KeyRound,
  ShieldAlert,
  Clock,
  Copy,
  Check,
} from 'lucide-react';
import {
  updateShopStatusAction,
  updateShopPlanAction,
  sendOwnerPasswordResetAction,
} from '@/app/admin/actions';
import type { Shop, Plan } from '@/lib/types';

interface OwnerInfo {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  is_active: boolean;
}

interface AuditLogItem {
  id: string;
  action: string;
  created_at: string;
  metadata?: { reason?: string; admin_email?: string; [key: string]: unknown } | null;
}

interface ShopDetailsClientProps {
  shop: Shop;
  owner: OwnerInfo | null;
  plans: Plan[];
  auditLogs: AuditLogItem[];
}

export function ShopDetailsClient({
  shop,
  owner,
  plans,
  auditLogs,
}: ShopDetailsClientProps) {
  const router = useRouter();

  // Dialog states
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    action: 'suspend' | 'deactivate' | 'activate' | null;
    reason: string;
  }>({
    isOpen: false,
    action: null,
    reason: '',
  });

  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState(shop.plan_id || plans[0]?.id || '');
  const [expiryDate, setExpiryDate] = useState(
    shop.subscription_expires_at
      ? new Date(shop.subscription_expires_at).toISOString().split('T')[0]
      : ''
  );

  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  function handleCopyId() {
    if (shop.display_shop_id) {
      navigator.clipboard.writeText(shop.display_shop_id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  }

  // Status Action Handler
  async function handleStatusConfirm() {
    if (!confirmModal.action) return;
    setLoading(true);
    setFeedback(null);

    let targetStatus: 'active' | 'suspended' | 'deactivated' = 'active';
    if (confirmModal.action === 'suspend') targetStatus = 'suspended';
    if (confirmModal.action === 'deactivate') targetStatus = 'deactivated';

    const res = await updateShopStatusAction({
      shop_id: shop.id,
      status: targetStatus,
      reason: confirmModal.reason || undefined,
    });

    setLoading(false);
    setConfirmModal({ isOpen: false, action: null, reason: '' });

    if (res?.error) {
      setFeedback({ type: 'error', message: res.error });
    } else {
      setFeedback({
        type: 'success',
        message: `Shop has been successfully ${targetStatus}.`,
      });
      router.refresh();
    }
  }

  // Plan Update Handler
  async function handlePlanSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);

    const res = await updateShopPlanAction({
      shop_id: shop.id,
      plan_id: selectedPlanId,
      subscription_expires_at: expiryDate ? new Date(expiryDate).toISOString() : undefined,
    });

    setLoading(false);
    setPlanModalOpen(false);

    if (res?.error) {
      setFeedback({ type: 'error', message: res.error });
    } else {
      setFeedback({ type: 'success', message: 'Subscription plan updated successfully.' });
      router.refresh();
    }
  }

  // Reset Owner Password
  async function handleSendPasswordReset() {
    if (!owner?.email) return;
    setLoading(true);
    setFeedback(null);

    const res = await sendOwnerPasswordResetAction(owner.email, shop.id);
    setLoading(false);

    if (res?.error) {
      setFeedback({ type: 'error', message: res.error });
    } else {
      setFeedback({
        type: 'success',
        message: `Password reset link sent to ${owner.email}.`,
      });
    }
  }

  const currentPlan = plans.find((p) => p.id === shop.plan_id);

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Top Breadcrumb & Action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Link
          href="/admin/shops"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to All Shops</span>
        </Link>

        <div className="flex items-center gap-2">
          {shop.status !== 'active' && (
            <button
              onClick={() =>
                setConfirmModal({ isOpen: true, action: 'activate', reason: 'Reactivation by Admin' })
              }
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition-colors"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Activate Shop</span>
            </button>
          )}

          {shop.status === 'active' && (
            <button
              onClick={() =>
                setConfirmModal({ isOpen: true, action: 'suspend', reason: 'Payment or policy suspension' })
              }
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-colors"
            >
              <AlertTriangle className="h-4 w-4" />
              <span>Suspend</span>
            </button>
          )}

          {shop.status !== 'deactivated' && (
            <button
              onClick={() =>
                setConfirmModal({ isOpen: true, action: 'deactivate', reason: 'Shop deactivation request' })
              }
              className="inline-flex items-center gap-1.5 rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/20 transition-colors"
            >
              <XCircle className="h-4 w-4" />
              <span>Deactivate</span>
            </button>
          )}
        </div>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div
          className={`rounded-2xl p-4 text-sm font-medium flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
              : 'bg-destructive/10 text-destructive border border-destructive/20'
          }`}
        >
          <span>{feedback.message}</span>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Shop Header Card */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-xs">
              <Store className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-foreground">{shop.name}</h1>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    shop.status === 'active'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      : shop.status === 'suspended'
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                      : 'bg-destructive/10 text-destructive border border-destructive/20'
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      shop.status === 'active'
                        ? 'bg-emerald-500'
                        : shop.status === 'suspended'
                        ? 'bg-amber-500'
                        : 'bg-destructive'
                    }`}
                  />
                  {shop.status.charAt(0).toUpperCase() + shop.status.slice(1)}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                <span className="font-mono font-semibold text-foreground">
                  ID: {shop.display_shop_id || 'N/A'}
                </span>
                {shop.display_shop_id && (
                  <button
                    type="button"
                    onClick={handleCopyId}
                    className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-1.5 py-0.5 text-[11px] font-mono text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    title="Copy Shop ID"
                  >
                    {copiedId ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-600" />
                        <span className="text-emerald-600">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                )}
                <span>•</span>
                <span className="font-mono text-[11px] text-muted-foreground">slug: {shop.slug}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Created {new Date(shop.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="rounded-xl border border-border bg-muted/30 px-3.5 py-2 text-right">
              <p className="text-[10px] uppercase font-bold text-muted-foreground">Current Plan</p>
              <p className="text-sm font-bold text-foreground">{currentPlan?.name || 'Standard'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Shop Information & Owner Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Shop Information */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 border-b border-border pb-3">
            <MapPin className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">Shop Information</h2>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground">City</span>
              <span className="font-semibold text-foreground">{shop.city}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground">Address</span>
              <span className="font-medium text-foreground text-right max-w-[240px]">
                {shop.address || 'Not specified'}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground">Phone</span>
              <span className="font-medium text-foreground">{shop.phone || 'Not specified'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium text-foreground">{shop.email || 'Not specified'}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Internal UUID</span>
              <span className="font-mono text-[10px] text-muted-foreground truncate max-w-[200px]">
                {shop.id}
              </span>
            </div>
          </div>
        </div>

        {/* Owner Information */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2.5">
              <User className="h-4 w-4 text-indigo-500" />
              <h2 className="text-sm font-bold text-foreground">Shop Owner Account</h2>
            </div>
            {owner && (
              <span
                className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                  owner.is_active
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'bg-destructive/10 text-destructive'
                }`}
              >
                {owner.is_active ? 'Active' : 'Disabled'}
              </span>
            )}
          </div>

          {owner ? (
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Full Name</span>
                <span className="font-semibold text-foreground">{owner.full_name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Email</span>
                <span className="font-medium text-foreground">{owner.email}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Phone</span>
                <span className="font-medium text-foreground">{owner.phone || 'Not specified'}</span>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleSendPasswordReset}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-background py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                >
                  <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Send Password Reset Email</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-muted-foreground">
              No owner assigned to this shop.
            </div>
          )}
        </div>
      </div>

      {/* Subscription & Plan Card */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2.5">
            <Shield className="h-4 w-4 text-purple-500" />
            <h2 className="text-sm font-bold text-foreground">Subscription & Tier</h2>
          </div>
          <button
            onClick={() => setPlanModalOpen(true)}
            className="rounded-lg border border-border px-3 py-1 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
          >
            Change Plan
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="rounded-xl border border-border/80 bg-muted/20 p-3 space-y-1">
            <span className="text-muted-foreground">Plan Tier</span>
            <p className="font-bold text-sm text-foreground">{currentPlan?.name || 'Standard'}</p>
            <p className="text-[11px] text-muted-foreground">
              {currentPlan?.max_users || 5} staff users, {currentPlan?.max_products || 500} products
            </p>
          </div>

          <div className="rounded-xl border border-border/80 bg-muted/20 p-3 space-y-1">
            <span className="text-muted-foreground">Subscription Status</span>
            <p className="font-bold text-sm text-foreground capitalize">
              {shop.subscription_status || 'Active'}
            </p>
            <p className="text-[11px] text-muted-foreground">Managed manually by Super Admin</p>
          </div>

          <div className="rounded-xl border border-border/80 bg-muted/20 p-3 space-y-1">
            <span className="text-muted-foreground">Expiry Date</span>
            <p className="font-bold text-sm text-foreground">
              {shop.subscription_expires_at
                ? new Date(shop.subscription_expires_at).toLocaleDateString()
                : 'Unlimited / Never'}
            </p>
            <p className="text-[11px] text-muted-foreground">Access validity period</p>
          </div>
        </div>
      </div>

      {/* Audit Log for this shop */}
      <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border p-4 bg-muted/20">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-bold text-foreground">Shop Audit Trail</h2>
        </div>

        {auditLogs.length === 0 ? (
          <div className="p-6 text-center text-xs text-muted-foreground">
            No audit log entries for this shop yet.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-4 flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-foreground uppercase tracking-wide">
                    {log.action.replace(/_/g, ' ')}
                  </span>
                  {log.metadata?.reason && (
                    <p className="text-muted-foreground text-[11px] mt-0.5">
                      Reason: {log.metadata.reason}
                    </p>
                  )}
                  {log.metadata?.admin_email && (
                    <p className="text-[10px] text-muted-foreground">
                      By: {log.metadata.admin_email}
                    </p>
                  )}
                </div>
                <div className="text-right text-[11px] text-muted-foreground">
                  {new Date(log.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CONFIRMATION MODAL (NOT browser confirm) */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  confirmModal.action === 'activate'
                    ? 'bg-emerald-500/10 text-emerald-600'
                    : 'bg-destructive/10 text-destructive'
                }`}
              >
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground capitalize">
                  {confirmModal.action} Shop?
                </h3>
                <p className="text-xs text-muted-foreground">
                  Confirm action for &ldquo;{shop.name}&rdquo; ({shop.display_shop_id})
                </p>
              </div>
            </div>

            <div className="text-xs text-muted-foreground space-y-2 rounded-xl bg-muted/40 p-3 border border-border">
              {confirmModal.action === 'suspend' && (
                <p>
                  Suspending this shop will immediately block all staff from accessing POS, inventory,
                  and sales. Their accounts will be redirected to the suspended shop notification screen.
                </p>
              )}
              {confirmModal.action === 'deactivate' && (
                <p>
                  Deactivating this shop archives the tenant while strictly preserving all inventory,
                  financial, and customer records in the database.
                </p>
              )}
              {confirmModal.action === 'activate' && (
                <p>
                  Activating this shop will restore immediate access for the owner and cashiers to
                  their POS and inventory.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Reason / Internal Note</label>
              <input
                type="text"
                placeholder="e.g. Monthly subscription renewal, non-payment, etc."
                value={confirmModal.reason}
                onChange={(e) =>
                  setConfirmModal((prev) => ({ ...prev, reason: e.target.value }))
                }
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal({ isOpen: false, action: null, reason: '' })}
                className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleStatusConfirm}
                className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-xs transition-colors ${
                  confirmModal.action === 'activate'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-destructive hover:bg-destructive/90'
                }`}
              >
                {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span className="capitalize">{confirmModal.action} Shop</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CHANGE PLAN MODAL */}
      {planModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <form
            onSubmit={handlePlanSave}
            className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl space-y-5 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Change Subscription Plan</h3>
                <p className="text-xs text-muted-foreground">Assign tier and access validity</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Select Plan</label>
                <select
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.max_users} users, {p.max_products} products)
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Expiry Date (Optional)</label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <p className="text-[11px] text-muted-foreground">
                  Leave blank for unlimited ongoing access.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setPlanModalOpen(false)}
                className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-xs hover:bg-primary/90"
              >
                {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>Update Plan</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
