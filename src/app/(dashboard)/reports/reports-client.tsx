'use client';

import { useRouter } from 'next/navigation';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Receipt,
  Printer,
  Wallet,
  ShoppingBag,
  PieChart,
} from 'lucide-react';
import { formatPKR } from '@/lib/types';

interface ReportsClientProps {
  dateRange: string;
  totalRevenue: number;
  cogs: number;
  grossProfit: number;
  totalExpenses: number;
  netProfit: number;
  totalUdhaar: number;
  salesCount: number;
  paymentMethodStats: { method: string; total: number; count: number }[];
  topProducts: { name: string; model: string | null; quantity: number; revenue: number }[];
  expenseCategories: { name: string; amount: number }[];
}

export function ReportsClient({
  dateRange,
  totalRevenue,
  cogs,
  grossProfit,
  totalExpenses,
  netProfit,
  totalUdhaar,
  salesCount,
  paymentMethodStats,
  topProducts,
  expenseCategories,
}: ReportsClientProps) {
  const router = useRouter();

  function handleRangeChange(range: string) {
    router.push(`/reports?range=${range}`);
  }

  const isNetPositive = netProfit >= 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Financial & Sales Reports</h1>
          <p className="text-sm text-muted-foreground">
            Complete business analytics, profit & loss statement, inventory sales, and expense breakdown.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border bg-card p-1">
            {[
              { id: 'today', label: 'Today' },
              { id: 'week', label: 'This Week' },
              { id: 'month', label: 'This Month' },
              { id: 'all', label: 'All Time' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleRangeChange(tab.id)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                  dateRange === tab.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold hover:bg-muted"
          >
            <Printer className="h-4 w-4" />
            Print Report
          </button>
        </div>
      </div>

      {/* P&L Executive Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Gross Sales */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Gross Sales</span>
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">{formatPKR(totalRevenue)}</div>
          <p className="mt-1 text-xs text-muted-foreground">{salesCount} completed sales</p>
        </div>

        {/* Cost of Goods */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Cost of Goods (COGS)</span>
            <div className="rounded-lg bg-muted p-2 text-muted-foreground">
              <ShoppingBag className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">{formatPKR(cogs)}</div>
          <p className="mt-1 text-xs text-muted-foreground">Wholesale cost of items sold</p>
        </div>

        {/* Gross Profit */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Gross Profit</span>
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatPKR(grossProfit)}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Sales minus product cost</p>
        </div>

        {/* Operating Expenses */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Operating Expenses</span>
            <div className="rounded-lg bg-rose-500/10 p-2 text-rose-500">
              <TrendingDown className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-600 dark:text-rose-400">
            {formatPKR(totalExpenses)}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Rent, utilities, shop petty cash</p>
        </div>

        {/* Net Profit */}
        <div
          className={`rounded-xl border p-5 ${
            isNetPositive
              ? 'border-emerald-500/30 bg-emerald-500/5'
              : 'border-rose-500/30 bg-rose-500/5'
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-xs font-semibold uppercase tracking-wider ${
                isNetPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              Estimated Net Profit
            </span>
            <div
              className={`rounded-lg p-2 ${
                isNetPositive
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
              }`}
            >
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div
            className={`mt-2 text-2xl font-extrabold ${
              isNetPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {formatPKR(netProfit)}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Gross profit minus expenses</p>
        </div>

        {/* Outstanding Udhaar */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Customer Udhaar</span>
            <div className="rounded-lg bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
            {formatPKR(totalUdhaar)}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Outstanding customer credit balance</p>
        </div>
      </div>

      {/* Two Column Detailed Breakdown */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top Selling Products */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-primary" />
              Top Selling Products
            </h2>
            <span className="text-xs text-muted-foreground">By Units Sold</span>
          </div>

          {topProducts.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No product sales recorded in this period.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {topProducts.map((p, idx) => (
                <div key={idx} className="flex items-center justify-between py-2.5 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted font-bold text-[10px]">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="font-semibold text-foreground">{p.name}</div>
                      {p.model && <div className="text-muted-foreground text-[10px]">{p.model}</div>}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-bold text-foreground">{p.quantity} sold</div>
                    <div className="text-muted-foreground text-[10px]">{formatPKR(p.revenue)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Payment Methods Breakdown */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <PieChart className="h-4 w-4 text-primary" />
              Sales by Payment Channel
            </h2>
            <span className="text-xs text-muted-foreground">Total Inflow</span>
          </div>

          {paymentMethodStats.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No payments recorded in this period.
            </div>
          ) : (
            <div className="space-y-3">
              {paymentMethodStats.map((item) => {
                const percentage =
                  totalRevenue > 0 ? Math.round((item.total / totalRevenue) * 100) : 0;
                return (
                  <div key={item.method} className="space-y-1 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-foreground uppercase">
                        {item.method.replace('_', ' ')}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground font-mono">{formatPKR(item.total)}</span>
                        <span className="font-bold text-foreground">({percentage}%)</span>
                      </div>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Expense Category Breakdown */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Receipt className="h-4 w-4 text-rose-500" />
              Expense Distribution
            </h2>
            <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
              Total: {formatPKR(totalExpenses)}
            </span>
          </div>

          {expenseCategories.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No expense records found for this period.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {expenseCategories.map((cat, idx) => (
                <div key={idx} className="rounded-lg border border-border bg-muted/20 p-3 text-xs">
                  <div className="font-medium text-muted-foreground">{cat.name}</div>
                  <div className="text-base font-bold text-foreground mt-1">
                    {formatPKR(cat.amount)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
