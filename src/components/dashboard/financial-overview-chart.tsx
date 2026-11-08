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
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const data = [
    {
      name: 'Sales',
      amountPaisa: sales,
      amountRupees: toRupees(sales),
      color: '#3b82f6',
    },
    {
      name: 'Item Cost',
      amountPaisa: cogs,
      amountRupees: toRupees(cogs),
      color: '#8b5cf6',
    },
    {
      name: 'Expenses',
      amountPaisa: expenses,
      amountRupees: toRupees(expenses),
      color: '#f43f5e',
    },
    {
      name: 'Net Profit',
      amountPaisa: netProfit,
      amountRupees: Math.max(0, toRupees(netProfit)),
      color: netProfit >= 0 ? '#10b981' : '#f43f5e',
    },
    {
      name: 'Cash Wasooli',
      amountPaisa: cash,
      amountRupees: toRupees(cash),
      color: '#0d9488',
    },
  ];

  const totalActivity = sales + cogs + expenses + cash;

  if (!isMounted) {
    return (
      <div className="h-[210px] w-full rounded-xl border border-border bg-card p-4 flex items-center justify-center">
        <div className="h-32 w-full rounded-lg bg-muted/40 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-4.5 shadow-xs flex flex-col justify-between">
      <div className="flex items-center justify-between pb-3 border-b border-border/60 gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <BarChart3 className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Today&apos;s Financial Breakdown
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Revenue, wholesale costs, expenses, and net profit
            </p>
          </div>
        </div>

        <InfoTooltip
          title="مالیاتی گراف"
          urduText="یہ گراف آپ کو دکھاتا ہے کہ آج کتنی سیل ہوئی، سامان کی خریداری لاگت کیا تھی، دکان کا کتنا خرچہ ہوا، اور آپ کی جیب میں بچت کتنی بچی۔"
        />
      </div>

      {totalActivity === 0 ? (
        <div className="h-[150px] flex flex-col items-center justify-center text-center p-4">
          <p className="text-xs font-medium text-muted-foreground">
            No transactions recorded yet today.
          </p>
          <p className="text-[11px] text-muted-foreground/80 mt-0.5 max-w-xs">
            As you make sales and record expenses, this chart will update automatically.
          </p>
        </div>
      ) : (
        <div className="h-[160px] w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 8, right: 8, left: -20, bottom: 8 }}
            >
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'currentColor', fontSize: 11, fontWeight: 500 }}
                interval={0}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'currentColor', fontSize: 10 }}
                tickFormatter={(val) => `Rs ${val >= 1000 ? `${Math.round(val / 1000)}k` : val}`}
              />
              <Tooltip
                cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload;
                    return (
                      <div className="rounded-lg border border-border bg-card p-2 shadow-md text-xs space-y-0.5">
                        <span className="font-semibold text-foreground">{item.name}</span>
                        <p className="text-xs font-bold font-mono text-primary">
                          {formatPKR(item.amountPaisa)}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="amountRupees" radius={[6, 6, 0, 0]} maxBarSize={38}>
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
