'use client';

import React from 'react';
import { CardInfoTooltip } from './card-info-tooltip';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  color?: 'blue' | 'emerald' | 'amber' | 'rose' | 'violet' | 'teal' | 'slate';
  urduDetail?: string;
  badge?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'blue',
  urduDetail,
  badge,
}: StatCardProps) {
  const colorStyles = {
    blue: {
      iconBg: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      valueColor: 'text-foreground',
      hoverBorder: 'hover:border-blue-300 dark:hover:border-blue-700',
    },
    emerald: {
      iconBg: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      valueColor: 'text-foreground',
      hoverBorder: 'hover:border-emerald-300 dark:hover:border-emerald-700',
    },
    amber: {
      iconBg: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      valueColor: 'text-foreground',
      hoverBorder: 'hover:border-amber-300 dark:hover:border-amber-700',
    },
    rose: {
      iconBg: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
      valueColor: 'text-foreground',
      hoverBorder: 'hover:border-rose-300 dark:hover:border-rose-700',
    },
    violet: {
      iconBg: 'bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800',
      valueColor: 'text-foreground',
      hoverBorder: 'hover:border-violet-300 dark:hover:border-violet-700',
    },
    teal: {
      iconBg: 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800',
      valueColor: 'text-foreground',
      hoverBorder: 'hover:border-teal-300 dark:hover:border-teal-700',
    },
    slate: {
      iconBg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
      valueColor: 'text-foreground',
      hoverBorder: 'hover:border-slate-400 dark:hover:border-slate-600',
    },
  }[color];

  return (
    <div
      className={`rounded-xl border border-border bg-card p-3 sm:p-3.5 transition-all duration-200 shadow-xs flex flex-col justify-between ${colorStyles.hoverBorder}`}
    >
      <div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <span className="text-[11.5px] sm:text-xs font-medium text-muted-foreground leading-tight truncate">
              {title}
            </span>
            {urduDetail && (
              <CardInfoTooltip title={title} urduDetail={urduDetail} />
            )}
          </div>

          <div
            className={`flex shrink-0 items-center justify-center rounded-lg border p-1.5 ${colorStyles.iconBg}`}
          >
            <Icon className="h-3.5 w-3.5" />
          </div>
        </div>

        <div className="mt-2 sm:mt-2.5 flex flex-wrap items-baseline gap-1.5">
          <div
            className={`text-lg sm:text-xl font-bold font-mono tracking-tight tabular-nums ${colorStyles.valueColor}`}
          >
            {value}
          </div>
          {badge && (
            <span className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded border border-border bg-muted/60 text-muted-foreground">
              {badge}
            </span>
          )}
        </div>
      </div>

      {subtitle && (
        <div className="mt-2 pt-1.5 border-t border-border/50 text-[11px] text-muted-foreground truncate leading-tight">
          {subtitle}
        </div>
      )}
    </div>
  );
}
