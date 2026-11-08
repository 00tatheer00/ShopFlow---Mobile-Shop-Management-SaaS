'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowUpRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { InfoTooltip } from './info-tooltip';

export type MetricVariant =
  | 'sales'
  | 'profit'
  | 'cash'
  | 'udhaar'
  | 'cogs'
  | 'expense'
  | 'net_profit';

export interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  urduDetail: string;
  icon: React.ElementType;
  variant?: MetricVariant;
  isHero?: boolean;
  rawAmount?: number;
  emptyHint?: {
    text: string;
    actionLabel?: string;
    actionHref?: string;
  };
  trend?: {
    type: 'positive' | 'negative' | 'neutral';
    label: string;
  };
}

export function MetricCard({
  title,
  value,
  subtitle,
  urduDetail,
  icon: Icon,
  variant = 'sales',
  isHero = false,
  rawAmount,
  emptyHint,
  trend,
}: MetricCardProps) {
  const isZero = rawAmount === 0;

  // Semantic styles - calm neutral surfaces with meaningful accent highlights
  const getSemanticAccent = () => {
    switch (variant) {
      case 'profit':
        return {
          iconBg: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
          valueColor: 'text-foreground',
          accentBorder: 'hover:border-emerald-300 dark:hover:border-emerald-700',
          indicator: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800',
        };
      case 'net_profit':
        const isLoss = rawAmount !== undefined && rawAmount < 0;
        return isLoss
          ? {
              iconBg: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
              valueColor: 'text-rose-700 dark:text-rose-400',
              accentBorder: 'hover:border-rose-300 dark:hover:border-rose-700',
              indicator: 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800',
            }
          : {
              iconBg: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
              valueColor: 'text-emerald-700 dark:text-emerald-400',
              accentBorder: 'hover:border-emerald-300 dark:hover:border-emerald-700',
              indicator: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800',
            };
      case 'expense':
        return {
          iconBg: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
          valueColor: 'text-foreground',
          accentBorder: 'hover:border-rose-300 dark:hover:border-rose-700',
          indicator: 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800',
        };
      case 'udhaar':
        return {
          iconBg: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
          valueColor: 'text-foreground',
          accentBorder: 'hover:border-amber-300 dark:hover:border-amber-700',
          indicator: 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800',
        };
      case 'cash':
        return {
          iconBg: 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800',
          valueColor: 'text-foreground',
          accentBorder: 'hover:border-teal-300 dark:hover:border-teal-700',
          indicator: 'text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/50 border-teal-200 dark:border-teal-800',
        };
      case 'cogs':
        return {
          iconBg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
          valueColor: 'text-foreground',
          accentBorder: 'hover:border-slate-400 dark:hover:border-slate-600',
          indicator: 'text-slate-700 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700',
        };
      case 'sales':
      default:
        return {
          iconBg: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
          valueColor: 'text-foreground',
          accentBorder: 'hover:border-blue-300 dark:hover:border-blue-700',
          indicator: 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800',
        };
    }
  };

  const accent = getSemanticAccent();

  return (
    <div
      className={`relative rounded-2xl border border-border bg-card transition-all duration-200 shadow-xs flex flex-col justify-between ${
        accent.accentBorder
      } ${isHero ? 'p-5 sm:p-6 min-h-[160px]' : 'p-4 sm:p-5 min-h-[140px]'}`}
    >
      <div>
        {/* Header row: Title (no truncate) + Info Tooltip + Icon */}
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex items-center gap-1.5 flex-1 min-w-0 flex-wrap">
            <span
              className={`font-medium text-muted-foreground leading-snug break-words ${
                isHero ? 'text-sm sm:text-base text-foreground font-semibold' : 'text-xs sm:text-sm'
              }`}
            >
              {title}
            </span>
            <InfoTooltip title={title} urduText={urduDetail} ariaLabel={`معلومات برائے ${title}`} />
          </div>

          <div
            className={`flex shrink-0 items-center justify-center rounded-xl border p-2.5 ${accent.iconBg}`}
          >
            <Icon className={isHero ? 'h-5 w-5' : 'h-4.5 w-4.5'} />
          </div>
        </div>

        {/* Value Display */}
        <div className="mt-3 sm:mt-4 flex flex-wrap items-baseline gap-2">
          <div
            className={`font-bold font-mono tracking-tight tabular-nums ${accent.valueColor} ${
              isHero ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl'
            }`}
          >
            {value}
          </div>

          {/* Colorblind-friendly semantic indicator (Icon + Label) */}
          {trend && (
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md border ${accent.indicator}`}
            >
              {trend.type === 'positive' && <TrendingUp className="h-3 w-3" />}
              {trend.type === 'negative' && <TrendingDown className="h-3 w-3" />}
              {trend.type === 'neutral' && <Minus className="h-3 w-3" />}
              <span>{trend.label}</span>
            </span>
          )}
        </div>
      </div>

      {/* Footer / Subtitle / Empty State Guidance */}
      <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center justify-between text-xs">
        {isZero && emptyHint ? (
          <div className="flex items-center justify-between w-full gap-2">
            <span className="text-muted-foreground font-normal truncate">
              {emptyHint.text}
            </span>
            {emptyHint.actionHref && emptyHint.actionLabel && (
              <Link
                href={emptyHint.actionHref}
                className="inline-flex items-center gap-1 font-semibold text-primary hover:underline shrink-0"
              >
                <span>{emptyHint.actionLabel}</span>
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            )}
          </div>
        ) : (
          <span className="text-muted-foreground font-normal leading-normal">
            {subtitle || ''}
          </span>
        )}
      </div>
    </div>
  );
}

