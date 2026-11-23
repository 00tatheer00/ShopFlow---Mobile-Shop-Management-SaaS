'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Store,
  PlusCircle,
  ShieldCheck,
  Menu,
  X,
  LogOut,
  ShieldAlert,
  CreditCard,
  Plus,
} from 'lucide-react';
import type { AuthUser } from '@/lib/types';
import { logoutAction } from '@/app/(auth)/actions';
import { NavigationProgress } from '@/components/ui/navigation-progress';
import { AppUpdateNotifier } from '@/components/ui/app-update-notifier';
import { PwaInstallButton } from '@/components/pwa/pwa-install-button';
import { CURRENT_APP_VERSION } from '@/lib/app-version';

interface AdminShellProps {
  user: AuthUser;
  children: React.ReactNode;
}

const navItems = [
  { label: 'Overview', href: '/admin/dashboard', icon: LayoutDashboard, color: 'text-violet-300' },
  { label: 'Shops', href: '/admin/shops', icon: Store, color: 'text-sky-300' },
  { label: 'Subscriptions', href: '/admin/subscriptions', icon: CreditCard, color: 'text-emerald-300' },
  { label: 'Create Shop', href: '/admin/shops/new', icon: PlusCircle, color: 'text-amber-300' },
  { label: 'Activity Log', href: '/admin/settings', icon: ShieldCheck, color: 'text-slate-300' },
];

export function AdminShell({ user, children }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      ['/admin/dashboard', '/admin/shops', '/admin/shops/new', '/admin/subscriptions', '/admin/settings'].forEach((route) => {
        try {
          router.prefetch(route);
        } catch {
          // ignore
        }
      });
    }, 800);
    return () => clearTimeout(timer);
  }, [router]);

  const isActive = (href: string) => {
    if (href === '/admin/dashboard') return pathname === '/admin' || pathname === '/admin/dashboard';
    if (href === '/admin/shops') {
      return (pathname === '/admin/shops' || pathname.startsWith('/admin/shops/')) && !pathname.startsWith('/admin/shops/new');
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const current = navItems.find((n) => isActive(n.href));
  const initials =
    (user.full_name || 'Super Admin')
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'SA';

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background">
      <NavigationProgress />
      <AppUpdateNotifier />

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-slate-950/60 lg:hidden" onClick={() => setSidebarOpen(false)} aria-hidden="true" />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[264px] flex-col bg-sidebar text-sidebar-foreground transition-transform duration-200 lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
        aria-label="Admin menu"
      >
        <div className="flex h-16 shrink-0 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <p className="text-[15px] font-bold text-white">ShopFlow</p>
              <p className="text-xs font-medium text-white/50">Platform Admin</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="rounded-lg p-2 text-white/60 hover:bg-white/10 lg:hidden" aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3">
          <p className="px-3 pb-1.5 pt-2 text-[11px] font-bold uppercase tracking-[0.12em] text-white/40">Platform</p>
          {navItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                aria-current={active ? 'page' : undefined}
                className={`group flex min-h-12 items-center gap-3 rounded-xl px-2.5 transition ${
                  active ? 'bg-white/10 text-white' : 'text-white/75 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                    active ? 'bg-white/15' : 'bg-white/[0.06] group-hover:bg-white/10'
                  } ${item.color}`}
                >
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <span className={`flex-1 text-[15px] ${active ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
                {active && <span className="h-5 w-1 rounded-full bg-sidebar-primary" aria-hidden="true" />}
              </Link>
            );
          })}
        </nav>

        <div className="shrink-0 border-t border-white/10 p-3">
          <div className="flex items-center gap-3 rounded-xl px-2 py-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
              {initials}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{user.full_name || 'Super Admin'}</p>
              <p className="truncate text-xs text-white/50">{user.email}</p>
            </div>
            <form action={logoutAction}>
              <button type="submit" className="rounded-lg p-2 text-white/60 hover:bg-rose-500/15 hover:text-rose-300" title="Sign out" aria-label="Sign out">
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
          <p className="px-2 pt-1 text-xs text-white/40">ShopFlow v{CURRENT_APP_VERSION.version}</p>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border bg-card px-3 lg:px-6">
          <button onClick={() => setSidebarOpen(true)} className="icon-btn lg:hidden" aria-label="Open menu">
            <Menu className="h-6 w-6" />
          </button>
          <div className="min-w-0">
            <p className="truncate text-base font-bold text-foreground">{current?.label || 'Admin'}</p>
            <p className="truncate text-xs text-muted-foreground">Super Admin Portal</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <PwaInstallButton className="hidden sm:inline-flex" />
            <Link href="/admin/shops/new" className="btn btn-primary">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New Shop</span>
            </Link>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-3 py-5 sm:px-4 lg:px-8 lg:py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
