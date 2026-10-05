import React from 'react';

export type StatusType =
  | 'active'
  | 'suspended'
  | 'deactivated'
  | 'completed'
  | 'cancelled'
  | 'in_stock'
  | 'low_stock'
  | 'out_of_stock'
  | 'sold'
  | 'returned'
  | 'damaged'
  | 'paid'
  | 'partial'
  | 'due'
  | 'overdue'
  | 'inactive';

interface StatusBadgeProps {
  status: StatusType | string;
  label?: string;
  size?: 'sm' | 'md';
  className?: string;
}

export function StatusBadge({
  status,
  label,
  size = 'md',
  className = '',
}: StatusBadgeProps) {
  const normalized = status.toLowerCase();

  // Style configurations
  let bgClass = 'bg-muted text-muted-foreground border-border';
  let dotClass = 'bg-muted-foreground';
  let defaultLabel = status;

  switch (normalized) {
    case 'active':
    case 'completed':
    case 'in_stock':
    case 'paid':
      bgClass = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      dotClass = 'bg-emerald-500';
      defaultLabel = normalized === 'in_stock' ? 'In Stock' : normalized === 'active' ? 'Active' : normalized === 'completed' ? 'Completed' : 'Paid';
      break;

    case 'low_stock':
    case 'partial':
    case 'suspended':
    case 'pending':
      bgClass = 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      dotClass = 'bg-amber-500';
      defaultLabel = normalized === 'low_stock' ? 'Low Stock' : normalized === 'suspended' ? 'Suspended' : 'Partial';
      break;

    case 'out_of_stock':
    case 'cancelled':
    case 'deactivated':
    case 'damaged':
    case 'due':
    case 'overdue':
    case 'inactive':
      bgClass = 'bg-destructive/10 text-destructive border-destructive/20';
      dotClass = 'bg-destructive';
      defaultLabel =
        normalized === 'out_of_stock'
          ? 'Out of Stock'
          : normalized === 'cancelled'
          ? 'Cancelled'
          : normalized === 'deactivated'
          ? 'Deactivated'
          : normalized === 'due'
          ? 'Payment Due'
          : 'Inactive';
      break;

    case 'sold':
      bgClass = 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20';
      dotClass = 'bg-indigo-500';
      defaultLabel = 'Sold';
      break;

    case 'returned':
      bgClass = 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
      dotClass = 'bg-purple-500';
      defaultLabel = 'Returned';
      break;
  }

  const displayLabel = label || defaultLabel;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold tracking-tight transition-colors ${bgClass} ${
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
      } ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
      <span>{displayLabel}</span>
    </span>
  );
}
