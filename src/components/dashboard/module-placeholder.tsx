'use client';

import {
  ShoppingCart,
  Package,
  Smartphone,
  Users,
  Truck,
  CreditCard,
  Receipt,
  BarChart3,
  Settings,
  Wallet,
  Construction,
} from 'lucide-react';

const iconMap: Record<string, React.ElementType> = {
  'shopping-cart': ShoppingCart,
  'package': Package,
  'smartphone': Smartphone,
  'users': Users,
  'truck': Truck,
  'credit-card': CreditCard,
  'receipt': Receipt,
  'bar-chart': BarChart3,
  'settings': Settings,
  'wallet': Wallet,
};

interface ModulePlaceholderProps {
  title: string;
  description: string;
  icon: string;
}

export function ModulePlaceholder({ title, description, icon }: ModulePlaceholderProps) {
  const Icon = iconMap[icon] || Construction;

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/5 border border-primary/10">
        <Icon className="h-7 w-7 text-primary/60" />
      </div>
      <h1 className="mt-5 text-xl font-bold text-foreground">{title}</h1>
      <p className="mt-2 max-w-xs text-sm text-muted-foreground">{description}</p>
      <div className="mt-6 flex items-center gap-2 rounded-lg bg-muted/50 px-4 py-2">
        <Construction className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">
          Coming soon — under development
        </span>
      </div>
    </div>
  );
}
