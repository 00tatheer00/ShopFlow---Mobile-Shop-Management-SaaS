'use client';

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
} from 'lucide-react';
import type { DashboardMetrics, UserRole } from '@/lib/types';
import { formatPKR } from '@/lib/types';

interface DashboardContentProps {
  metrics: DashboardMetrics;
  userName: string;
  role: UserRole;
}

export function DashboardContent({ metrics, userName, role }: DashboardContentProps) {
  const greeting = getGreeting();
  const firstName = userName.split(' ')[0];
  const isPrivileged = role === 'shop_owner' || role === 'manager';

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {greeting}, {firstName} 👋
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Here&apos;s what&apos;s happening with your shop today.
        </p>
      </div>

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
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Product Cost (COGS)</span>
              <div className="rounded-lg bg-muted p-1.5 text-muted-foreground">
                <ShoppingBag className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 text-xl font-bold text-foreground">
              {formatPKR(metrics.today_cogs ?? 0)}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">Wholesale cost of goods sold</p>
          </div>

          {/* Today's Expenses */}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Today&apos;s Expenses</span>
              <div className="rounded-lg bg-rose-500/10 p-1.5 text-rose-500">
                <TrendingDown className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 text-xl font-bold text-rose-600 dark:text-rose-400">
              {formatPKR(metrics.today_expenses ?? 0)}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">Shop overheads & daily bills</p>
          </div>

          {/* Today's Net Profit */}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Net Profit</span>
              <div className="rounded-lg bg-emerald-500/10 p-1.5 text-emerald-600 dark:text-emerald-400">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
            <div className={`mt-2 text-xl font-bold ${
              (metrics.today_net_profit ?? 0) >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}>
              {formatPKR(metrics.today_net_profit ?? 0)}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">Gross profit minus expenses</p>
          </div>
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
  variant: 'sales' | 'profit' | 'cash' | 'udhaar';
  subtitle: string;
}) {
  const variantStyles: Record<string, { bg: string; iconColor: string }> = {
    sales: { bg: 'metric-sales', iconColor: 'text-primary' },
    profit: { bg: 'metric-profit', iconColor: 'text-success' },
    cash: { bg: 'metric-cash', iconColor: 'text-info' },
    udhaar: { bg: 'metric-udhaar', iconColor: 'text-warning' },
  };

  const style = variantStyles[variant];

  return (
    <div className={`rounded-xl border border-border bg-card p-5 card-hover ${style.bg}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {title}
        </p>
        <div className={`rounded-lg bg-background/80 p-2 ${style.iconColor}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-3 text-2xl font-bold tracking-tight text-foreground tabular-nums">
        {value}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
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
