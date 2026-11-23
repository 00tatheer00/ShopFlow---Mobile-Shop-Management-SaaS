'use client';

import React from 'react';
import { CardInfoTooltip } from './card-info-tooltip';
import { Ur } from './urdu';
import { TONE_CHIP, type Tone } from './kit';

interface StatCardProps {
  title: string;
  /** Short Urdu label shown under the title */
  ur?: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  color?: 'blue' | 'emerald' | 'amber' | 'rose' | 'violet' | 'teal' | 'slate' | 'sky' | 'pink' | 'cyan';
  /** Longer Urdu explanation (shown in an info tooltip) */
  urduDetail?: string;
  badge?: string;
  /** Highlight the value in red (e.g. loss) */
  negative?: boolean;
}

/** Calm KPI card: soft tinted icon, large value, one-line note. */
export function StatCard({
  title,
  ur,
  value,
  subtitle,
  icon: Icon,
  color = 'violet',
  urduDetail,
  badge,
  negative = false,
}: StatCardProps) {
  return (
    <div className="panel flex min-w-0 flex-col p-3.5 sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold leading-snug text-foreground sm:truncate">{title}</span>
            {urduDetail && <CardInfoTooltip title={title} urduDetail={urduDetail} />}
          </div>
          {ur && <Ur className="block text-sm text-muted-foreground">{ur}</Ur>}
        </div>
        <span className={`hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:flex ${TONE_CHIP[color as Tone]}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-baseline gap-2 sm:mt-3">
        <span
          className={`truncate font-mono text-xl font-bold tabular-nums tracking-tight sm:text-2xl ${
            negative ? 'text-destructive' : 'text-foreground'
          }`}
        >
          {value}
        </span>
        {badge && (
          <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-semibold text-muted-foreground">{badge}</span>
        )}
      </div>

      {subtitle && <p className="mt-1 line-clamp-1 text-xs text-muted-foreground sm:text-sm">{subtitle}</p>}
    </div>
  );
}
