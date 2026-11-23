'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingCart,
  Receipt,
  Package,
  Smartphone,
  Users,
  Truck,
  Wallet,
  CreditCard,
  BarChart3,
  Settings,
  Menu,
  X,
  LogOut,
  Store,
  Plus,
  MoreHorizontal,
  ChevronDown,
  KeyRound,
} from 'lucide-react';
import type { AuthUser, UserRole } from '@/lib/types';
import { UR } from '@/lib/i18n';
import { logoutAction } from '@/app/(auth)/actions';
import { NavigationProgress } from '@/components/ui/navigation-progress';
import { AppUpdateNotifier } from '@/components/ui/app-update-notifier';
import { PwaInstallButton } from '@/components/pwa/pwa-install-button';
import { Ur } from '@/components/ui/urdu';
import { NotificationBell } from './notification-bell';
import { CURRENT_APP_VERSION } from '@/lib/app-version';

interface DashboardShellProps {
  user: AuthUser;
  children: React.ReactNode;
}

type Area = 'all' | 'manage';

/** Signature colour per module — used for icons everywhere so screens are recognisable at a glance. */
export const MODULE_COLORS = {
  home: 'from-violet-500 to-indigo-500',
  sales: 'from-emerald-500 to-teal-500',
  udhaar: 'from-amber-400 to-orange-500',
  customers: 'from-fuchsia-500 to-pink-500',
  products: 'from-sky-500 to-blue-500',
  purchases: 'from-cyan-500 to-sky-600',
  suppliers: 'from-teal-500 to-cyan-600',
  expenses: 'from-rose-500 to-red-500',
  reports: 'from-violet-500 to-purple-600',
  settings: 'from-slate-400 to-slate-600',
} as const;

interface NavItem {
  label: string;
  ur: string;
  href: string;
  icon: React.ElementType;
  area: Area;
  color: string;
  children?: { label: string; href: string; area?: Area }[];
}

const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Daily work',
    items: [
      { label: 'Home', ur: UR.home, href: '/dashboard', icon: LayoutDashboard, area: 'all', color: MODULE_COLORS.home },
      { label: 'Sales record', ur: UR.sales, href: '/sales', icon: Receipt, area: 'all', color: MODULE_COLORS.sales },
      { label: 'Udhaar (Khata)', ur: UR.udhaar, href: '/udhaar', icon: Wallet, area: 'all', color: MODULE_COLORS.udhaar },
      { label: 'Customers', ur: UR.customers, href: '/customers', icon: Users, area: 'all', color: MODULE_COLORS.customers },
    ],
  },
  {
    title: 'Stock',
    items: [
      {
        label: 'Products',
        ur: UR.products,
        href: '/products',
        icon: Smartphone,
        area: 'all',
        color: MODULE_COLORS.products,
        children: [
          { label: 'All products', href: '/products' },
          { label: 'Add product', href: '/products/new', area: 'manage' },
          { label: 'Categories', href: '/products/categories', area: 'manage' },
          { label: 'Brands', href: '/products/brands', area: 'manage' },
        ],
      },
      {
        label: 'Purchases',
        ur: UR.purchases,
        href: '/purchases',
        icon: Package,
        area: 'manage',
        color: MODULE_COLORS.purchases,
        children: [
          { label: 'New purchase', href: '/purchases/new' },
          { label: 'Purchase history', href: '/purchases' },
        ],
      },
      { label: 'Suppliers', ur: UR.suppliers, href: '/suppliers', icon: Truck, area: 'manage', color: MODULE_COLORS.suppliers },
    ],
  },
  {
    title: 'Accounts',
    items: [
      { label: 'Expenses', ur: UR.expenses, href: '/expenses', icon: CreditCard, area: 'manage', color: MODULE_COLORS.expenses },
      { label: 'Reports', ur: UR.reports, href: '/reports', icon: BarChart3, area: 'manage', color: MODULE_COLORS.reports },
      {
        label: 'Settings',
        ur: UR.settings,
        href: '/settings',
        icon: Settings,
        area: 'manage',
        color: MODULE_COLORS.settings,
        children: [
          { label: 'Shop profile', href: '/settings' },
          { label: 'Bill & printing', href: '/settings/preferences' },
          { label: 'Staff & passwords', href: '/settings/users' },
        ],
      },
    ],
  },
];

