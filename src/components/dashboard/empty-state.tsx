'use client';

import React from 'react';
import Link from 'next/link';
import { Package, ArrowUpRight } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  icon?: React.ElementType;
}

export function EmptyState({
  title = 'No activity yet today',
  description = 'Start by creating your first sale or adding inventory. Your activity will appear here automatically.',
  actionLabel = 'Create First Sale',
  actionHref = '/sales/new',
  icon: Icon = Package,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border border-dashed border-border bg-card/50">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground mb-3.5">
        <Icon className="h-6 w-6" />
      </div>

      <h3 className="text-base font-semibold text-foreground">
        {title}
      </h3>

      <p className="mt-1.5 text-sm text-muted-foreground max-w-sm leading-relaxed">
        {description}
      </p>

      {actionHref && actionLabel && (
        <Link
          href={actionHref}
          className="mt-5 inline-flex items-center justify-center gap-1.5 min-h-[44px] rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-xs hover:bg-primary/95 transition active:scale-95 cursor-pointer"
        >
          <span>{actionLabel}</span>
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

