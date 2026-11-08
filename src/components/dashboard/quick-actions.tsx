'use client';

import Link from 'next/link';
import { ShoppingCart, PackagePlus, Wallet, Receipt } from 'lucide-react';

interface QuickActionItem {
  title: string;
  urduSub: string;
  href: string;
  icon: React.ElementType;
  primary?: boolean;
}

const actions: QuickActionItem[] = [
  {
    title: 'New Sale',
    urduSub: 'نئی سیل / بل',
    href: '/sales/new',
    icon: ShoppingCart,
    primary: true,
  },
  {
    title: 'Add Stock',
    urduSub: 'نیا مال شامل کریں',
    href: '/products/new',
    icon: PackagePlus,
  },
  {
    title: 'Receive Udhaar',
    urduSub: 'ادھار وصول کریں',
    href: '/udhaar',
    icon: Wallet,
  },
  {
    title: 'Add Expense',
    urduSub: 'دکان کا خرچہ لکھیں',
    href: '/expenses',
    icon: Receipt,
  },
];

export function QuickActions() {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Quick Actions
        </h2>
        <span className="text-xs text-muted-foreground font-medium hidden sm:inline">
          Tap an action to begin
        </span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {actions.map((action) => {
          const Icon = action.icon;
          const isPrimary = action.primary;

          return (
            <Link
              key={action.href}
              href={action.href}
              className={`group flex items-center gap-3.5 p-3.5 sm:p-4 rounded-2xl border transition-all duration-150 min-h-[64px] active:scale-[0.98] cursor-pointer ${
                isPrimary
                  ? 'bg-primary text-primary-foreground border-primary/90 hover:bg-primary/95 shadow-sm hover:shadow'
                  : 'bg-card text-foreground border-border hover:border-border/80 hover:bg-muted/40 shadow-xs hover:shadow-sm'
              }`}
            >
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors ${
                  isPrimary
                    ? 'bg-white/20 text-white'
                    : 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground'
                }`}
              >
                <Icon className="h-5 w-5" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm sm:text-base font-semibold truncate leading-tight">
                    {action.title}
                  </span>
                </div>
                <p
                  dir="rtl"
                  lang="ur"
                  className={`font-urdu text-[12px] truncate mt-0.5 ${
                    isPrimary ? 'text-primary-foreground/90' : 'text-muted-foreground'
                  }`}
                >
                  {action.urduSub}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

