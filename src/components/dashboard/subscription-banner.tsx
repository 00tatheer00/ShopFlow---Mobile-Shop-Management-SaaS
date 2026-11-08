'use client';

import { AlertTriangle, Calendar, CheckCircle2, Clock, CreditCard, Download } from 'lucide-react';
import type { ShopSubscription } from '@/lib/types';
import { formatPKR, toRupees } from '@/lib/types';

interface SubscriptionBannerProps {
  subscription?: ShopSubscription | null;
  onPayNow: () => void;
  onInstallApp?: () => void;
  canInstall?: boolean;
}

export function SubscriptionBanner({
  subscription,
  onPayNow,
  onInstallApp,
  canInstall = false,
}: SubscriptionBannerProps) {
  if (!subscription) return null;

  // If already paid, we don't need a loud banner; show a calm discreet indicator
  if (subscription.status === 'paid') {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200/80 bg-emerald-50/60 dark:border-emerald-900/50 dark:bg-emerald-950/20 px-4 py-2.5 text-xs text-emerald-900 dark:text-emerald-200">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="font-medium">
            Subscription active for <strong className="font-semibold">{subscription.month_name}</strong>. Everything is up to date.
          </span>
        </div>
        {canInstall && onInstallApp && (
          <button
            type="button"
            onClick={onInstallApp}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-800 dark:text-emerald-300 hover:underline cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Install App on phone</span>
          </button>
        )}
      </div>
    );
  }

  // Calculate days remaining until due date
  const dueDate = new Date(subscription.due_date);
  const now = new Date();
  // Normalize dates to start of day for accurate day counting
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfDueDay = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate()).getTime();
  const diffTime = startOfDueDay - startOfToday;
  const daysRemaining = Math.round(diffTime / (1000 * 60 * 60 * 24));

  // Determine state
  const isOverdue = daysRemaining < 0;
  const isDueSoon = daysRemaining >= 0 && daysRemaining <= 3;

  // Unambiguous date formatting: "7 December 2026"
  const formattedDueDate = dueDate.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Effective amount (minimum standard Rs 8,000)
  const effectiveAmount =
    subscription.amount === 650000 || subscription.amount < 800000
      ? 800000
      : subscription.amount;

  // Color schemes based on status
  let containerStyles = 'border-blue-200 bg-blue-50/70 text-blue-950 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-100';
  let badgeStyles = 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200';
  let buttonStyles = 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs';
  let Icon = Calendar;
  let statusTitle = `Monthly Subscription: ${subscription.month_name}`;
  let statusSubtitle = `Due on ${formattedDueDate}. Keep your POS and inventory active.`;

  if (isOverdue) {
    containerStyles = 'border-rose-300 bg-rose-50/90 text-rose-950 dark:border-rose-900/80 dark:bg-rose-950/40 dark:text-rose-100';
    badgeStyles = 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200';
    buttonStyles = 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs';
    Icon = AlertTriangle;
    statusTitle = `Subscription Overdue — ${subscription.month_name}`;
    statusSubtitle = `Due date was ${formattedDueDate} (${Math.abs(daysRemaining)} days ago). Please pay now to avoid service interruption.`;
  } else if (isDueSoon) {
    containerStyles = 'border-amber-300 bg-amber-50/90 text-amber-950 dark:border-amber-900/80 dark:bg-amber-950/40 dark:text-amber-100';
    badgeStyles = 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200';
    buttonStyles = 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs';
    Icon = Clock;
    statusTitle = `Subscription Due Soon — ${subscription.month_name}`;
    statusSubtitle = daysRemaining === 0
      ? `Due today (${formattedDueDate}). Please complete payment.`
      : `Due in ${daysRemaining} day${daysRemaining > 1 ? 's' : ''} on ${formattedDueDate}.`;
  }

  return (
    <div
      role="alert"
      className={`rounded-2xl border p-4 sm:p-5 transition-all shadow-xs ${containerStyles}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left: Icon and Text */}
        <div className="flex items-start gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/80 dark:bg-black/30 border border-current/10 shadow-xs">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold leading-snug">
                {statusTitle}
              </h3>
              <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${badgeStyles}`}>
                {formatPKR(effectiveAmount)}
              </span>
            </div>
            <p className="mt-1 text-sm opacity-90 leading-relaxed">
              {statusSubtitle}
            </p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex flex-wrap items-center gap-3 pt-1 sm:pt-0 self-end sm:self-center">
          {canInstall && onInstallApp && (
            <button
              type="button"
              onClick={onInstallApp}
              className="inline-flex items-center gap-1.5 text-xs font-medium opacity-80 hover:opacity-100 transition-opacity py-2 px-2.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Install App</span>
            </button>
          )}

          <button
            type="button"
            onClick={onPayNow}
            className={`inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer active:scale-95 ${buttonStyles}`}
          >
            <CreditCard className="h-4 w-4" />
            <span>Pay Now</span>
          </button>
        </div>
      </div>
    </div>
  );
}

