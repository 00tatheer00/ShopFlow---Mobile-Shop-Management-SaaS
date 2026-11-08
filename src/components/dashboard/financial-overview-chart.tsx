'use client';

import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';
import { BarChart3 } from 'lucide-react';
import { formatPKR, toRupees } from '@/lib/types';
import { InfoTooltip } from './info-tooltip';

interface FinancialOverviewChartProps {
  sales: number;
  cogs: number;
  expenses: number;
  netProfit: number;
  cash: number;
}

export function FinancialOverviewChart({
  sales,
  cogs,
  expenses,
  netProfit,
  cash,
}: FinancialOverviewChartProps) {
  // Prevent SSR hydration mismatch with Recharts ResponsiveContainer
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const data = [
    {
      name: "Today's Sales",
      urdu: 'کل سیل',
      amountPaisa: sales,
      amountRupees: toRupees(sales),
      color: '#3b82f6', // blue-500
    },
    {
      name: 'Item Cost',
      urdu: 'سامان لاگت',
      amountPaisa: cogs,
      amountRupees: toRupees(cogs),
      color: '#8b5cf6', // violet-500
    },
    {
      name: 'Expenses',
      urdu: 'دکان خرچہ',
      amountPaisa: expenses,
      amountRupees: toRupees(expenses),
      color: '#f43f5e', // rose-500
    },
    {
      name: 'Net Profit',
      urdu: 'اصل بچت',
      amountPaisa: netProfit,
      amountRupees: Math.max(0, toRupees(netProfit)),
      color: netProfit >= 0 ? '#10b981' : '#f43f5e', // emerald-500 or rose-500
    },
    {
      name: 'Cash Wasooli',
      urdu: 'نقد وصولی',
      amountPaisa: cash,
      amountRupees: toRupees(cash),
      color: '#0d9488', // teal-600
    },
  ];

  const totalActivity = sales + cogs + expenses + cash;

  if (!isMounted) {
    return (
      <div className="h-[280px] w-full rounded-2xl border border-border bg-card p-5 flex items-center justify-center">
        <div className="h-40 w-full rounded-xl bg-muted/40 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xs flex flex-col justify-between">
      <div className="flex items-center justify-between pb-4 border-b border-border/70 gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <BarChart3 className="h-4.5 w-4.5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">
              Today&apos;s Financial Breakdown
            </h3>
            <p className="text-xs text-muted-foreground">
              Visual comparison of revenue, wholesale costs, expenses, and cash
            </p>
          </div>
        </div>

        <InfoTooltip
          title="مالیاتی گراف"
          urduText="یہ گراف آپ کو دکھاتا ہے کہ آج کتنی سیل ہوئی، سامان کی خریداری لاگت کیا تھی، دکان کا کتنا خرچہ ہوا، اور آپ کی جیب میں بچت کتنی بچی۔"
        />
      </div>

      {totalActivity === 0 ? (
        <div className="h-[240px] flex flex-col items-center justify-center text-center p-6">
          <p className="text-sm font-medium text-muted-foreground">
            No sales or expenses recorded yet today.
          </p>
          <p className="text-xs text-muted-foreground/80 mt-1 max-w-xs">
            As you make sales and record daily expenses, this chart will update automatically with your profit margins.
          </p>
        </div>
      ) : (
        <div className="h-[260px] w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 12, right: 12, left: -16, bottom: 20 }}
            >
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'currentColor', fontSize: 12, fontWeight: 500 }}
                interval={0}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'currentColor', fontSize: 11 }}
                tickFormatter={(val) => `Rs ${val >= 1000 ? `${Math.round(val / 1000)}k` : val}`}
              />
              <Tooltip
                cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload;
                    return (
                      <div className="rounded-xl border border-border bg-card p-3 shadow-lg text-xs space-y-1">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-semibold text-foreground">{item.name}</span>
                          <span
                            dir="rtl"
                            lang="ur"
                            className="font-urdu text-[11px] text-muted-foreground"
                          >
                            {item.urdu}
                          </span>
                        </div>
                        <p className="text-sm font-bold font-mono text-primary">
                          {formatPKR(item.amountPaisa)}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="amountRupees" radius={[8, 8, 0, 0]} maxBarSize={48}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

