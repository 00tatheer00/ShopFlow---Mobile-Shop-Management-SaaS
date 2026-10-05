import React from 'react';

interface CurrencyDisplayProps {
  amount: number;
  isPaisas?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'success' | 'danger' | 'warning' | 'muted';
  className?: string;
  prefix?: string;
}

export function CurrencyDisplay({
  amount,
  isPaisas = true,
  size = 'md',
  variant = 'default',
  className = '',
  prefix = 'Rs.',
}: CurrencyDisplayProps) {
  const rupees = isPaisas ? Math.round(amount / 100) : Math.round(amount);
  const formatted = new Intl.NumberFormat('en-PK').format(rupees);

  let sizeClass = 'text-sm font-semibold';
  switch (size) {
    case 'xs':
      sizeClass = 'text-[11px] font-medium';
      break;
    case 'sm':
      sizeClass = 'text-xs font-semibold';
      break;
    case 'md':
      sizeClass = 'text-sm font-semibold';
      break;
    case 'lg':
      sizeClass = 'text-lg sm:text-xl font-bold tracking-tight';
      break;
    case 'xl':
      sizeClass = 'text-2xl sm:text-3xl font-extrabold tracking-tight';
      break;
  }

  let colorClass = 'text-foreground';
  switch (variant) {
    case 'success':
      colorClass = 'text-emerald-600 dark:text-emerald-400';
      break;
    case 'danger':
      colorClass = 'text-destructive';
      break;
    case 'warning':
      colorClass = 'text-amber-600 dark:text-amber-400';
      break;
    case 'muted':
      colorClass = 'text-muted-foreground';
      break;
  }

  return (
    <span className={`inline-flex items-baseline gap-1 ${sizeClass} ${colorClass} ${className}`}>
      <span className="text-[0.8em] font-medium text-muted-foreground select-none">
        {prefix}
      </span>
      <span>{formatted}</span>
    </span>
  );
}
