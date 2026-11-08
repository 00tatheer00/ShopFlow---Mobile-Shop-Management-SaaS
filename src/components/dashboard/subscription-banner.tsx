'use client';

import { AlertTriangle, Clock, CreditCard } from 'lucide-react';
import type { ShopSubscription } from '@/lib/types';
import { formatPKR } from '@/lib/types';

interface SubscriptionBannerProps {
  subscription?: ShopSubscription | null;
  onPayNow: () => void;
}

export function SubscriptionBanner({
  subscription,
  onPayNow,
}: SubscriptionBannerProps) {
  if (!subscription || subscription.status === 'paid') {
    return null;
  }

  // Calculate days remaining until due date
  const dueDate = new Date(subscription.due_date);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfDueDay = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate()).getTime();
  const diffTime = startOfDueDay - startOfToday;
  const daysRemaining = Math.round(diffTime / (1000 * 60 * 60 * 24));

  // Determine state
  const isOverdue = daysRemaining < 0;
  const isDueSoon = daysRemaining >= 0 && daysRemaining <= 3;

  // IMPORTANT: Only show when payment is due within 3 days of expiration of current month or overdue!
  // If payment is more than 3 days away, do NOT show the banner or ask to pay now.
  if (!isOverdue && !isDueSoon) {
    return null;
  }

  // Format date: "7 December 2026"
  const formattedDueDate = dueDate.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const effectiveAmount =
    subscription.amount === 650000 || subscription.amount < 800000
      ? 800000
      : subscription.amount;

  let containerStyles = 'border-amber-300 bg-amber-50/80 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100';
  let badgeStyles = 'bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-200';
  let buttonStyles = 'bg-amber-600 hover:bg-amber-700 text-white';
  let Icon = Clock;
  let statusTitle = `Subscription Due Soon — ${subscription.month_name}`;
  let statusSubtitle = daysRemaining === 0
    ? `Due today (${formattedDueDate}). Please pay to avoid disruption.`
    : `Due in ${daysRemaining} day${daysRemaining > 1 ? 's' : ''} on ${formattedDueDate}.`;

  if (isOverdue) {
    containerStyles = 'border-rose-300 bg-rose-50/80 text-rose-950 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-100';
    badgeStyles = 'bg-rose-100 text-rose-900 dark:bg-rose-900/50 dark:text-rose-200';
    buttonStyles = 'bg-rose-600 hover:bg-rose-700 text-white';
    Icon = AlertTriangle;
    statusTitle = `Subscription Overdue — ${subscription.month_name}`;
    statusSubtitle = `Due date was ${formattedDueDate} (${Math.abs(daysRemaining)} days ago). Please pay now.`;
  }

  return (
    <div
      role="alert"
      className={`rounded-xl border p-3 sm:p-4 transition-all shadow-xs ${containerStyles}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/80 dark:bg-black/30 border border-current/10">
            <Icon className="h-4.5 w-4.5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold leading-tight">
                {statusTitle}
              </h3>
              <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-semibold ${badgeStyles}`}>
                {formatPKR(effectiveAmount)}
              </span>
            </div>
            <p className="mt-0.5 text-xs opacity-90">
              {statusSubtitle}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onPayNow}
          className={`inline-flex items-center justify-center gap-1.5 min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer active:scale-95 shrink-0 self-end sm:self-center shadow-xs ${buttonStyles}`}
        >
          <CreditCard className="h-3.5 w-3.5" />
          <span>Pay Now</span>
        </button>
      </div>
    </div>
  );
}
