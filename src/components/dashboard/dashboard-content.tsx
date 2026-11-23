'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ShoppingCart,
  Wallet,
  PackagePlus,
  Receipt,
  Banknote,
  Smartphone,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ChevronRight,
  X,
  Users,
  Package,
  CheckCircle2,
  Copy,
  Check,
  Sparkles,
} from 'lucide-react';
import type { DashboardMetrics, UserRole, ShopSubscription } from '@/lib/types';
import { formatPKR } from '@/lib/types';
import { UR } from '@/lib/i18n';
import { SHOPFLOW_PAYMENT_CHANNELS } from '@/lib/payment-channels';
import { Ur } from '@/components/ui/urdu';
import { IconChip, type Tone } from '@/components/ui/kit';
import { SubscriptionBanner } from './subscription-banner';
import { FinancialOverviewChart } from './financial-overview-chart';
import { toast } from 'sonner';

interface DashboardContentProps {
  metrics: DashboardMetrics;
  userName: string;
  role: UserRole;
  subscription?: ShopSubscription | null;
  /** Current hour in Pakistan, computed on the server (no hydration mismatch) */
  pktHour: number;
}

export function DashboardContent({ metrics, userName, role, subscription, pktHour }: DashboardContentProps) {
  const [showPay, setShowPay] = useState(false);
  const firstName = userName.split(' ')[0] || userName;
  const canManage = role === 'shop_owner' || role === 'manager';
  const isOwner = role === 'shop_owner';
  const greeting = pktHour < 12 ? 'Good morning' : pktHour < 17 ? 'Good afternoon' : 'Good evening';
  const net = metrics.today_net_profit ?? 0;

  return (
    <div className="space-y-6">
      {/* ================= Greeting + today's key numbers ================= */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              <Ur className="text-base">السلام علیکم</Ur> · {greeting}
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{firstName}</h1>
          </div>
          {isOwner && subscription?.status === 'paid' && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5 text-sm font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4" /> {subscription.month_name} paid
            </span>
          )}
        </div>

        <div className="panel grid grid-cols-2 overflow-hidden sm:grid-cols-4">
          <HeroStat en="Today's sale" ur={UR.todaySale} value={formatPKR(metrics.today_sales)} sub={`${metrics.today_sales_count ?? 0} bills`} accent="bg-emerald-500" border="border-b border-r sm:border-b-0" />
          <HeroStat en="Cash in galla" ur={UR.cashInGalla} value={formatPKR(metrics.today_cash)} sub="after cash expenses" accent="bg-teal-500" border="border-b sm:border-b-0 sm:border-r" />
          {canManage ? (
            <HeroStat
              en="Real profit"
              ur={UR.netProfit}
              value={formatPKR(net)}
              sub={net < 0 ? 'Loss today' : 'after cost & expenses'}
              accent={net < 0 ? 'bg-rose-500' : 'bg-violet-500'}
              tone={net < 0 ? 'bad' : undefined}
              border="border-r"
            />
          ) : (
            <HeroStat en="Online" ur={UR.online} value={formatPKR(metrics.today_online_received ?? 0)} sub="EasyPaisa · JazzCash" accent="bg-sky-500" border="border-r" />
          )}
          <HeroStat en="Total udhaar" ur={UR.totalUdhaar} value={formatPKR(metrics.total_udhaar)} sub="customers owe you" accent="bg-amber-500" border="" />
        </div>
      </section>

      {isOwner && <SubscriptionBanner subscription={subscription} onPayNow={() => setShowPay(true)} />}

      {/* ================= Quick actions ================= */}
      <section aria-label="Quick actions" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <ActionTile href="/sales/new" icon={ShoppingCart} en="New Sale" ur={UR.newSale} tone="emerald" hint="Bill banayein" />
        <ActionTile href="/udhaar" icon={Wallet} en="Receive Udhaar" ur={UR.receivePayment} tone="amber" hint="Paisay wasool" />
        {canManage ? (
          <>
            <ActionTile href="/purchases/new" icon={PackagePlus} en="Stock In" ur={UR.stockIn} tone="sky" hint="Naya maal darj" />
            <ActionTile href="/expenses" icon={Receipt} en="Add Expense" ur={UR.addExpense} tone="rose" hint="Kharcha likhein" />
          </>
        ) : (
          <>
            <ActionTile href="/customers" icon={Users} en="Customers" ur={UR.customers} tone="pink" hint="Gahak ki list" />
            <ActionTile href="/products" icon={Package} en="Check Stock" ur={UR.products} tone="sky" hint="Maal dekhein" />
          </>
        )}
      </section>

      {/* ================= Money today ================= */}
      <section aria-labelledby="money-h" className="space-y-3">
        <SectionTitle id="money-h" en="Money today" ur="آج کی رقم" />
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <StatCard
            icon={Banknote}
            tone="emerald"
            en="Cash received"
            ur="نقد وصول"
            value={metrics.today_cash_received ?? 0}
            note={(metrics.today_cash_expenses ?? 0) > 0 ? `− ${formatPKR(metrics.today_cash_expenses ?? 0)} cash kharcha` : 'Cash sales + cash udhaar'}
          />
          <StatCard
            icon={Smartphone}
            tone="sky"
            en="Online received"
            ur={UR.online}
            value={metrics.today_online_received ?? 0}
            note="EasyPaisa · JazzCash · Bank"
          />
          <StatCard
            icon={TrendingDown}
            tone="amber"
            en="Udhaar given today"
            ur="آج کا نیا ادھار"
            value={metrics.today_udhaar_given ?? 0}
            note="Bills not paid in full"
          />
          <StatCard
            icon={Wallet}
            tone="pink"
            en="Udhaar recovered"
            ur="آج کی وصولی"
            value={metrics.today_udhaar_recovered ?? 0}
            note="Old udhaar paid today"
            href="/udhaar"
          />
        </div>
      </section>

      {/* ================= Profit (owner / manager) ================= */}
      {canManage && (
        <section aria-labelledby="profit-h" className="grid grid-cols-1 gap-4 xl:grid-cols-5">
          <div className="panel p-5 xl:col-span-3">
            <SectionTitle id="profit-h" en="Today's profit" ur="آج کا منافع" />
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_1fr_auto_1fr]  sm:items-center">
              <EquationPart en="Sale" ur="سیل" value={metrics.today_sales} color="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300" />
              <Op>−</Op>
              <EquationPart en="Item cost" ur={UR.cost} value={metrics.today_cogs ?? 0} color="bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300" />
              <Op>−</Op>
              <EquationPart en="Expenses" ur={UR.expense} value={metrics.today_expenses ?? 0} color="bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300" />
            </div>
            <div
              className={`mt-3 flex items-center justify-between rounded-2xl border p-4 ${
                net < 0
                  ? 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200'
              }`}
            >
              <span className="flex items-center gap-2">
                {net < 0 ? <TrendingDown className="h-6 w-6" /> : <TrendingUp className="h-6 w-6" />}
                <span className="flex flex-col leading-tight">
                  <span className="font-bold">{net < 0 ? 'Loss today' : 'Real profit'}</span>
                  <Ur className="text-sm opacity-80">{net < 0 ? 'آج نقصان' : UR.netProfit}</Ur>
                </span>
              </span>
              <span className="font-mono text-3xl font-extrabold tabular-nums">{formatPKR(net)}</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">Item cost uses each product&apos;s latest purchase price.</p>
          </div>
          <div className="xl:col-span-2">
            <FinancialOverviewChart
              sales={metrics.today_sales}
              cogs={metrics.today_cogs ?? 0}
              expenses={metrics.today_expenses ?? 0}
              netProfit={net}
              cash={metrics.today_cash}
            />
          </div>
        </section>
      )}

      {/* ================= Low stock ================= */}
      {metrics.low_stock_count > 0 && (
        <Link
          href="/products"
          className="group flex items-center gap-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 transition hover:border-rose-300 dark:border-rose-900 dark:bg-rose-950/30"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-900/60 dark:text-rose-300">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-bold text-foreground">
              {metrics.low_stock_count} item{metrics.low_stock_count > 1 ? 's' : ''} running out
            </span>
            <Ur className="text-sm text-foreground/75">{UR.lowStock} — نیا مال منگوائیں</Ur>
          </span>
          <ChevronRight className="h-5 w-5 text-muted-foreground transition group-hover:translate-x-1" />
        </Link>
      )}

      {/* ================= Recent sales ================= */}
      <section className="panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <SectionTitle en="Recent sales" ur={UR.recentSales} />
          <Link href="/sales" className="inline-flex min-h-11 items-center gap-1 text-sm font-bold text-primary">
            See all <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {metrics.recent_transactions.length === 0 ? (
          <div className="flex flex-col items-center px-4 py-12 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300">
              <Sparkles className="h-7 w-7" />
            </span>
            <p className="mt-4 text-lg font-bold text-foreground">No sales yet today</p>
            <Ur className="text-muted-foreground">آج کی پہلی سیل کریں</Ur>
            <Link
              href="/sales/new"
              className="btn btn-success mt-5"
            >
              <ShoppingCart className="h-5 w-5" /> Make first sale
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {metrics.recent_transactions.map((txn) => {
              const cancelled = txn.description.includes('(CANCELLED)');
              return (
                <li key={txn.id} className="flex items-center justify-between gap-3 px-5 py-3 transition hover:bg-muted/50">
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                        cancelled
                          ? 'bg-muted text-muted-foreground'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                      }`}
                    >
                      <Receipt className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-semibold text-foreground">{txn.description.replace(' (CANCELLED)', '')}</p>
                      <p className="text-sm text-muted-foreground" suppressHydrationWarning>
                        {formatRelativeTime(txn.created_at)}
                        {cancelled && (
                          <span className="ml-2 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                            Cancelled
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <span className={`shrink-0 font-mono text-base font-bold tabular-nums ${cancelled ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                    {formatPKR(txn.amount)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {showPay && <PayDialog subscription={subscription} onClose={() => setShowPay(false)} />}
    </div>
  );
}

// ---------------- pieces ----------------

function SectionTitle({ id, en, ur }: { id?: string; en: string; ur: string }) {
  return (
    <h2 id={id} className="flex items-baseline gap-2 text-lg font-extrabold text-foreground">
      {en} <Ur className="text-base font-normal text-muted-foreground">{ur}</Ur>
    </h2>
  );
}

function HeroStat({
  en,
  ur,
  value,
  sub,
  accent,
  tone,
  border,
}: {
  en: string;
  ur: string;
  value: string;
  sub: string;
  accent: string;
  tone?: 'bad';
  border: string;
}) {
  return (
    <div className={`relative border-border p-4 sm:p-5 ${border}`}>
      <span className={`absolute left-0 top-5 h-8 w-1 rounded-r-full ${accent}`} aria-hidden="true" />
      <p className="text-sm font-semibold text-foreground">{en}</p>
      <Ur className="block text-sm text-muted-foreground">{ur}</Ur>
      <p className={`mt-1.5 truncate font-mono text-xl font-bold tabular-nums sm:text-2xl ${tone === 'bad' ? 'text-destructive' : 'text-foreground'}`}>
        {value}
      </p>
      <p className="truncate text-xs text-muted-foreground sm:text-sm">{sub}</p>
    </div>
  );
}

function ActionTile({
  href,
  icon,
  en,
  ur,
  tone,
  hint,
}: {
  href: string;
  icon: React.ElementType;
  en: string;
  ur: string;
  tone: Tone;
  hint: string;
}) {
  return (
    <Link
      href={href}
      className="panel group flex min-h-[112px] flex-col justify-between p-4 transition hover:border-primary/40 hover:shadow-md active:scale-[0.98]"
    >
      <IconChip icon={icon} tone={tone} size="lg" />
      <span className="mt-3 flex items-end justify-between gap-2">
        <span className="flex flex-col leading-tight">
          <span className="text-base font-bold text-foreground">{en}</span>
          <Ur className="text-sm text-muted-foreground">{ur}</Ur>
          <span className="sr-only">{hint}</span>
        </span>
        <ChevronRight className="h-5 w-5 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
      </span>
    </Link>
  );
}

function StatCard({
  icon,
  tone,
  en,
  ur,
  value,
  note,
  href,
}: {
  icon: React.ElementType;
  tone: Tone;
  en: string;
  ur: string;
  value: number;
  note: string;
  href?: string;
}) {
  const body = (
    <>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <IconChip icon={icon} tone={tone} />
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="text-sm font-semibold text-foreground">{en}</span>
          <Ur className="text-sm text-muted-foreground">{ur}</Ur>
        </span>
      </div>
      <p className={`mt-2 truncate font-mono text-xl font-bold tabular-nums sm:mt-3 sm:text-2xl ${value < 0 ? 'text-destructive' : 'text-foreground'}`}>
        {formatPKR(value)}
      </p>
      <p className="line-clamp-2 text-xs text-muted-foreground sm:text-sm">{note}</p>
    </>
  );
  const cls = 'panel block min-w-0 p-3.5 sm:p-4';
  return href ? (
    <Link href={href} className={`${cls} transition hover:border-primary/40`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

function EquationPart({ en, ur, value, color }: { en: string; ur: string; value: number; color: string }) {
  return (
    <div className={`flex items-center justify-between rounded-2xl px-4 py-3 sm:flex-col sm:items-start ${color}`}>
      <span className="flex flex-col leading-tight">
        <span className="text-sm font-bold">{en}</span>
        <Ur className="text-xs opacity-80">{ur}</Ur>
      </span>
      <span className="font-mono text-lg font-extrabold tabular-nums">{formatPKR(value)}</span>
    </div>
  );
}

function Op({ children }: { children: React.ReactNode }) {
  return (
    <span className="hidden text-center text-2xl font-bold text-muted-foreground sm:block" aria-hidden="true">
      {children}
    </span>
  );
}

function PayDialog({ subscription, onClose }: { subscription?: ShopSubscription | null; onClose: () => void }) {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = (text: string, key: string) => {
    navigator.clipboard?.writeText(text).then(
      () => {
        setCopied(key);
        toast.success('Copied', { duration: 1500 });
        setTimeout(() => setCopied(null), 1800);
      },
      () => toast.error('Could not copy')
    );
  };
  const rows = [
    { key: 'wallet', label: 'EasyPaisa / JazzCash', value: SHOPFLOW_PAYMENT_CHANNELS.walletNumber, color: 'bg-emerald-500' },
    { key: 'iban', label: SHOPFLOW_PAYMENT_CHANNELS.bankName, value: SHOPFLOW_PAYMENT_CHANNELS.iban, color: 'bg-sky-500' },
  ];
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 sm:items-center sm:p-4" role="dialog" aria-modal="true" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-card shadow-2xl animate-in slide-in-from-bottom-4 sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <p className="text-lg font-bold text-foreground">Pay ShopFlow fee</p>
            <Ur className="text-muted-foreground">فیس جمع کروائیں</Ur>
          </div>
          <button onClick={onClose} className="icon-btn" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-3 p-5">
          <div className="flex items-center justify-between rounded-2xl bg-muted p-4">
            <span className="text-sm text-muted-foreground">{subscription?.month_name || 'This month'}</span>
            <span className="font-mono text-2xl font-extrabold">
              {subscription ? formatPKR(subscription.amount) : SHOPFLOW_PAYMENT_CHANNELS.monthlyFee}
            </span>
          </div>
          {rows.map((r) => (
            <div key={r.key} className="flex items-center gap-3 rounded-2xl border border-border p-3">
              <span className={`h-10 w-1.5 rounded-full ${r.color}`} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{r.label}</p>
                <p className="break-all font-mono text-base font-bold">{r.value}</p>
                <p className="text-sm text-muted-foreground">{SHOPFLOW_PAYMENT_CHANNELS.accountTitle}</p>
              </div>
              <button
                onClick={() => copy(r.value, r.key)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border hover:bg-muted"
                aria-label={`Copy ${r.label}`}
              >
                {copied === r.key ? <Check className="h-5 w-5 text-emerald-600" /> : <Copy className="h-5 w-5" />}
              </button>
            </div>
          ))}
          <p className="rounded-xl bg-violet-50 p-3 text-sm text-violet-900 dark:bg-violet-950/40 dark:text-violet-200">
            Send the receipt screenshot on WhatsApp <strong className="font-mono">{SHOPFLOW_PAYMENT_CHANNELS.whatsapp}</strong>.
            <br />
            <Ur>رقم بھیجنے کے بعد رسید کی تصویر واٹس ایپ پر بھیجیں۔</Ur>
          </p>
          <button onClick={onClose} className="btn btn-primary w-full">
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

function formatRelativeTime(dateStr: string): string {
  const diffMin = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  const h = Math.floor(diffMin / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'Yesterday';
  if (d < 7) return `${d} days ago`;
  return new Date(dateStr).toLocaleDateString('en-PK', { month: 'short', day: 'numeric', timeZone: 'Asia/Karachi' });
}
