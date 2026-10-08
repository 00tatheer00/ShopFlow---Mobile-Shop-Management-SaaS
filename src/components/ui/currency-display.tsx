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

  let sizeClass = 'text-sm font-bold';
  switch (size) {
    case 'xs':
      sizeClass = 'text-[11.5px] font-bold';
      break;
    case 'sm':
      sizeClass = 'text-xs font-bold';
      break;
    case 'md':
      sizeClass = 'text-sm font-bold';
      break;
    case 'lg':
      sizeClass = 'text-lg sm:text-xl font-extrabold tracking-tight';
      break;
    case 'xl':
      sizeClass = 'text-2xl sm:text-3xl font-black tracking-tight';
      break;
  }

  let colorClass = 'text-foreground';
  switch (variant) {
    case 'success':
      colorClass = 'text-emerald-700 dark:text-emerald-300';
      break;
    case 'danger':
      colorClass = 'text-rose-700 dark:text-rose-300';
      break;
    case 'warning':
      colorClass = 'text-amber-700 dark:text-amber-300';
      break;
    case 'muted':
      colorClass = 'text-slate-700 dark:text-slate-300';
      break;
  }

  return (
    <span className={`inline-flex items-baseline gap-1 font-mono ${sizeClass} ${colorClass} ${className}`}>
      <span className="text-[0.8em] font-bold text-slate-600 dark:text-slate-400 select-none">
        {prefix}
      </span>
      <span>{formatted}</span>
    </span>
  );
}
