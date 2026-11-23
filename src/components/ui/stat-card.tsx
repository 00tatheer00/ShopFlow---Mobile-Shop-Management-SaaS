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
    <div className="panel flex min-w-0 flex-col p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-semibold text-foreground">{title}</span>
            {urduDetail && <CardInfoTooltip title={title} urduDetail={urduDetail} />}
          </div>
          {ur && <Ur className="block text-sm text-muted-foreground">{ur}</Ur>}
        </div>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${TONE_CHIP[color as Tone]}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-baseline gap-2">
        <span
          className={`truncate font-mono text-2xl font-bold tabular-nums tracking-tight ${
            negative ? 'text-destructive' : 'text-foreground'
          }`}
        >
          {value}
        </span>
        {badge && (
          <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-semibold text-muted-foreground">{badge}</span>
        )}
      </div>

      {subtitle && <p className="mt-1 truncate text-sm text-muted-foreground">{subtitle}</p>}
    </div>
  );
}
