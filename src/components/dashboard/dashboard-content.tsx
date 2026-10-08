'use client';

import { useState } from 'react';
import {
  TrendingUp,
  DollarSign,
  Banknote,
  AlertTriangle,
  ArrowUpRight,
  Package,
  Clock,
  Receipt,
  TrendingDown,
  ShoppingBag,
  CreditCard,
  CheckCircle2,
  Info,
  X,
} from 'lucide-react';
import type { DashboardMetrics, UserRole, ShopSubscription } from '@/lib/types';
import { formatPKR, toRupees } from '@/lib/types';
import { CardInfoTooltip } from '@/components/ui/card-info-tooltip';

interface DashboardContentProps {
  metrics: DashboardMetrics;
  userName: string;
  role: UserRole;
  subscription?: ShopSubscription | null;
}

export function DashboardContent({ metrics, userName, role, subscription }: DashboardContentProps) {
  const [showBankDetails, setShowBankDetails] = useState(false);
  const greeting = getGreeting();
  const firstName = userName.split(' ')[0];
  const isPrivileged = role === 'shop_owner' || role === 'manager';
  const isOwner = role === 'shop_owner';

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Greeting & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {greeting}, {firstName} 👋
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Here&apos;s what&apos;s happening with your shop today.
          </p>
        </div>

        {/* Subscription Quick Badge for Owner */}
        {isOwner && subscription && (
          <div className="flex items-center gap-2">
            {subscription.status === 'paid' ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 border-2 border-emerald-400 px-3 py-1 text-xs font-black text-emerald-950 dark:bg-emerald-950/70 dark:border-emerald-600 dark:text-emerald-200">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                <span>{subscription.month_name} Active (Paid)</span>
              </span>
            ) : (
              <button
                onClick={() => setShowBankDetails(true)}
                className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 border-2 border-amber-500 px-3.5 py-1 text-xs font-black text-amber-950 hover:bg-amber-200 dark:bg-amber-950/80 dark:border-amber-500 dark:text-amber-200 transition cursor-pointer shadow-xs"
              >
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                <span>{subscription.month_name} Due (Rs. 8,000) &bull; Pay Now</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Subscription Alert Banner if Unpaid */}
      {isOwner && subscription && subscription.status !== 'paid' && (() => {
        const effectiveAmount = (subscription.amount === 650000 || subscription.amount < 800000) ? 800000 : subscription.amount;
        return (
          <div className="rounded-2xl border-2 border-amber-400 bg-amber-50 dark:bg-amber-950/40 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-start sm:items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-600 text-white font-bold shadow-xs">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-amber-950 dark:text-amber-100">
                  Monthly Subscription Due: Rs. {toRupees(effectiveAmount).toLocaleString()} ({subscription.month_name})
                </h3>
                <p className="text-xs font-medium text-amber-900/80 dark:text-amber-200/80 mt-0.5">
                  Due Date: {new Date(subscription.due_date).toLocaleDateString()}. Please send Rs. 8,000 to keep uninterrupted POS and inventory access.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowBankDetails(true)}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white px-4 py-2.5 text-xs font-black shadow-md transition shrink-0 cursor-pointer"
            >
              <span>View Bank / EasyPaisa Details</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })()}

      {/* Bank Details Modal */}
      {showBankDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in fade-in-0 zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">ShopFlow Subscription Payment</h3>
                  <p className="text-xs text-muted-foreground">Official Accounts for Rs. 8,000 / month</p>
                </div>
              </div>
              <button
                onClick={() => setShowBankDetails(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-accent cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="p-3.5 rounded-xl border border-border bg-muted/40 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Monthly Fee:</span>
                  <span className="font-bold text-sm text-foreground font-mono">Rs. 8,000 / month</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Billing Month:</span>
                  <span className="font-semibold text-foreground">{subscription?.month_name || 'Current Month'}</span>
                </div>
              </div>

              {/* EasyPaisa & Mobile Wallet (Primary) */}
              <div className="p-3.5 rounded-xl border border-border bg-card space-y-2.5">
                <div className="font-bold text-xs text-emerald-600 dark:text-emerald-400 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                  <span>📱</span>
                  <span>EasyPaisa / JazzCash Mobile Account</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-border/50">
                  <span className="text-muted-foreground text-[11px]">Account Name:</span>
                  <span className="font-bold text-foreground text-sm">Syed Muhammad SAqlain</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-muted-foreground text-[11px]">EasyPaisa / Number:</span>
                  <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-base tracking-wide select-all">
                    03143176526
                  </span>
                </div>
              </div>

              {/* Online Bank Transfer */}
              <div className="p-3.5 rounded-xl border border-border bg-card space-y-2">
                <div className="font-bold text-xs text-foreground uppercase tracking-wider text-[10px] text-muted-foreground">
                  Online Bank Transfer (Meezan Bank)
                </div>
                <div>
                  <div className="text-muted-foreground text-[11px]">Bank Name:</div>
                  <div className="font-bold text-foreground">Meezan Bank Ltd</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-[11px]">Account Title:</div>
                  <div className="font-bold text-foreground">Syed Muhammad SAqlain</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-[11px]">Account / Mobile:</div>
                  <div className="font-mono font-bold text-foreground">03143176526</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-[11px]">IBAN:</div>
                  <div className="font-mono text-xs text-foreground">PK49MEZN0002890108392101</div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-primary text-[11px] leading-relaxed">
                After transfer, send your receipt screenshot to WhatsApp <strong className="font-mono">03143176526</strong> or reply to your monthly email. Super Admin will approve your payment within 15 minutes.
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setShowBankDetails(false)}
                className="rounded-xl bg-primary px-5 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Primary KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Today Total Sale */}
        <MetricCard
          title="Today Total Sale"
          value={formatPKR(metrics.today_sales)}
          icon={TrendingUp}
          variant="sales"
          subtitle={`${metrics.today_sales_count ?? 0} orders completed today`}
          urduDetail="آج کے دن دکان میں کل کتنی فروخت (سیل) ہوئی ہے، چاہے نقد بکا ہو یا ادھار پر۔"
        />

        {/* Today Profit (Owner/Manager Only) */}
        {isPrivileged ? (
          <MetricCard
            title="Today Profit (Munafa)"
            value={formatPKR(metrics.today_profit)}
            icon={DollarSign}
            variant="profit"
            subtitle="Sale minus item wholesale cost"
            urduDetail="آج جتنا سامان فروخت ہوا ہے، اس کی ہول سیل قیمتِ خرید نکال کر دکان کا کل منافع کتنا بنتا ہے۔"
          />
        ) : (
          <MetricCard
            title="Total Items in Shop"
            value={String(metrics.total_products ?? 0)}
            icon={Package}
            variant="sales"
            subtitle="Active items in shop catalog"
            urduDetail="آپ کی دکان میں اس وقت کتنی مختلف مصنوعات (آئٹمز) موجود ہیں۔"
          />
        )}

        {/* Cash in Hand */}
        <MetricCard
          title="Cash in Hand (Wasooli)"
          value={formatPKR(metrics.today_cash)}
          icon={Banknote}
          variant="cash"
          subtitle="Total cash collected in counter"
          urduDetail="آج دکان کے گلے (کاؤنٹر) میں نقد رقم کتنی وصول ہوئی ہے، جس میں نقد فروخت اور پرانی ادھار وصولی شامل ہے۔"
        />

        {/* Customer Udhaar */}
        <MetricCard
          title="Customer Udhaar (Khata)"
          value={formatPKR(metrics.total_udhaar)}
          icon={Receipt}
          variant="udhaar"
          subtitle="Total market credit to collect"
          urduDetail="گاہکوں کے ذمے کل کتنا ادھار باقی ہے جو دکان کو مارکیٹ سے وصول کرنا ہے۔"
        />
      </div>

      {/* Secondary Financial Snapshot (Owner/Manager Only) */}
      {isPrivileged && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Item Purchase Cost */}
          <MetricCard
            title="Item Purchase Cost (COGS)"
            value={formatPKR(metrics.today_cogs ?? 0)}
            icon={ShoppingBag}
            variant="cogs"
            subtitle="Wholesale cost of goods sold"
            urduDetail="آج جو سامان فروخت ہوا ہے، اس کی اصل ہول سیل قیمتِ خرید (لاگت) کتنی تھی۔"
          />

          {/* Today Shop Expenses */}
          <MetricCard
            title="Today Shop Expenses"
            value={formatPKR(metrics.today_expenses ?? 0)}
            icon={TrendingDown}
            variant="expense"
            subtitle="Daily shop bills, food & tea"
            urduDetail="آج دکان کے روزمرہ اخراجات (چائے، کھانا، بجلی، کرایہ وغیرہ) پر کتنا خرچ ہوا۔"
          />

          {/* Net Profit */}
          <MetricCard
            title="Net Profit (Asal Bachat)"
            value={formatPKR(metrics.today_net_profit ?? 0)}
            icon={DollarSign}
            variant={(metrics.today_net_profit ?? 0) >= 0 ? 'net_profit' : 'expense'}
            subtitle="Profit after all shop expenses"
            urduDetail="سامان کی اصل لاگت اور دکان کے تمام اخراجات نکال کر آج کی اصل خالص بچت۔"
          />
        </div>
      )}

      {/* Low Stock Alert */}
      {metrics.low_stock_count > 0 && (
        <div className="flex items-center gap-3 rounded-xl border-2 border-amber-400 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 shadow-xs">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
          <div className="flex-1">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-black text-amber-950 dark:text-amber-100">
                Stock Ending Soon: {metrics.low_stock_count} item{metrics.low_stock_count > 1 ? 's' : ''}
              </p>
              <CardInfoTooltip
                title="Stock Ending Soon"
                urduDetail="وہ سامان جس کا اسٹاک ختم ہونے کے قریب ہے تاکہ آپ بروقت نیا مال منگوا سکیں۔"
              />
            </div>
            <p className="text-xs font-semibold text-amber-900/80 dark:text-amber-200/80 mt-0.5">
              Check items to reorder before stock runs out
            </p>
          </div>
          <a
            href="/products"
            className="flex items-center gap-1 text-xs font-black text-amber-800 hover:text-amber-950 dark:text-amber-300 dark:hover:text-amber-100 transition-colors"
          >
            View Items
            <ArrowUpRight className="h-3 w-3" />
          </a>
        </div>
      )}

      {/* Recent Transactions */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">
              Recent Transactions
            </h2>
          </div>
          <a
            href="/sales"
            className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
          >
            View all
          </a>
        </div>

        {metrics.recent_transactions.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="divide-y divide-border">
            {metrics.recent_transactions.map((txn) => (
              <div
                key={txn.id}
                className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <TrendingUp className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {txn.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatRelativeTime(txn.created_at)}
                    </p>
                  </div>
                </div>
                <span className={`text-sm font-semibold tabular-nums ml-3 font-mono ${
                  txn.amount === 0 ? 'text-muted-foreground line-through' : 'text-foreground'
                }`}>
                  {formatPKR(txn.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Helper Components ----

type MetricVariant = 'sales' | 'profit' | 'cash' | 'udhaar' | 'cogs' | 'expense' | 'net_profit';

interface MetricStyle {
  cardBg: string;
  cardBorder: string;
  hoverBorder: string;
  titleColor: string;
  iconBg: string;
  iconColor: string;
  valueColor: string;
  subColor: string;
}

function MetricCard({
  title,
  value,
  icon: Icon,
  variant,
  subtitle,
  urduDetail,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  variant: MetricVariant;
  subtitle: string;
  urduDetail: string;
}) {
  const variantStyles: Record<MetricVariant, MetricStyle> = {
    sales: {
      cardBg: 'bg-gradient-to-br from-blue-100/90 via-blue-50/70 to-card dark:from-blue-950/70 dark:via-blue-900/40 dark:to-card',
      cardBorder: 'border-2 border-blue-300 dark:border-blue-700 shadow-xs',
      hoverBorder: 'hover:border-blue-600 dark:hover:border-blue-400 hover:shadow-md',
      titleColor: 'text-blue-900 dark:text-blue-200',
      iconBg: 'bg-blue-600 text-white shadow-xs shadow-blue-500/30 border-blue-500',
      iconColor: 'text-white',
      valueColor: 'text-slate-950 dark:text-white',
      subColor: 'text-blue-900/80 dark:text-blue-200/90',
    },
    profit: {
      cardBg: 'bg-gradient-to-br from-emerald-100/90 via-emerald-50/70 to-card dark:from-emerald-950/70 dark:via-emerald-900/40 dark:to-card',
      cardBorder: 'border-2 border-emerald-300 dark:border-emerald-700 shadow-xs',
      hoverBorder: 'hover:border-emerald-600 dark:hover:border-emerald-400 hover:shadow-md',
      titleColor: 'text-emerald-900 dark:text-emerald-200',
      iconBg: 'bg-emerald-600 text-white shadow-xs shadow-emerald-500/30 border-emerald-500',
      iconColor: 'text-white',
      valueColor: 'text-slate-950 dark:text-white',
      subColor: 'text-emerald-900/80 dark:text-emerald-200/90',
    },
    cash: {
      cardBg: 'bg-gradient-to-br from-cyan-100/90 via-cyan-50/70 to-card dark:from-cyan-950/70 dark:via-cyan-900/40 dark:to-card',
      cardBorder: 'border-2 border-cyan-300 dark:border-cyan-700 shadow-xs',
      hoverBorder: 'hover:border-cyan-600 dark:hover:border-cyan-400 hover:shadow-md',
      titleColor: 'text-cyan-900 dark:text-cyan-200',
      iconBg: 'bg-cyan-600 text-white shadow-xs shadow-cyan-500/30 border-cyan-500',
      iconColor: 'text-white',
      valueColor: 'text-slate-950 dark:text-white',
      subColor: 'text-cyan-900/80 dark:text-cyan-200/90',
    },
    udhaar: {
      cardBg: 'bg-gradient-to-br from-amber-100/90 via-amber-50/70 to-card dark:from-amber-950/70 dark:via-amber-900/40 dark:to-card',
      cardBorder: 'border-2 border-amber-300 dark:border-amber-700 shadow-xs',
      hoverBorder: 'hover:border-amber-600 dark:hover:border-amber-400 hover:shadow-md',
      titleColor: 'text-amber-950 dark:text-amber-200',
      iconBg: 'bg-amber-600 text-white shadow-xs shadow-amber-500/30 border-amber-500',
      iconColor: 'text-white',
      valueColor: 'text-amber-950 dark:text-amber-100',
      subColor: 'text-amber-900/80 dark:text-amber-200/90',
    },
    cogs: {
      cardBg: 'bg-gradient-to-br from-violet-100/90 via-violet-50/70 to-card dark:from-violet-950/70 dark:via-violet-900/40 dark:to-card',
      cardBorder: 'border-2 border-violet-300 dark:border-violet-700 shadow-xs',
      hoverBorder: 'hover:border-violet-600 dark:hover:border-violet-400 hover:shadow-md',
      titleColor: 'text-violet-900 dark:text-violet-200',
      iconBg: 'bg-violet-600 text-white shadow-xs shadow-violet-500/30 border-violet-500',
      iconColor: 'text-white',
      valueColor: 'text-slate-950 dark:text-white',
      subColor: 'text-violet-900/80 dark:text-violet-200/90',
    },
    expense: {
      cardBg: 'bg-gradient-to-br from-rose-100/90 via-rose-50/70 to-card dark:from-rose-950/70 dark:via-rose-900/40 dark:to-card',
      cardBorder: 'border-2 border-rose-300 dark:border-rose-700 shadow-xs',
      hoverBorder: 'hover:border-rose-600 dark:hover:border-rose-400 hover:shadow-md',
      titleColor: 'text-rose-950 dark:text-rose-200',
      iconBg: 'bg-rose-600 text-white shadow-xs shadow-rose-500/30 border-rose-500',
      iconColor: 'text-white',
      valueColor: 'text-rose-700 dark:text-rose-300',
      subColor: 'text-rose-900/80 dark:text-rose-200/90',
    },
    net_profit: {
      cardBg: 'bg-gradient-to-br from-emerald-100/90 via-emerald-50/70 to-card dark:from-emerald-950/70 dark:via-emerald-900/40 dark:to-card',
      cardBorder: 'border-2 border-emerald-300 dark:border-emerald-700 shadow-xs',
      hoverBorder: 'hover:border-emerald-600 dark:hover:border-emerald-400 hover:shadow-md',
      titleColor: 'text-emerald-900 dark:text-emerald-200',
      iconBg: 'bg-emerald-600 text-white shadow-xs shadow-emerald-500/30 border-emerald-500',
      iconColor: 'text-white',
      valueColor: 'text-emerald-700 dark:text-emerald-300',
      subColor: 'text-emerald-900/80 dark:text-emerald-200/90',
    },
  };

  const style = variantStyles[variant];

  return (
    <div
      className={`rounded-2xl border p-5 transition-all duration-200 ease-out relative ${style.cardBg} ${style.cardBorder} ${style.hoverBorder}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <p className={`text-xs font-black uppercase tracking-wider truncate ${style.titleColor}`}>
            {title}
          </p>
          <CardInfoTooltip title={title} urduDetail={urduDetail} />
        </div>
        <div className={`rounded-xl p-2.5 border shrink-0 ${style.iconBg} ${style.iconColor}`}>
          <Icon className="h-4.5 w-4.5" />
        </div>
      </div>
      <p className={`mt-3 text-2xl sm:text-3xl font-black tracking-tight tabular-nums font-mono ${style.valueColor}`}>
        {value}
      </p>
      <p className={`mt-1 text-xs font-semibold ${style.subColor}`}>{subtitle}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center px-5 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted/50">
        <Package className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-sm font-medium text-foreground">
        No transactions yet
      </h3>
      <p className="mt-1 text-xs text-muted-foreground max-w-[240px]">
        Start by adding products and making your first sale. Your activity will show up here.
      </p>
      <a
        href="/sales/new"
        className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
      >
        Create First Sale
        <ArrowUpRight className="h-3 w-3" />
      </a>
    </div>
  );
}

// ---- Utilities ----

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-PK', {
    month: 'short',
    day: 'numeric',
  });
}