const ROLE_LABEL: Record<UserRole, { en: string; ur: string }> = {
  super_admin: { en: 'Super Admin', ur: 'ایڈمن' },
  shop_owner: { en: 'Shop Owner', ur: 'دکان کا مالک' },
  manager: { en: 'Manager', ur: 'منیجر' },
  cashier: { en: 'Cashier', ur: 'کیشیئر' },
};

function canSee(role: UserRole, area: Area | undefined) {
  if (!area || area === 'all') return true;
  return role === 'shop_owner' || role === 'manager';
}

function pageFor(pathname: string): NavItem | null {
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      if (item.href === '/dashboard' ? pathname === '/dashboard' : pathname === item.href || pathname.startsWith(`${item.href}/`)) {
        return item;
      }
    }
  }
  return null;
}

export function DashboardShell({ user, children }: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isPos = pathname === '/sales/new';
  const canManage = user.role === 'shop_owner' || user.role === 'manager';
  const role = ROLE_LABEL[user.role];
  const page = pageFor(pathname);

  // Warm the most used screens so taps feel instant on slow mobile internet
  useEffect(() => {
    const routes = ['/sales/new', '/udhaar', '/sales', '/products', '/customers'];
    if (canManage) routes.push('/purchases/new', '/expenses', '/reports');
    const timer = setTimeout(() => {
      routes.forEach((r) => {
        try {
          router.prefetch(r);
        } catch {
          // ignore
        }
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [router, canManage]);

  // POS has its own menu button that opens the sidebar
  useEffect(() => {
    const handler = () => setSidebarOpen((prev) => !prev);
    window.addEventListener('shopflow:toggle-sidebar', handler);
    return () => window.removeEventListener('shopflow:toggle-sidebar', handler);
  }, []);

  // Close profile menu on outside click / Escape
  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const isActive = (href: string) =>
    href === '/dashboard'
      ? pathname === '/dashboard'
      : href === '/sales'
        ? pathname === '/sales'
        : pathname === href || pathname.startsWith(`${href}/`);

  const initials =
    user.full_name
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'SF';

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background">
      <NavigationProgress />
      <AppUpdateNotifier />

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-[2px] lg:hidden animate-in fade-in-0 duration-150"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ================= Sidebar (dark ink) ================= */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col bg-sidebar text-sidebar-foreground transition-transform duration-200 lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
        aria-label="Main menu"
      >
        {/* Brand */}
        <div className="flex h-16 shrink-0 items-center justify-between gap-2 px-4">
          <Link href="/dashboard" className="flex min-w-0 items-center gap-3" onClick={() => setSidebarOpen(false)}>
            <div className="bg-brand flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-lg shadow-violet-900/40">
              <Store className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[15px] font-bold leading-tight text-white">{user.shop?.name || 'ShopFlow'}</p>
              <p className="text-xs font-medium leading-tight text-white/50">ShopFlow POS</p>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-2 text-white/60 hover:bg-white/10 lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Primary action */}
        <div className="shrink-0 px-3 pb-2 pt-1">
          <Link
            href="/sales/new"
            onClick={() => setSidebarOpen(false)}
            className="group flex h-14 items-center gap-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 text-white shadow-lg shadow-emerald-950/40 transition hover:brightness-110 active:scale-[0.98]"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">
              <ShoppingCart className="h-5 w-5" />
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-base font-bold">New Sale</span>
              <Ur className="text-sm text-white/90">{UR.newSale}</Ur>
            </span>
            <Plus className="ml-auto h-5 w-5 opacity-70 transition group-hover:rotate-90" />
          </Link>
        </div>

        {/* Navigation */}
        <nav className="no-scrollbar flex-1 overflow-y-auto px-3 py-2">
          {NAV_GROUPS.map((group) => {
            const items = group.items.filter((item) => canSee(user.role, item.area));
            if (items.length === 0) return null;
            return (
              <div key={group.title} className="mb-2">
                <p className="px-3 pb-1.5 pt-3 text-[11px] font-bold uppercase tracking-[0.12em] text-white/40">
                  {group.title}
                </p>
                <ul className="space-y-1">
                  {items.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    const children = item.children?.filter((c) => canSee(user.role, c.area)) || [];
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => setSidebarOpen(false)}
                          aria-current={active ? 'page' : undefined}
                          className={`group flex min-h-12 items-center gap-3 rounded-xl px-2.5 py-1.5 transition ${
                            active ? 'bg-white/10 text-white' : 'text-white/75 hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          <span
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${item.color} text-white shadow-md transition ${
                              active ? 'scale-105' : 'opacity-85 group-hover:opacity-100'
                            }`}
                          >
                            <Icon className="h-[18px] w-[18px]" />
                          </span>
                          <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                            <span className={`truncate text-[15px] ${active ? 'font-bold' : 'font-medium'}`}>
                              {item.label}
                            </span>
                            <Ur className="shrink-0 text-[13px] text-white/45">{item.ur}</Ur>
                          </span>
                          {active && <span className="h-6 w-1 rounded-full bg-white" aria-hidden="true" />}
                        </Link>
                        {active && children.length > 1 && (
                          <ul className="ml-[30px] mt-1 space-y-0.5 border-l border-white/15 pl-3">
                            {children.map((child) => (
                              <li key={child.href}>
                                <Link
                                  href={child.href}
                                  onClick={() => setSidebarOpen(false)}
                                  className={`block rounded-lg px-3 py-2 text-sm transition ${
                                    pathname === child.href
                                      ? 'bg-white/10 font-bold text-white'
                                      : 'font-medium text-white/60 hover:bg-white/5 hover:text-white'
                                  }`}
                                >
                                  {child.label}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>

        <div className="shrink-0 border-t border-white/10 px-4 py-3 text-xs text-white/40">
          ShopFlow v{CURRENT_APP_VERSION.version} · <Ur>پاکستان کا دکان سسٹم</Ur>
        </div>
      </aside>

      {/* ================= Main ================= */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {!isPos && (
          <header className="relative z-20 flex h-16 shrink-0 items-center gap-2 border-b border-border bg-card/90 px-3 backdrop-blur lg:px-6">
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex h-11 w-11 items-center justify-center rounded-xl text-foreground hover:bg-muted lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-6 w-6" />
            </button>

            {page && (
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className={`hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${page.color} text-white shadow-sm sm:flex`}
                >
                  <page.icon className="h-[18px] w-[18px]" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-base font-bold leading-tight text-foreground">{page.label}</p>
                  <Ur className="block truncate text-sm leading-tight text-muted-foreground">{page.ur}</Ur>
                </div>
              </div>
            )}

            <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
              <PwaInstallButton className="hidden sm:inline-flex" />
              <Link
                href="/sales/new"
                className="hidden h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 text-sm font-bold text-white shadow-md shadow-emerald-600/25 transition hover:brightness-110 lg:inline-flex"
              >
                <Plus className="h-4 w-4" />
                New Sale
                <Ur className="text-sm font-normal">{UR.newSale}</Ur>
              </Link>
              <NotificationBell />

              {/* Profile menu */}
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex h-11 items-center gap-2 rounded-xl pl-1 pr-2 hover:bg-muted"
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                >
                  <span className="bg-brand flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white">
                    {initials}
                  </span>
                  <span className="hidden text-left leading-tight md:block">
                    <span className="block max-w-[140px] truncate text-sm font-bold text-foreground">{user.full_name}</span>
                    <span className="block text-xs text-muted-foreground">{role.en}</span>
                  </span>
                  <ChevronDown className="hidden h-4 w-4 text-muted-foreground md:block" />
                </button>

                {menuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 top-[calc(100%+8px)] w-64 overflow-hidden rounded-2xl border border-border bg-popover shadow-2xl animate-in fade-in-0 zoom-in-95 duration-150"
                  >
                    <div className="bg-brand px-4 py-3 text-white">
                      <p className="truncate font-bold">{user.full_name}</p>
                      <p className="truncate text-sm text-white/80">{user.email}</p>
                      <p className="mt-1 text-xs text-white/80">
                        {role.en} · <Ur>{role.ur}</Ur>
                      </p>
                    </div>
                    <div className="p-1.5">
                      {user.role === 'shop_owner' && (
                        <Link
                          href="/settings/users"
                          role="menuitem"
                          onClick={() => setMenuOpen(false)}
                          className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-foreground hover:bg-muted"
                        >
                          <KeyRound className="h-4 w-4 text-muted-foreground" /> Staff & passwords
                        </Link>
                      )}
                      <form action={logoutAction}>
                        <button
                          type="submit"
                          role="menuitem"
                          className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold text-destructive hover:bg-destructive/10"
                        >
                          <LogOut className="h-4 w-4" /> Sign out
                          <Ur className="ml-auto text-sm">{UR.logout}</Ur>
                        </button>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>
        )}

        <main className={isPos ? 'flex min-h-0 flex-1 flex-col overflow-hidden' : 'flex-1 overflow-y-auto pb-24 lg:pb-0'}>
          <div className={isPos ? 'flex h-full min-h-0 w-full flex-col' : 'mx-auto max-w-7xl px-3 py-5 sm:px-4 lg:px-6 lg:py-7'}>
            {children}
          </div>
        </main>

        {/* ================= Phone bottom bar ================= */}
        {!isPos && (
          <nav
            className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 shadow-[0_-8px_24px_-12px_rgb(0_0_0/0.15)] backdrop-blur lg:hidden"
            aria-label="Quick menu"
          >
            <div className="mx-auto grid h-[68px] max-w-md grid-cols-5 items-end">
              <BottomLink href="/dashboard" label="Home" ur={UR.home} icon={LayoutDashboard} active={isActive('/dashboard')} color="text-violet-600" />
              <BottomLink href="/udhaar" label="Udhaar" ur="ادھار" icon={Wallet} active={isActive('/udhaar')} color="text-amber-600" />
              <div className="flex justify-center">
                <Link
                  href="/sales/new"
                  className="-mt-7 flex h-[70px] w-[70px] flex-col items-center justify-center rounded-full border-4 border-background bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-xl shadow-emerald-600/30 active:scale-95"
                  aria-label="New Sale"
                >
                  <ShoppingCart className="h-6 w-6" />
                  <span className="mt-0.5 text-xs font-bold leading-none">Sale</span>
                </Link>
              </div>
              <BottomLink href="/products" label="Stock" ur="مال" icon={Smartphone} active={isActive('/products')} color="text-sky-600" />
              <button
                onClick={() => setSidebarOpen(true)}
                className="flex h-full flex-col items-center justify-center gap-0.5 text-muted-foreground"
              >
                <MoreHorizontal className="h-6 w-6" />
                <span className="text-xs font-semibold leading-none">More</span>
                <Ur className="text-[11px] leading-none">{UR.more}</Ur>
              </button>
            </div>
          </nav>
        )}
      </div>
    </div>
  );
}

function BottomLink({
  href,
  label,
  ur,
  icon: Icon,
  active,
  color,
}: {
  href: string;
  label: string;
  ur: string;
  icon: React.ElementType;
  active: boolean;
  color: string;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`flex h-full flex-col items-center justify-center gap-0.5 ${active ? color : 'text-muted-foreground'}`}
    >
      <Icon className="h-6 w-6" strokeWidth={active ? 2.5 : 2} />
      <span className={`text-xs leading-none ${active ? 'font-bold' : 'font-semibold'}`}>{label}</span>
      <Ur className="text-[11px] leading-none">{ur}</Ur>
    </Link>
  );
}
