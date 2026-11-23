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
  X,
  LogOut,
  Store,
  Plus,
  LayoutGrid,
  ArrowLeft,
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
  home: 'text-violet-300',
  sales: 'text-emerald-300',
  udhaar: 'text-amber-300',
  customers: 'text-pink-300',
  products: 'text-sky-300',
  purchases: 'text-cyan-300',
  suppliers: 'text-teal-300',
  expenses: 'text-rose-300',
  reports: 'text-violet-300',
  settings: 'text-slate-300',
} as const;

/** Light-background chip for the same module (page header on white). */
const HEADER_CHIP: Record<string, string> = {
  '/dashboard': 'bg-violet-100 text-violet-700 dark:bg-violet-950/70 dark:text-violet-300',
  '/sales': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300',
  '/udhaar': 'bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300',
  '/customers': 'bg-pink-100 text-pink-700 dark:bg-pink-950/70 dark:text-pink-300',
  '/products': 'bg-sky-100 text-sky-700 dark:bg-sky-950/70 dark:text-sky-300',
  '/purchases': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/70 dark:text-cyan-300',
  '/suppliers': 'bg-teal-100 text-teal-700 dark:bg-teal-950/70 dark:text-teal-300',
  '/expenses': 'bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300',
  '/reports': 'bg-violet-100 text-violet-700 dark:bg-violet-950/70 dark:text-violet-300',
  '/settings': 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

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
  const [moreOpen, setMoreOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isPos = pathname === '/sales/new';
  const canManage = user.role === 'shop_owner' || user.role === 'manager';
  const role = ROLE_LABEL[user.role];
  const page = pageFor(pathname);
  // Inner screens (e.g. /products/new) show a back arrow in the phone app bar
  const backHref = page && pathname !== page.href && pathname !== '/dashboard' ? page.href : null;

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

  // POS menu button (phone) opens the "More" sheet
  useEffect(() => {
    const handler = () => setMoreOpen((prev) => !prev);
    window.addEventListener('shopflow:toggle-sidebar', handler);
    return () => window.removeEventListener('shopflow:toggle-sidebar', handler);
  }, []);

  // Close profile menu / sheet on outside click / Escape
  useEffect(() => {
    if (!menuOpen && !moreOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuOpen && menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        setMoreOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen, moreOpen]);

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

  const allItems = NAV_GROUPS.flatMap((g) => g.items).filter((i) => canSee(user.role, i.area));

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background">
      <NavigationProgress />
      <AppUpdateNotifier />

      {/* ================= Sidebar (laptop / desktop) ================= */}
      <aside className="hidden w-[272px] shrink-0 flex-col bg-sidebar text-sidebar-foreground lg:flex" aria-label="Main menu">
        <div className="flex h-16 shrink-0 items-center gap-3 px-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white">
            <Store className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-bold leading-tight text-white">{user.shop?.name || 'ShopFlow'}</p>
            <p className="text-xs font-medium leading-tight text-white/50">ShopFlow POS</p>
          </div>
        </div>

        <div className="shrink-0 px-3 pb-2 pt-1">
          <Link
            href="/sales/new"
            className="group flex h-14 items-center gap-3 rounded-xl bg-emerald-600 px-4 text-white transition hover:bg-emerald-500 active:scale-[0.98]"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15">
              <ShoppingCart className="h-5 w-5" />
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-base font-bold">New Sale</span>
              <Ur className="text-sm text-white/90">{UR.newSale}</Ur>
            </span>
            <Plus className="ml-auto h-5 w-5 opacity-70 transition group-hover:rotate-90" />
          </Link>
        </div>

        <nav className="no-scrollbar flex-1 overflow-y-auto px-3 py-2">
          {NAV_GROUPS.map((group) => {
            const items = group.items.filter((item) => canSee(user.role, item.area));
            if (items.length === 0) return null;
            return (
              <div key={group.title} className="mb-2">
                <p className="px-3 pb-1.5 pt-3 text-[11px] font-bold uppercase tracking-[0.12em] text-white/40">{group.title}</p>
                <ul className="space-y-1">
                  {items.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    const children = item.children?.filter((c) => canSee(user.role, c.area)) || [];
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          aria-current={active ? 'page' : undefined}
                          className={`group flex min-h-12 items-center gap-3 rounded-xl px-2.5 py-1.5 transition ${
                            active ? 'bg-white/10 text-white' : 'text-white/75 hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          <span
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition ${
                              active ? 'bg-white/15' : 'bg-white/[0.06] group-hover:bg-white/10'
                            } ${item.color}`}
                          >
                            <Icon className="h-[18px] w-[18px]" />
                          </span>
                          <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                            <span className={`truncate text-[15px] ${active ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
                            <Ur className="shrink-0 text-[13px] text-white/45">{item.ur}</Ur>
                          </span>
                          {active && <span className="h-5 w-1 rounded-full bg-sidebar-primary" aria-hidden="true" />}
                        </Link>
                        {active && children.length > 1 && (
                          <ul className="ml-[30px] mt-1 space-y-0.5 border-l border-white/15 pl-3">
                            {children.map((child) => (
                              <li key={child.href}>
                                <Link
                                  href={child.href}
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
          <header className="pt-safe relative z-20 shrink-0 border-b border-border bg-card/95 backdrop-blur">
            <div className="flex h-14 items-center gap-1.5 px-2 lg:h-16 lg:gap-2 lg:px-6">
              {/* Phone: back arrow on inner screens, shop logo otherwise */}
              {backHref ? (
                <Link href={backHref} className="icon-btn h-11 w-11 lg:hidden" aria-label="Back">
                  <ArrowLeft className="h-6 w-6" />
                </Link>
              ) : (
                <Link href="/dashboard" className="flex h-11 w-11 items-center justify-center lg:hidden" aria-label="Home">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white">
                    <Store className="h-[18px] w-[18px]" />
                  </span>
                </Link>
              )}

              {page && (
                <div className="flex min-w-0 items-center gap-3">
                  <span className={`hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl lg:flex ${HEADER_CHIP[page.href] || HEADER_CHIP['/dashboard']}`}>
                    <page.icon className="h-[18px] w-[18px]" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[17px] font-bold leading-tight text-foreground lg:text-base">{page.label}</p>
                    <Ur className="block truncate text-sm leading-tight text-muted-foreground">{page.ur}</Ur>
                  </div>
                </div>
              )}

              <div className="ml-auto flex items-center gap-1 lg:gap-2">
                <PwaInstallButton className="hidden lg:inline-flex" />
                <Link href="/sales/new" className="btn btn-success hidden lg:inline-flex">
                  <Plus className="h-4 w-4" />
                  New Sale
                  <Ur className="text-sm font-normal">{UR.newSale}</Ur>
                </Link>
                <NotificationBell />

                {/* Profile menu */}
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setMenuOpen((v) => !v)}
                    className="flex h-11 items-center gap-2 rounded-xl pl-1 pr-1 hover:bg-muted lg:pr-2"
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                    aria-label="Account"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                      {initials}
                    </span>
                    <span className="hidden text-left leading-tight lg:block">
                      <span className="block max-w-[140px] truncate text-sm font-bold text-foreground">{user.full_name}</span>
                      <span className="block text-xs text-muted-foreground">{role.en}</span>
                    </span>
                    <ChevronDown className="hidden h-4 w-4 text-muted-foreground lg:block" />
                  </button>

                  {menuOpen && (
                    <div
                      role="menu"
                      className="absolute right-0 top-[calc(100%+8px)] w-64 overflow-hidden rounded-2xl border border-border bg-popover shadow-2xl animate-in fade-in-0 zoom-in-95 duration-150"
                    >
                      <div className="border-b border-border px-4 py-3">
                        <p className="truncate font-bold text-foreground">{user.full_name}</p>
                        <p className="truncate text-sm text-muted-foreground">{user.email}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
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
            </div>
          </header>
        )}

        <main className={isPos ? 'flex min-h-0 flex-1 flex-col overflow-hidden' : 'flex flex-1 flex-col overflow-y-auto overscroll-contain pb-32 lg:pb-0'}>
          <div className={isPos ? 'flex h-full min-h-0 w-full flex-col' : 'mx-auto flex w-full max-w-7xl flex-1 flex-col px-3 py-4 sm:px-4 lg:px-6 lg:py-7'}>
            {children}
          </div>
        </main>

        {/* ================= Phone tab bar ================= */}
        {!isPos && (
          <nav
            className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur-md lg:hidden"
            aria-label="Main tabs"
          >
            <div className="mx-auto grid h-[70px] max-w-lg grid-cols-5 items-center px-1 pb-1">
              <TabLink href="/dashboard" label="Home" ur={UR.home} icon={LayoutDashboard} active={isActive('/dashboard')} />
              <TabLink href="/udhaar" label="Udhaar" ur="ادھار" icon={Wallet} active={isActive('/udhaar')} />
              <div className="flex justify-center">
                <Link
                  href="/sales/new"
                  className="-mt-6 flex h-16 w-16 flex-col items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg ring-4 ring-background transition active:scale-95"
                  aria-label="New Sale"
                >
                  <ShoppingCart className="h-6 w-6" />
                  <span className="mt-0.5 text-[11px] font-bold leading-none">Sale</span>
                </Link>
              </div>
              <TabLink href="/products" label="Stock" ur="مال" icon={Smartphone} active={isActive('/products')} />
              <button
                type="button"
                onClick={() => setMoreOpen(true)}
                className="flex h-full flex-col items-center justify-center gap-0.5"
                aria-haspopup="dialog"
                aria-expanded={moreOpen}
              >
                <span className={`flex h-8 w-14 items-center justify-center rounded-full transition ${moreOpen ? 'bg-primary/12 text-primary' : 'text-muted-foreground'}`}>
                  <LayoutGrid className="h-[22px] w-[22px]" />
                </span>
                <span className={`text-[11px] leading-none ${moreOpen ? 'font-bold text-primary' : 'font-semibold text-muted-foreground'}`}>More</span>
              </button>
            </div>
          </nav>
        )}
      </div>

      {/* ================= "More" sheet (phone) ================= */}
      {moreOpen && (
        <div className="sheet-backdrop lg:hidden" role="dialog" aria-modal="true" aria-label="All sections" onClick={(e) => e.target === e.currentTarget && setMoreOpen(false)}>
          <div className="sheet px-4 pt-2">
            <div className="mb-4 flex items-center gap-3 rounded-2xl bg-muted/60 p-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-base font-bold text-primary-foreground">{initials}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-foreground">{user.full_name}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {user.shop?.name} · {role.en}
                </p>
              </div>
              <button onClick={() => setMoreOpen(false)} className="icon-btn" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {allItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className={`flex min-h-[96px] flex-col items-center justify-center gap-1.5 rounded-2xl border p-2 text-center transition active:scale-95 ${
                      active ? 'border-primary bg-primary/5' : 'border-border bg-card'
                    }`}
                  >
                    <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${HEADER_CHIP[item.href] || HEADER_CHIP['/dashboard']}`}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="text-[13px] font-semibold leading-tight text-foreground">{item.label}</span>
                    <Ur className="text-xs leading-none text-muted-foreground">{item.ur}</Ur>
                  </Link>
                );
              })}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 pb-4">
              <PwaInstallButton className="w-full" />
              <form action={logoutAction} className="contents">
                <button type="submit" className="btn btn-outline w-full text-destructive">
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </form>
            </div>
            <p className="pb-3 text-center text-xs text-muted-foreground">ShopFlow v{CURRENT_APP_VERSION.version}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function TabLink({
  href,
  label,
  ur,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  ur: string;
  icon: React.ElementType;
  active: boolean;
}) {
  return (
    <Link href={href} aria-current={active ? 'page' : undefined} className="flex h-full flex-col items-center justify-center gap-0.5">
      <span className={`flex h-8 w-14 items-center justify-center rounded-full transition ${active ? 'bg-primary/12 text-primary' : 'text-muted-foreground'}`}>
        <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.4 : 2} />
      </span>
      <span className={`text-[11px] leading-none ${active ? 'font-bold text-primary' : 'font-semibold text-muted-foreground'}`}>{label}</span>
      <Ur className={`text-[10px] leading-none ${active ? 'text-primary/80' : 'text-muted-foreground'}`}>{ur}</Ur>
    </Link>
  );
}
