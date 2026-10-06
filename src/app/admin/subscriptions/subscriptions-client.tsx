'use client';

import { useState, useTransition } from 'react';
import {
  CreditCard,
  CheckCircle2,
  Clock,
  AlertCircle,
  Mail,
  Search,
  Check,
  Send,
  Calendar,
  Building2,
  RefreshCw,
  PlusCircle,
  Eye,
  X,
  Phone,
  FileText,
  BadgeAlert,
} from 'lucide-react';
import type { ShopSubscription, Shop, EmailLog } from '@/lib/types';
import { toRupees } from '@/lib/types';
import {
  approveSubscriptionPayment,
  revokeSubscriptionPayment,
  sendSubscriptionReminder,
  generateMonthlyBillsAction,
} from './actions';
import { toast } from 'sonner';

interface SubscriptionsClientProps {
  initialSubscriptions: ShopSubscription[];
  allShops: Shop[];
  initialEmailLogs: EmailLog[];
}

export function SubscriptionsClient({
  initialSubscriptions,
  allShops,
  initialEmailLogs,
}: SubscriptionsClientProps) {
  const [subscriptions] = useState<ShopSubscription[]>(initialSubscriptions);
  const [emailLogs] = useState<EmailLog[]>(initialEmailLogs);
  const [isPending, startTransition] = useTransition();

  // Filters
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-10');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'unpaid' | 'overdue'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [approveModalSub, setApproveModalSub] = useState<ShopSubscription | null>(null);
  const [reminderModalSub, setReminderModalSub] = useState<ShopSubscription | null>(null);
  const [emailLogsModalOpen, setEmailLogsModalOpen] = useState(false);
  const [previewEmail, setPreviewEmail] = useState<EmailLog | null>(null);
  const [generateBillsModalOpen, setGenerateBillsModalOpen] = useState(false);

  // Approve form state
  const [payMethod, setPayMethod] = useState('easypaisa');
  const [payAmount, setPayAmount] = useState('6500');
  const [payRefId, setPayRefId] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [sendConfirmationEmail, setSendConfirmationEmail] = useState(true);

  // Reminder form state
  const [reminderNote, setReminderNote] = useState('');

  // Generate bills state
  const [genMonth, setGenMonth] = useState('2026-11');
  const [genMonthName, setGenMonthName] = useState('November 2026');
  const [genDueDate, setGenDueDate] = useState('2026-11-10');

  // Filtered subscriptions
  const filteredSubscriptions = subscriptions.filter((sub) => {
    // Month filter
    if (selectedMonth !== 'all' && sub.billing_month !== selectedMonth) {
      return false;
    }
    // Status filter
    if (statusFilter !== 'all' && sub.status !== statusFilter) {
      return false;
    }
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const shopName = sub.shop?.name?.toLowerCase() || '';
      const displayId = sub.shop?.display_shop_id?.toLowerCase() || '';
      const phone = sub.shop?.phone?.toLowerCase() || '';
      const city = sub.shop?.city?.toLowerCase() || '';
      return shopName.includes(q) || displayId.includes(q) || phone.includes(q) || city.includes(q);
    }
    return true;
  });

  // Calculate metrics for selected month
  const targetSubs = selectedMonth === 'all' 
    ? subscriptions 
    : subscriptions.filter((s) => s.billing_month === selectedMonth);

  const totalShopsCount = allShops.filter((s) => s.status === 'active').length;
  const paidSubs = targetSubs.filter((s) => s.status === 'paid');
  const unpaidSubs = targetSubs.filter((s) => s.status === 'unpaid' || s.status === 'overdue');

  const totalCollectedPaisas = paidSubs.reduce((acc, curr) => acc + curr.amount, 0);
  const totalPendingPaisas = unpaidSubs.reduce((acc, curr) => acc + curr.amount, 0);

  // Distinct months list from data
  const availableMonths = Array.from(
    new Set(subscriptions.map((s) => s.billing_month))
  ).sort().reverse();
  if (!availableMonths.includes('2026-10')) availableMonths.push('2026-10');

  // Handlers
  function handleOpenApprove(sub: ShopSubscription) {
    setApproveModalSub(sub);
    setPayAmount(toRupees(sub.amount).toString());
    setPayMethod('easypaisa');
    setPayRefId('');
    setPayNotes('');
    setSendConfirmationEmail(true);
  }

  function handleApproveSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!approveModalSub) return;

    startTransition(async () => {
      const res = await approveSubscriptionPayment({
        subscriptionId: approveModalSub.id,
        amountRupees: parseInt(payAmount, 10) || 6500,
        paymentMethod: payMethod,
        referenceId: payRefId,
        notes: payNotes,
        sendEmail: sendConfirmationEmail,
      });

      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success(`Payment approved for ${approveModalSub.shop?.name}! Marked as PAID.`);
        setApproveModalSub(null);
      }
    });
  }

  function handleRevoke(sub: ShopSubscription) {
    if (!confirm(`Are you sure you want to mark ${sub.shop?.name} as UNPAID for ${sub.month_name}?`)) {
      return;
    }

    startTransition(async () => {
      const res = await revokeSubscriptionPayment(sub.id);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success(`Payment revoked for ${sub.shop?.name}. Status set to Unpaid.`);
      }
    });
  }

  function handleSendReminderSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reminderModalSub) return;

    startTransition(async () => {
      const res = await sendSubscriptionReminder(reminderModalSub.id, reminderNote);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success(`Reminder email dispatched to ${res.recipient}!`);
        setReminderModalSub(null);
        setReminderNote('');
      }
    });
  }

  function handleGenerateBills(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await generateMonthlyBillsAction(genMonth, genMonthName, genDueDate);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success(`Generated ${res.count} invoices for ${genMonthName}!`);
        setGenerateBillsModalOpen(false);
        setSelectedMonth(genMonth);
      }
    });
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Shop Subscriptions & Billing
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Monthly SaaS billing &bull; Standard rate: <strong className="text-emerald-400 font-mono">Rs. 6,500 / month</strong> per shop
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setEmailLogsModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-accent hover:text-accent-foreground transition"
          >
            <Mail className="h-4 w-4 text-primary" />
            <span>Email History</span>
            <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary font-bold">
              {emailLogs.length}
            </span>
          </button>

          <button
            onClick={() => setGenerateBillsModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Generate Monthly Bills</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Rate Card */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span>Monthly Subscription Fee</span>
            <Building2 className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-foreground">Rs. 6,500</span>
            <span className="text-xs text-muted-foreground">/ shop / month</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {totalShopsCount} active tenant shops on platform
          </p>
        </div>

        {/* Paid This Month */}
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 shadow-sm">
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 text-xs font-medium">
            <span>Collected / Paid</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              Rs. {toRupees(totalCollectedPaisas).toLocaleString()}
            </span>
            <span className="text-xs text-emerald-700/70 dark:text-emerald-400/70 font-semibold">
              ({paidSubs.length} shops)
            </span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Approved payments for {selectedMonth === 'all' ? 'All Months' : selectedMonth}
          </p>
        </div>

        {/* Unpaid / Pending */}
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 shadow-sm">
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 text-xs font-medium">
            <span>Pending / Unpaid</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
              Rs. {toRupees(totalPendingPaisas).toLocaleString()}
            </span>
            <span className="text-xs text-amber-700/70 dark:text-amber-400/70 font-semibold">
              ({unpaidSubs.length} shops)
            </span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Awaiting shopkeeper transfer
          </p>
        </div>

        {/* Collection Rate */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span>Collection Status</span>
            <Calendar className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-foreground">
              {targetSubs.length > 0 ? Math.round((paidSubs.length / targetSubs.length) * 100) : 0}%
            </span>
            <span className="text-xs text-muted-foreground">
              {paidSubs.length} of {targetSubs.length} billed
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all"
              style={{
                width: `${targetSubs.length > 0 ? (paidSubs.length / targetSubs.length) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          {/* Month Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Month:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="all">All Months</option>
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {m === '2026-10' ? 'October 2026 (Active)' : m}
                </option>
              ))}
            </select>
          </div>

          {/* Status Segmented Buttons */}
          <div className="flex items-center rounded-xl bg-muted p-1 text-xs">
            {(['all', 'paid', 'unpaid'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`rounded-lg px-3 py-1 text-xs font-semibold capitalize transition ${
                  statusFilter === st
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Search input */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search shop, code, city, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-border bg-background pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-3.5">Shop & Owner</th>
                <th className="px-5 py-3.5">Billing Month</th>
                <th className="px-5 py-3.5">Fee (Monthly)</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Payment Details</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-xs">
              {filteredSubscriptions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">
                    <Building2 className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                    <p className="font-semibold text-sm">No shop subscriptions found</p>
                    <p className="text-xs mt-1">Try changing month or search filter, or generate monthly bills above.</p>
                  </td>
                </tr>
              ) : (
                filteredSubscriptions.map((sub) => {
                  const isPaid = sub.status === 'paid';
                  return (
                    <tr key={sub.id} className="hover:bg-muted/20 transition-colors">
                      {/* Shop Column */}
                      <td className="px-5 py-4">
                        <div className="font-semibold text-foreground text-sm flex items-center gap-2">
                          <span>{sub.shop?.name || 'Unnamed Shop'}</span>
                          {sub.shop?.display_shop_id && (
                            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-mono font-bold text-primary">
                              {sub.shop.display_shop_id}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                          <span>{sub.shop?.city || 'Pakistan'}</span>
                          {sub.shop?.phone && (
                            <>
                              <span>&bull;</span>
                              <span className="font-mono">{sub.shop.phone}</span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Billing Month */}
                      <td className="px-5 py-4">
                        <div className="font-medium text-foreground">{sub.month_name}</div>
                        <div className="text-[11px] text-muted-foreground">
                          Due: {new Date(sub.due_date).toLocaleDateString()}
                        </div>
                      </td>

                      {/* Fee */}
                      <td className="px-5 py-4">
                        <span className="font-bold text-sm text-foreground font-mono">
                          Rs. {toRupees(sub.amount).toLocaleString()}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <Check className="h-3.5 w-3.5" />
                            PAID
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            <Clock className="h-3.5 w-3.5" />
                            UNPAID
                          </span>
                        )}
                      </td>

                      {/* Payment Details */}
                      <td className="px-5 py-4 text-[11px]">
                        {isPaid ? (
                          <div>
                            <div className="font-medium text-foreground">
                              {sub.payment_method ? sub.payment_method.toUpperCase().replace('_', ' ') : 'VERIFIED'}
                            </div>
                            {sub.reference_id && (
                              <div className="text-muted-foreground font-mono truncate max-w-[140px]" title={sub.reference_id}>
                                Ref: {sub.reference_id}
                              </div>
                            )}
                            <div className="text-[10px] text-emerald-600 dark:text-emerald-400">
                              Paid: {sub.paid_at ? new Date(sub.paid_at).toLocaleDateString() : 'N/A'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic">No payment received yet</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!isPaid ? (
                            <>
                              <button
                                onClick={() => handleOpenApprove(sub)}
                                disabled={isPending}
                                className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-semibold shadow-sm transition"
                              >
                                <Check className="h-3.5 w-3.5" />
                                <span>Approve (Mark Paid)</span>
                              </button>

                              <button
                                onClick={() => {
                                  setReminderModalSub(sub);
                                  setReminderNote('');
                                }}
                                disabled={isPending}
                                title="Send reminder email to shopkeeper"
                                className="inline-flex items-center gap-1 rounded-xl border border-border bg-card hover:bg-accent px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition"
                              >
                                <Send className="h-3.5 w-3.5 text-amber-400" />
                                <span>Reminder</span>
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleRevoke(sub)}
                              disabled={isPending}
                              className="inline-flex items-center gap-1 rounded-xl border border-border bg-card hover:bg-destructive/10 hover:text-destructive px-2.5 py-1 text-xs font-medium text-muted-foreground transition"
                            >
                              <RefreshCw className="h-3 w-3" />
                              <span>Mark Unpaid</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= MODAL 1: APPROVE PAYMENT ================= */}
      {approveModalSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in fade-in-0 zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Approve Subscription Payment</h3>
                  <p className="text-xs text-muted-foreground">{approveModalSub.shop?.name} &bull; {approveModalSub.month_name}</p>
                </div>
              </div>
              <button
                onClick={() => setApproveModalSub(null)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleApproveSubmit} className="mt-5 space-y-4 text-xs">
              {/* Fee Amount */}
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Subscription Fee (PKR)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 font-bold text-muted-foreground">Rs.</span>
                  <input
                    type="number"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    required
                    className="w-full rounded-xl border border-border bg-background pl-10 pr-3 py-2 text-sm font-bold text-foreground focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Payment Channel Received</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground"
                >
                  <option value="easypaisa">EasyPaisa Mobile Account</option>
                  <option value="jazzcash">JazzCash Mobile Account</option>
                  <option value="bank_transfer">Online Bank Transfer (Meezan / HBL / UBL)</option>
                  <option value="cash">Direct Cash Handover</option>
                  <option value="other">Other Channel</option>
                </select>
              </div>

              {/* Transaction Reference ID */}
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Transaction ID / Bank Reference (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. TR-9823192 or Bank Ref 083921"
                  value={payRefId}
                  onChange={(e) => setPayRefId(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground"
                />
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Super Admin Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Verified by Usman on WhatsApp screenshot"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground"
                />
              </div>

              {/* Confirmation Email Checkbox */}
              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-border bg-muted/30 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendConfirmationEmail}
                  onChange={(e) => setSendConfirmationEmail(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                />
                <div>
                  <div className="font-semibold text-foreground text-xs">Send Official Confirmation Receipt Email</div>
                  <div className="text-[11px] text-muted-foreground">
                    Dispatches a confirmation email and extends shop subscription expiry automatically.
                  </div>
                </div>
              </label>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setApproveModalSub(null)}
                  className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 text-xs font-bold shadow-md shadow-emerald-600/20"
                >
                  {isPending ? 'Approving...' : 'Confirm & Mark Paid'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: SEND REMINDER EMAIL ================= */}
      {reminderModalSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in fade-in-0 zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
                  <Send className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Send Subscription Payment Notice</h3>
                  <p className="text-xs text-muted-foreground">{reminderModalSub.shop?.name} &bull; {reminderModalSub.month_name}</p>
                </div>
              </div>
              <button
                onClick={() => setReminderModalSub(null)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSendReminderSubmit} className="mt-5 space-y-4 text-xs">
              <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5 text-amber-600 dark:text-amber-400 text-xs">
                <p className="font-semibold">Notice Details:</p>
                <p className="mt-1 text-[11px] leading-relaxed">
                  An email will be sent to <strong>{reminderModalSub.shop?.email || 'Registered Shop Owner'}</strong> detailing the pending amount of <strong>Rs. {toRupees(reminderModalSub.amount).toLocaleString()}</strong> along with Meezan Bank, EasyPaisa, and JazzCash account instructions.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Custom Message / Urgent Note (Optional)</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Please clear by 15th to avoid POS access interruptions."
                  value={reminderNote}
                  onChange={(e) => setReminderNote(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setReminderModalSub(null)}
                  className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white px-5 py-2 text-xs font-bold shadow-md shadow-amber-600/20"
                >
                  {isPending ? 'Sending...' : 'Dispatch Reminder Email'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 3: GENERATE MONTHLY BILLS ================= */}
      {generateBillsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in fade-in-0 zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Generate Monthly Invoices</h3>
                  <p className="text-xs text-muted-foreground">Creates Rs. 6,500 bills for all active shops</p>
                </div>
              </div>
              <button
                onClick={() => setGenerateBillsModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleGenerateBills} className="mt-5 space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Billing Month Code (YYYY-MM)</label>
                <input
                  type="text"
                  value={genMonth}
                  onChange={(e) => setGenMonth(e.target.value)}
                  placeholder="2026-11"
                  required
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-mono text-foreground"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Month Display Title</label>
                <input
                  type="text"
                  value={genMonthName}
                  onChange={(e) => setGenMonthName(e.target.value)}
                  placeholder="November 2026"
                  required
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Payment Due Date</label>
                <input
                  type="date"
                  value={genDueDate}
                  onChange={(e) => setGenDueDate(e.target.value)}
                  required
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setGenerateBillsModalOpen(false)}
                  className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2 text-xs font-bold"
                >
                  {isPending ? 'Generating...' : 'Generate Bills'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 4: EMAIL DISPATCH LOGS ================= */}
      {emailLogsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in fade-in-0 zoom-in-95 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-border shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Email Dispatch History & Audit</h3>
                  <p className="text-xs text-muted-foreground">Log of all subscription receipts and notices sent to shop owners</p>
                </div>
              </div>
              <button
                onClick={() => setEmailLogsModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto mt-4 divide-y divide-border text-xs">
              {emailLogs.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Mail className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
                  <p className="font-semibold">No emails dispatched yet</p>
                  <p className="text-xs mt-1">Approving payments or sending reminders will record logs here.</p>
                </div>
              ) : (
                emailLogs.map((log) => (
                  <div key={log.id} className="py-3.5 flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground text-sm truncate">{log.subject}</span>
                        <span className="rounded bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 text-[10px] font-bold uppercase">
                          {log.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2">
                        <span>To: <strong className="text-foreground">{log.recipient_email}</strong></span>
                        <span>&bull;</span>
                        <span>{new Date(log.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setPreviewEmail(log)}
                      className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-[11px] font-medium text-primary hover:bg-primary/10 transition shrink-0"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>Preview</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 5: EMAIL HTML PREVIEW ================= */}
      {previewEmail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in fade-in-0 zoom-in-95 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-border shrink-0">
              <div>
                <h3 className="text-sm font-bold text-foreground truncate">{previewEmail.subject}</h3>
                <p className="text-[11px] text-muted-foreground">Recipient: {previewEmail.recipient_email}</p>
              </div>
              <button
                onClick={() => setPreviewEmail(null)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto mt-4 rounded-xl border border-border p-4 bg-slate-950">
              <div
                dangerouslySetInnerHTML={{ __html: previewEmail.content_html }}
                className="text-xs"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
