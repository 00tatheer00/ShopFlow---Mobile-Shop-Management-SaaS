'use client';

import { useState } from 'react';
import {
  TrendingUp,
  DollarSign,
  Banknote,
  AlertTriangle,
  ArrowUpRight,
  Package,
  Clock,
  Receipt,
  TrendingDown,
  ShoppingBag,
  CreditCard,
  CheckCircle2,
  Info,
  X,
} from 'lucide-react';
import type { DashboardMetrics, UserRole, ShopSubscription } from '@/lib/types';
import { formatPKR, toRupees } from '@/lib/types';

interface DashboardContentProps {
  metrics: DashboardMetrics;
  userName: string;
  role: UserRole;
  subscription?: ShopSubscription | null;
}

export function DashboardContent({ metrics, userName, role, subscription }: DashboardContentProps) {
  const [showBankDetails, setShowBankDetails] = useState(false);
  const greeting = getGreeting();
  const firstName = userName.split(' ')[0];
  const isPrivileged = role === 'shop_owner' || role === 'manager';
  const isOwner = role === 'shop_owner';

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Greeting & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {greeting}, {firstName} 👋
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Here&apos;s what&apos;s happening with your shop today.
          </p>
        </div>

        {/* Subscription Quick Badge for Owner */}
        {isOwner && subscription && (
          <div className="flex items-center gap-2">
            {subscription.status === 'paid' ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>{subscription.month_name} Active (Paid)</span>
              </span>
            ) : (
              <button
                onClick={() => setShowBankDetails(true)}
                className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 px-3 py-1 text-xs font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-500/25 transition cursor-pointer"
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>{subscription.month_name} Due (Rs. 6,500) &bull; Pay Now</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Subscription Alert Banner if Unpaid */}
      {isOwner && subscription && subscription.status !== 'paid' && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-500 font-bold">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Monthly Subscription Due: Rs. {toRupees(subscription.amount).toLocaleString()} ({subscription.month_name})
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Due Date: {new Date(subscription.due_date).toLocaleDateString()}. Please send Rs. 6,500 to keep uninterrupted POS and inventory access.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowBankDetails(true)}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 text-xs font-bold shadow-sm transition shrink-0"
          >
            <span>View Bank / EasyPaisa Details</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Bank Details Modal */}
      {showBankDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in fade-in-0 zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">ShopFlow Subscription Payment</h3>
                  <p className="text-xs text-muted-foreground">Official Accounts for Rs. 6,500 / month</p>
                </div>
              </div>
              <button
                onClick={() => setShowBankDetails(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="p-3.5 rounded-xl border border-border bg-muted/40 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Monthly Fee:</span>
                  <span className="font-bold text-sm text-foreground font-mono">Rs. 6,500 / month</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Billing Month:</span>
                  <span className="font-semibold text-foreground">{subscription?.month_name || 'Current Month'}</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-border bg-card space-y-2.5">
                <div className="font-bold text-xs text-foreground uppercase tracking-wider text-[10px] text-muted-foreground">
                  Online Bank Transfer (Recommended)
                </div>
                <div>
                  <div className="text-muted-foreground text-[11px]">Bank Name:</div>
                  <div className="font-bold text-foreground">Meezan Bank Ltd</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-[11px]">Account Title:</div>
                  <div className="font-bold text-foreground">ShopFlow Technologies SMC-Pvt Ltd</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-[11px]">Account Number:</div>
                  <div className="font-mono font-bold text-foreground">02890108392101</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-[11px]">IBAN:</div>
                  <div className="font-mono text-xs text-foreground">PK49MEZN0002890108392101</div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-border bg-card space-y-2">
                <div className="font-bold text-xs text-foreground uppercase tracking-wider text-[10px] text-muted-foreground">
                  Mobile Wallet (EasyPaisa / JazzCash)
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">EasyPaisa / JazzCash:</span>
                  <span className="font-mono font-bold text-foreground">0300-1234567</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-primary text-[11px] leading-relaxed">
                After transfer, send your receipt screenshot to WhatsApp <strong>0300-1234567</strong> or reply to your monthly email. Super Admin will approve your payment within 15 minutes.
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setShowBankDetails(false)}
                className="rounded-xl bg-primary px-5 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Primary KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Today's Sales */}
        <MetricCard
          title="Today's Sales"
          value={formatPKR(metrics.today_sales)}
          icon={TrendingUp}
          variant="sales"
          subtitle={`${metrics.today_sales_count ?? 0} completed orders`}
        />

        {/* Today's Gross Profit (Owner/Manager Only) */}
        {isPrivileged ? (
          <MetricCard
            title="Gross Profit"
            value={formatPKR(metrics.today_profit)}
            icon={DollarSign}
            variant="profit"
            subtitle="Sales minus wholesale cost"
          />
        ) : (
          <MetricCard
            title="Catalog Items"
            value={String(metrics.total_products ?? 0)}
            icon={Package}
            variant="sales"
            subtitle="Total active products"
          />
        )}

        {/* Cash Received */}
        <MetricCard
          title="Cash Received"
          value={formatPKR(metrics.today_cash)}
          icon={Banknote}
          variant="cash"
          subtitle="Today's total payments"
        />

        {/* Total Udhaar */}
        <MetricCard
          title="Total Udhaar"
          value={formatPKR(metrics.total_udhaar)}
          icon={Receipt}
          variant="udhaar"
          subtitle="Customer credit balance"
        />
      </div>

      {/* Secondary Financial Snapshot (Owner/Manager Only) */}
      {isPrivileged && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Today's COGS */}
          <MetricCard
            title="Product Cost (COGS)"
            value={formatPKR(metrics.today_cogs ?? 0)}
            icon={ShoppingBag}
            variant="cogs"
            subtitle="Wholesale cost of goods sold"
          />

          {/* Today's Expenses */}
          <MetricCard
            title="Today's Expenses"
            value={formatPKR(metrics.today_expenses ?? 0)}
            icon={TrendingDown}
            variant="expense"
            subtitle="Shop overheads & daily bills"
          />

          {/* Today's Net Profit */}
          <MetricCard
            title="Net Profit"
            value={formatPKR(metrics.today_net_profit ?? 0)}
            icon={DollarSign}
            variant={(metrics.today_net_profit ?? 0) >= 0 ? 'net_profit' : 'expense'}
            subtitle="Gross profit minus expenses"
          />
        </div>
      )}

      {/* Low Stock Alert */}
      {metrics.low_stock_count > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-warning/20 bg-warning/5 px-4 py-3">
          <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">
              {metrics.low_stock_count} product{metrics.low_stock_count > 1 ? 's' : ''} running low on stock
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Check your inventory to avoid running out
            </p>
          </div>
          <a
            href="/products"
            className="flex items-center gap-1 text-xs font-medium text-warning hover:text-warning/80 transition-colors"
          >
            View
            <ArrowUpRight className="h-3 w-3" />
          </a>
        </div>
      )}

      {/* Recent Transactions */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">
              Recent Transactions
            </h2>
          </div>
          <a
            href="/sales"
            className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
          >
            View all
          </a>
        </div>

        {metrics.recent_transactions.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="divide-y divide-border">
            {metrics.recent_transactions.map((txn) => (
              <div
                key={txn.id}
                className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <TrendingUp className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {txn.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatRelativeTime(txn.created_at)}
                    </p>
                  </div>
                </div>
                <span className={`text-sm font-semibold tabular-nums ml-3 font-mono ${
                  txn.amount === 0 ? 'text-muted-foreground line-through' : 'text-foreground'
                }`}>
                  {formatPKR(txn.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Helper Components ----

type MetricVariant = 'sales' | 'profit' | 'cash' | 'udhaar' | 'cogs' | 'expense' | 'net_profit';

interface MetricStyle {
  cardBg: string;
  cardBorder: string;
  hoverBorder: string;
  titleColor: string;
  iconBg: string;
  iconColor: string;
  valueColor: string;
  subColor: string;
}

function MetricCard({
  title,
  value,
  icon: Icon,
  variant,
  subtitle,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  variant: MetricVariant;
  subtitle: string;
}) {
  const variantStyles: Record<MetricVariant, MetricStyle> = {
    sales: {
      cardBg: 'bg-blue-50/80 dark:bg-blue-950/30',
      cardBorder: 'border-blue-200/50 dark:border-blue-900/40',
      hoverBorder: 'hover:border-blue-500 dark:hover:border-blue-400',
      titleColor: 'text-blue-700 dark:text-blue-300',
      iconBg: 'bg-blue-100/90 dark:bg-blue-900/60 border-blue-200 dark:border-blue-800',
      iconColor: 'text-blue-600 dark:text-blue-400',
      valueColor: 'text-blue-950 dark:text-blue-50',
      subColor: 'text-blue-600/80 dark:text-blue-400/80',
    },
    profit: {
      cardBg: 'bg-emerald-50/80 dark:bg-emerald-950/30',
      cardBorder: 'border-emerald-200/50 dark:border-emerald-900/40',
      hoverBorder: 'hover:border-emerald-500 dark:hover:border-emerald-400',
      titleColor: 'text-emerald-700 dark:text-emerald-300',
      iconBg: 'bg-emerald-100/90 dark:bg-emerald-900/60 border-emerald-200 dark:border-emerald-800',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      valueColor: 'text-emerald-950 dark:text-emerald-50',
      subColor: 'text-emerald-600/80 dark:text-emerald-400/80',
    },
    cash: {
      cardBg: 'bg-cyan-50/80 dark:bg-cyan-950/30',
      cardBorder: 'border-cyan-200/50 dark:border-cyan-900/40',
      hoverBorder: 'hover:border-cyan-500 dark:hover:border-cyan-400',
      titleColor: 'text-cyan-700 dark:text-cyan-300',
      iconBg: 'bg-cyan-100/90 dark:bg-cyan-900/60 border-cyan-200 dark:border-cyan-800',
      iconColor: 'text-cyan-600 dark:text-cyan-400',
      valueColor: 'text-cyan-950 dark:text-cyan-50',
      subColor: 'text-cyan-600/80 dark:text-cyan-400/80',
    },
    udhaar: {
      cardBg: 'bg-amber-50/80 dark:bg-amber-950/30',
      cardBorder: 'border-amber-200/50 dark:border-amber-900/40',
      hoverBorder: 'hover:border-amber-500 dark:hover:border-amber-400',
      titleColor: 'text-amber-700 dark:text-amber-300',
      iconBg: 'bg-amber-100/90 dark:bg-amber-900/60 border-amber-200 dark:border-amber-800',
      iconColor: 'text-amber-600 dark:text-amber-400',
      valueColor: 'text-amber-950 dark:text-amber-50',
      subColor: 'text-amber-600/80 dark:text-amber-400/80',
    },
    cogs: {
      cardBg: 'bg-violet-50/80 dark:bg-violet-950/30',
      cardBorder: 'border-violet-200/50 dark:border-violet-900/40',
      hoverBorder: 'hover:border-violet-500 dark:hover:border-violet-400',
      titleColor: 'text-violet-700 dark:text-violet-300',
      iconBg: 'bg-violet-100/90 dark:bg-violet-900/60 border-violet-200 dark:border-violet-800',
      iconColor: 'text-violet-600 dark:text-violet-400',
      valueColor: 'text-violet-950 dark:text-violet-50',
      subColor: 'text-violet-600/80 dark:text-violet-400/80',
    },
    expense: {
      cardBg: 'bg-rose-50/80 dark:bg-rose-950/30',
      cardBorder: 'border-rose-200/50 dark:border-rose-900/40',
      hoverBorder: 'hover:border-rose-500 dark:hover:border-rose-400',
      titleColor: 'text-rose-700 dark:text-rose-300',
      iconBg: 'bg-rose-100/90 dark:bg-rose-900/60 border-rose-200 dark:border-rose-800',
      iconColor: 'text-rose-600 dark:text-rose-400',
      valueColor: 'text-rose-700 dark:text-rose-300',
      subColor: 'text-rose-600/80 dark:text-rose-400/80',
    },
    net_profit: {
      cardBg: 'bg-emerald-50/80 dark:bg-emerald-950/30',
      cardBorder: 'border-emerald-200/50 dark:border-emerald-900/40',
      hoverBorder: 'hover:border-emerald-500 dark:hover:border-emerald-400',
      titleColor: 'text-emerald-700 dark:text-emerald-300',
      iconBg: 'bg-emerald-100/90 dark:bg-emerald-900/60 border-emerald-200 dark:border-emerald-800',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      valueColor: 'text-emerald-700 dark:text-emerald-300',
      subColor: 'text-emerald-600/80 dark:text-emerald-400/80',
    },
  };

  const style = variantStyles[variant];

  return (
    <div
      className={`rounded-2xl border p-5 transition-colors duration-300 ease-out ${style.cardBg} ${style.cardBorder} ${style.hoverBorder}`}
    >
      <div className="flex items-center justify-between">
        <p className={`text-xs font-bold uppercase tracking-wider ${style.titleColor}`}>
          {title}
        </p>
        <div className={`rounded-xl p-2 border ${style.iconBg} ${style.iconColor}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className={`mt-3 text-2xl sm:text-3xl font-black tracking-tight tabular-nums font-mono ${style.valueColor}`}>
        {value}
      </p>
      <p className={`mt-1 text-xs font-medium ${style.subColor}`}>{subtitle}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center px-5 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted/50">
        <Package className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-sm font-medium text-foreground">
        No transactions yet
      </h3>
      <p className="mt-1 text-xs text-muted-foreground max-w-[240px]">
        Start by adding products and making your first sale. Your activity will show up here.
      </p>
      <a
        href="/sales/new"
        className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
      >
        Create First Sale
        <ArrowUpRight className="h-3 w-3" />
      </a>
    </div>
  );
}

// ---- Utilities ----

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-PK', {
    month: 'short',
    day: 'numeric',
  });
}
