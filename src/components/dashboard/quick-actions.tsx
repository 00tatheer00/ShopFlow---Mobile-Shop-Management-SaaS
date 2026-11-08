'use client';

import Link from 'next/link';
import { ShoppingCart, PackagePlus, Wallet, Receipt } from 'lucide-react';
import { InfoTooltip } from './info-tooltip';

interface QuickActionItem {
  title: string;
  href: string;
  icon: React.ElementType;
  primary?: boolean;
}

const actions: QuickActionItem[] = [
  {
    title: 'New Sale',
    href: '/sales/new',
    icon: ShoppingCart,
    primary: true,
  },
  {
    title: 'Add Stock',
    href: '/products/new',
    icon: PackagePlus,
  },
  {
    title: 'Receive Udhaar',
    href: '/udhaar',
    icon: Wallet,
  },
  {
    title: 'Add Expense',
    href: '/expenses',
    icon: Receipt,
  },
];

export function QuickActions() {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Quick Actions
          </h2>
          <InfoTooltip
            title="فوری ایکشنز"
            urduText="یہاں سے آپ فوری طور پر نئی سیل بنا سکتے ہیں، نیا سامان درج کر سکتے ہیں، ادھار وصول کر سکتے ہیں یا دکان کا خرچہ لکھ سکتے ہیں۔"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {actions.map((action) => {
          const Icon = action.icon;
          const isPrimary = action.primary;

          return (
            <Link
              key={action.href}
              href={action.href}
              className={`group flex items-center gap-2.5 p-2.5 sm:p-3 rounded-xl border transition-all duration-150 min-h-[46px] active:scale-[0.98] cursor-pointer ${
                isPrimary
                  ? 'bg-primary text-primary-foreground border-primary/90 hover:bg-primary/95 shadow-xs'
                  : 'bg-card text-foreground border-border hover:border-border/80 hover:bg-muted/40 shadow-xs'
              }`}
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                  isPrimary
                    ? 'bg-white/20 text-white'
                    : 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
              </div>

              <span className="text-xs sm:text-sm font-semibold truncate leading-tight">
                {action.title}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
