import Link from 'next/link';
import { Store, Printer, Users } from 'lucide-react';
import { Ur } from '@/components/ui/urdu';

const TABS = [
  { href: '/settings', label: 'Shop Profile', ur: 'دکان', icon: Store },
  { href: '/settings/preferences', label: 'Bill & Printing', ur: 'بل', icon: Printer },
  { href: '/settings/users', label: 'Staff', ur: 'ملازمین', icon: Users, ownerOnly: true },
];

/** Shared tab bar for the three settings screens. */
export function SettingsTabs({ active, isOwner = true }: { active: string; isOwner?: boolean }) {
  return (
    <nav className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1" aria-label="Settings sections">
      {TABS.filter((t) => isOwner || !t.ownerOnly).map((t) => {
        const on = t.href === active;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={on ? 'page' : undefined}
            className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition ${
              on ? 'bg-primary text-primary-foreground shadow-sm' : 'border border-border bg-card text-foreground hover:bg-muted'
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
            <Ur className={`text-sm font-normal ${on ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>{t.ur}</Ur>
          </Link>
        );
      })}
    </nav>
  );
}
