import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  description?: string;
  badge?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  children?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  badge,
  backHref,
  backLabel,
  children,
  className = '',
}: PageHeaderProps) {
  return (
    <div className={`space-y-2 mb-6 ${className}`}>
      {backHref && (
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors group mb-1"
        >
          <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
          <span>{backLabel || 'Back'}</span>
        </Link>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {title}
            </h1>
            {badge && <div>{badge}</div>}
          </div>
          {description && (
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              {description}
            </p>
          )}
        </div>

        {children && (
          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
