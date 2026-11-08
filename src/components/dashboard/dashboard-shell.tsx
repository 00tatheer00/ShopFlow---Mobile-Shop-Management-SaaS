'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Smartphone,
  Users,
  Truck,
  CreditCard,
  BarChart3,
  Settings,
  Menu,
  X,
  LogOut,
  ChevronDown,
  Store,
  Wallet,
} from 'lucide-react';
import type { AuthUser } from '@/lib/types';
import { logoutAction } from '@/app/(auth)/actions';
import { NavigationProgress } from '@/components/ui/navigation-progress';
import { AppUpdateNotifier } from '@/components/ui/app-update-notifier';
import { PwaInstallButton } from '@/components/pwa/pwa-install-button';
import { CURRENT_APP_VERSION } from '@/lib/app-version';

interface DashboardShellProps {
  user: AuthUser;
  children: React.ReactNode;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  permission?: string;
  children?: { label: string; href: string }[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  {
    label: 'Sales',
    href: '/sales',
    icon: ShoppingCart,
    children: [
      { label: 'New Sale', href: '/sales/new' },
      { label: 'Sales History', href: '/sales' },
    ],
  },
  {
    label: 'Purchases',
    href: '/purchases',
    icon: Package,
    children: [
      { label: 'New Purchase', href: '/purchases/new' },
      { label: 'Purchase History', href: '/purchases' },
    ],
  },
  {
    label: 'Products',
    href: '/products',
    icon: Smartphone,
    children: [
      { label: 'All Products', href: '/products' },
      { label: 'Categories', href: '/products/categories' },
      { label: 'Brands', href: '/products/brands' },
    ],
  },
  { label: 'Customers', href: '/customers', icon: Users },
  { label: 'Suppliers', href: '/suppliers', icon: Truck },
  { label: 'Udhaar', href: '/udhaar', icon: Wallet },
  { label: 'Expenses', href: '/expenses', icon: CreditCard },
  { label: 'Reports', href: '/reports', icon: BarChart3 },
  {
    label: 'Settings',
    href: '/settings',
    icon: Settings,
    children: [
      { label: 'Shop Profile', href: '/settings' },
      { label: 'Users & Roles', href: '/settings/users' },
      { label: 'Preferences', href: '/settings/preferences' },
    ],
  },
];

export function DashboardShell({ user, children }: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  // Proactively warm frequent routes in background during browser idle time for 0ms transitions
  useEffect(() => {
    // ⚡ Warm critical POS routes IMMEDIATELY on app load for 0ms POS opening
    try {
      router.prefetch('/sales/new');
      router.prefetch('/sales');
    } catch {
      // Ignore prefetch error
    }

    const routesToWarm = [
      '/dashboard',
      '/products',
      '/purchases',
      '/purchases/new',
      '/expenses',
      '/udhaar',
      '/customers',
      '/suppliers',
      '/reports',
      '/settings',
    ];
    const timer = setTimeout(() => {
      routesToWarm.forEach((route) => {
        try {
          router.prefetch(route);
        } catch {
          // Ignore prefetch error
        }
      });
    }, 250);
    return () => clearTimeout(timer);
  }, [router]);

  useEffect(() => {
    const handler = () => setSidebarOpen((prev) => !prev);
    window.addEventListener('shopflow:toggle-sidebar', handler);
    return () => window.removeEventListener('shopflow:toggle-sidebar', handler);
  }, []);

  const toggleExpand = (label: string) => {
    setExpandedItems((prev) =>
      prev.includes(label)
        ? prev.filter((item) => item !== label)
        : [...prev, label]
    );
  };

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  const initials = user.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <NavigationProgress />
      <AppUpdateNotifier />
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden animate-in fade-in-0 duration-200"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-300 lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary">
              <Store className="h-4 w-4 text-sidebar-primary-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-sidebar-foreground leading-none">
                ShopFlow
              </span>
              {user.shop?.name && (
                <span className="text-[10px] text-sidebar-foreground/60 leading-tight mt-0.5 max-w-[150px] truncate">
                  {user.shop.name}
                </span>
              )}
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-1.5 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground lg:hidden transition-colors"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            const expanded = expandedItems.includes(item.label);
            const hasChildren = item.children && item.children.length > 0;

            if (hasChildren) {
              return (
                <div key={item.label}>
                  <button
                    onClick={() => toggleExpand(item.label)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all duration-150 cursor-pointer ${
                      active
                        ? 'bg-primary/15 text-primary font-bold border-l-4 border-primary'
                        : 'text-slate-800 dark:text-slate-200 hover:bg-sidebar-accent hover:text-primary'
                    }`}
                  >
                    <Icon className="h-4.5 w-4.5 flex-shrink-0" />
                    <span className="flex-1 text-left">{item.label}</span>
                    <ChevronDown
                      className={`h-3.5 w-3.5 transition-transform duration-200 ${
                        expanded ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {expanded && (
                    <div className="mt-0.5 ml-4 space-y-0.5 border-l-2 border-sidebar-border pl-4 animate-in slide-in-from-top-1 duration-150">
                      {item.children!.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          prefetch={true}
                          onMouseEnter={() => router.prefetch(child.href)}
                          onTouchStart={() => router.prefetch(child.href)}
                          onClick={() => setSidebarOpen(false)}
                          className={`block rounded-md px-3 py-2 text-[13px] transition-colors duration-150 ${
                            pathname === child.href
                              ? 'bg-primary/15 text-primary font-bold border-l-2 border-primary'
                              : 'text-slate-700 dark:text-slate-300 font-medium hover:text-primary hover:bg-sidebar-accent/50'
                          }`}
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                onMouseEnter={() => router.prefetch(item.href)}
                onTouchStart={() => router.prefetch(item.href)}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all duration-150 ${
                  active
                    ? 'bg-primary/15 text-primary font-bold border-l-4 border-primary'
                    : 'text-slate-800 dark:text-slate-200 hover:bg-sidebar-accent hover:text-primary'
                }`}
              >
                <Icon className="h-4.5 w-4.5 flex-shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer — Version Indicator */}
        <div className="border-t border-sidebar-border p-3">
          <div className="px-2 flex items-center justify-between text-[11px] font-medium text-sidebar-foreground/70">
            <span className="font-mono">ShopFlow v{CURRENT_APP_VERSION.version}</span>
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header — Hidden on POS (/sales/new) to allow full-screen cashier workflow */}
        {pathname !== '/sales/new' && (
          <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 lg:px-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground lg:hidden transition-colors"
                aria-label="Open sidebar"
              >
                <Menu className="h-5 w-5" />
              </button>

              {user.shop?.name && (
                <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-md border border-border/50">
                  <Store className="h-3.5 w-3.5 text-primary" />
                  <span className="truncate max-w-[180px]">{user.shop.name}</span>
                </span>
              )}
            </div>

            {/* Header Right — PWA Install, User Profile & Sign Out */}
            <div className="flex items-center gap-2.5 sm:gap-3 ml-auto">
              <PwaInstallButton />

              {/* User Profile Info */}
              <div className="flex items-center gap-2 pl-1 sm:pl-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shadow-2xs">
                  {initials}
                </div>
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-xs font-semibold text-foreground leading-tight truncate max-w-[130px]">
                    {user.full_name}
                  </span>
                  <span className="text-[10px] text-muted-foreground capitalize leading-tight">
                    {user.role.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* Sign Out Button */}
              <form action={logoutAction} className="inline-flex">
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition-colors cursor-pointer border border-transparent hover:border-rose-200 dark:hover:border-rose-900/50"
                  title="Sign out of ShopFlow"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Sign out</span>
                </button>
              </form>
            </div>
          </header>
        )}

        {/* Page Content */}
        <main
          className={`flex-1 overflow-y-auto ${
            pathname === '/sales/new'
              ? 'flex flex-col p-2 sm:p-3 lg:p-4 max-w-[1920px] w-full mx-auto'
              : ''
          }`}
        >
          <div
            className={
              pathname === '/sales/new'
                ? 'min-h-full w-full flex flex-col'
                : 'mx-auto max-w-7xl px-4 py-6 lg:px-6 lg:py-8'
            }
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
