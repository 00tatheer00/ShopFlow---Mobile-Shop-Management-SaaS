'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  DollarSign,
  Banknote,
  Receipt,
  ShoppingBag,
  Package,
  AlertTriangle,
  ArrowUpRight,
  Clock,
  X,
  CreditCard,
  CheckCircle2,
  Copy,
  Check,
} from 'lucide-react';
import type { DashboardMetrics, UserRole, ShopSubscription } from '@/lib/types';
import { formatPKR, toRupees } from '@/lib/types';
import { MetricCard } from './metric-card';
import { QuickActions } from './quick-actions';
import { SubscriptionBanner } from './subscription-banner';
import { FinancialOverviewChart } from './financial-overview-chart';
import { EmptyState } from './empty-state';
import { InfoTooltip } from './info-tooltip';

interface DashboardContentProps {
  metrics: DashboardMetrics;
  userName: string;
  role: UserRole;
  subscription?: ShopSubscription | null;
}

export function DashboardContent({
  metrics,
  userName,
  role,
  subscription,
}: DashboardContentProps) {
  const [showBankDetails, setShowBankDetails] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const greeting = getGreeting();
  const firstName = userName.split(' ')[0];
  const isPrivileged = role === 'shop_owner' || role === 'manager';

  // Today's Date formatted cleanly (e.g. "Monday, 9 November 2026")
  const todayFormatted = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* 1. Greeting & Date Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {greeting}, {firstName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground flex items-center gap-2">
            <span>{todayFormatted}</span>
            <span>&bull;</span>
            <span>Daily Shop Summary</span>
          </p>
        </div>

        {/* Discreet Subscription Badge if Paid */}
        {role === 'shop_owner' && subscription?.status === 'paid' && (
          <div className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 px-3 py-1 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            <span>{subscription.month_name} Active</span>
          </div>
        )}
      </div>

      {/* 2. Unified Subscription Banner (Only when relevant for owner) */}
      {role === 'shop_owner' && subscription && subscription.status !== 'paid' && (
        <SubscriptionBanner
          subscription={subscription}
          onPayNow={() => setShowBankDetails(true)}
        />
      )}

      {/* 3. Quick Actions Row */}
      <QuickActions />

      {/* 4. HERO METRICS (The 3 most vital numbers for shopkeepers) */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Today&apos;s Highlights
          </h2>
          <span className="text-xs text-muted-foreground font-medium">
            Core shop performance
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Hero 1: Today's Sales */}
          <MetricCard
            isHero
            title="Today's Sales"
            value={formatPKR(metrics.today_sales)}
            icon={TrendingUp}
            variant="sales"
            rawAmount={metrics.today_sales}
            subtitle={`${metrics.today_sales_count ?? 0} order${(metrics.today_sales_count ?? 0) === 1 ? '' : 's'} completed today`}
            urduDetail="آج کے دن دکان میں کل کتنی فروخت (سیل) ہوئی ہے، چاہے نقد بکا ہو یا ادھار پر۔"
            emptyHint={{
              text: 'No sales recorded yet today.',
              actionLabel: 'New Sale',
              actionHref: '/sales/new',
            }}
          />

          {/* Hero 2: Today's Profit (or Total Products for Cashier) */}
          {isPrivileged ? (
            <MetricCard
              isHero
              title="Today's Profit"
              value={formatPKR(metrics.today_profit)}
              icon={DollarSign}
              variant="profit"
              rawAmount={metrics.today_profit}
              subtitle="Sale price minus wholesale cost"
              urduDetail="آج جتنا سامان فروخت ہوا ہے، اس کی ہول سیل قیمتِ خرید نکال کر دکان کا کل منافع کتنا بنتا ہے۔"
              trend={{
                type: metrics.today_profit > 0 ? 'positive' : 'neutral',
                label: 'Gross Profit',
              }}
              emptyHint={{
                text: 'Profit will calculate once items are sold.',
                actionLabel: 'POS Terminal',
                actionHref: '/sales/new',
              }}
            />
          ) : (
            <MetricCard
              isHero
              title="Total Products in Shop"
              value={String(metrics.total_products ?? 0)}
              icon={Package}
              variant="sales"
              rawAmount={metrics.total_products}
              subtitle="Active products in inventory"
              urduDetail="آپ کی دکان میں اس وقت کتنی مختلف مصنوعات (آئٹمز) موجود ہیں۔"
            />
          )}

          {/* Hero 3: Cash in Hand (Wasooli) */}
          <MetricCard
            isHero
            title="Cash in Hand"
            value={formatPKR(metrics.today_cash)}
            icon={Banknote}
            variant="cash"
            rawAmount={metrics.today_cash}
            subtitle="Cash received at counter today"
            urduDetail="آج دکان کے گلے (کاؤنٹر) میں نقد رقم کتنی وصول ہوئی ہے، جس میں نقد فروخت اور پرانی ادھار وصولی شامل ہے۔"
            trend={{
              type: metrics.today_cash > 0 ? 'positive' : 'neutral',
              label: 'Counter Cash',
            }}
            emptyHint={{
              text: 'Rs 0 cash collected so far.',
              actionLabel: 'Record Cash Sale',
              actionHref: '/sales/new',
            }}
          />
        </div>
      </div>

      {/* 5. SECONDARY METRICS (Customer Udhaar, Item Cost, Expenses, Net Profit) */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Financial Balance & Credit
          </h2>
          <span className="text-xs text-muted-foreground font-medium">
            Market credit & expenses
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Secondary 1: Customer Udhaar */}
          <MetricCard
            title="Customer Udhaar"
            value={formatPKR(metrics.total_udhaar)}
            icon={Receipt}
            variant="udhaar"
            rawAmount={metrics.total_udhaar}
            subtitle="Market credit to recover"
            urduDetail="گاہکوں کے ذمے کل کتنا ادھار باقی ہے جو دکان کو مارکیٹ سے وصول کرنا ہے۔"
            emptyHint={{
              text: 'No outstanding customer balance.',
              actionLabel: 'View Khata',
              actionHref: '/udhaar',
            }}
          />

          {/* Secondary 2: Item Cost (COGS) */}
          {isPrivileged ? (
            <MetricCard
              title="Item Cost"
              value={formatPKR(metrics.today_cogs ?? 0)}
              icon={ShoppingBag}
              variant="cogs"
              rawAmount={metrics.today_cogs ?? 0}
              subtitle="Wholesale purchase cost"
              urduDetail="آج جو سامان فروخت ہوا ہے، اس کی اصل ہول سیل قیمتِ خرید (لاگت) کتنی تھی۔"
              emptyHint={{
                text: 'No item wholesale cost yet.',
              }}
            />
          ) : (
            <MetricCard
              title="Low Stock Items"
              value={String(metrics.low_stock_count)}
              icon={AlertTriangle}
              variant="udhaar"
              rawAmount={metrics.low_stock_count}
              subtitle="Items needing replenishment"
              urduDetail="وہ سامان جس کا اسٹاک ختم ہونے کے قریب ہے تاکہ آپ بروقت نیا مال منگوا سکیں۔"
            />
          )}

          {/* Secondary 3: Today's Expenses */}
          {isPrivileged && (
            <MetricCard
              title="Today's Expenses"
              value={formatPKR(metrics.today_expenses ?? 0)}
              icon={Receipt}
              variant="expense"
              rawAmount={metrics.today_expenses ?? 0}
              subtitle="Shop rent, tea, food & bills"
              urduDetail="آج دکان کے روزمرہ اخراجات (چائے، کھانا، بجلی، کرایہ وغیرہ) پر کتنا خرچ ہوا۔"
              emptyHint={{
                text: 'No expenses entered today.',
                actionLabel: 'Add Expense',
                actionHref: '/expenses',
              }}
            />
          )}

          {/* Secondary 4: Net Profit (Asal Bachat) */}
          {isPrivileged && (
            <MetricCard
              title="Net Profit (Asal Bachat)"
              value={formatPKR(metrics.today_net_profit ?? 0)}
              icon={DollarSign}
              variant="net_profit"
              rawAmount={metrics.today_net_profit ?? 0}
              subtitle="Gross profit minus shop expenses"
              urduDetail="سامان کی اصل لاگت اور دکان کے تمام اخراجات نکال کر آج کی اصل خالص بچت۔"
              trend={{
                type: (metrics.today_net_profit ?? 0) >= 0 ? 'positive' : 'negative',
                label: (metrics.today_net_profit ?? 0) >= 0 ? 'Asal Bachat' : 'Net Loss',
              }}
              emptyHint={{
                text: 'Calculates after sales & expenses.',
              }}
            />
          )}
        </div>
      </div>

      {/* 6. Low Stock Warning Card (If any items need restocking) */}
      {metrics.low_stock_count > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50/80 dark:border-amber-900/60 dark:bg-amber-950/30 p-4 sm:p-5 shadow-xs">
          <div className="flex items-start sm:items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-600 text-white font-bold">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-semibold text-amber-950 dark:text-amber-100">
                  Stock Ending Soon: {metrics.low_stock_count} item{metrics.low_stock_count > 1 ? 's' : ''}
                </h3>
                <InfoTooltip
                  title="اسٹاک وارننگ"
                  urduText="وہ سامان جس کا اسٹاک ختم ہونے کے قریب ہے تاکہ آپ بروقت نیا مال منگوا سکیں اور گاہک واپس نہ جائے۔"
                />
              </div>
              <p className="text-xs sm:text-sm text-amber-900/80 dark:text-amber-200/80 mt-0.5">
                Check inventory levels to reorder before running out of stock.
              </p>
            </div>
          </div>
          <Link
            href="/products"
            className="inline-flex items-center justify-center gap-1.5 self-start sm:self-auto min-h-[44px] px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs transition active:scale-95 cursor-pointer"
          >
            <span>Review Items</span>
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {/* 7. Lower Section: Financial Chart & Recent Transactions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Recharts Financial Overview Chart (Privileged) or Shop Activity */}
        <div className="lg:col-span-2">
          {isPrivileged ? (
            <FinancialOverviewChart
              sales={metrics.today_sales}
              cogs={metrics.today_cogs ?? 0}
              expenses={metrics.today_expenses ?? 0}
              netProfit={metrics.today_net_profit ?? 0}
              cash={metrics.today_cash}
            />
          ) : (
            <div className="rounded-2xl border border-border bg-card p-6 h-full flex flex-col justify-center items-center text-center">
              <Package className="h-12 w-12 text-muted-foreground/60 mb-3" />
              <h3 className="text-base font-semibold text-foreground">Cashier POS Ready</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                Ready to make sales and search products with barcode or IMEI tracking.
              </p>
              <Link
                href="/sales/new"
                className="mt-4 inline-flex items-center gap-1.5 min-h-[44px] px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/95 transition"
              >
                <span>Open POS Terminal</span>
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </div>

        {/* Right: Recent Sales / Activity */}
        <div className="rounded-2xl border border-border bg-card shadow-xs flex flex-col">
          <div className="flex items-center justify-between border-b border-border/70 px-5 py-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">
                Recent Sales
              </h3>
            </div>
            <Link
              href="/sales"
              className="text-xs font-semibold text-primary hover:underline transition-colors"
            >
              View all sales
            </Link>
          </div>

          <div className="p-2 flex-1">
            {metrics.recent_transactions.length === 0 ? (
              <div className="py-8">
                <EmptyState
                  title="No sales yet"
                  description="Your completed invoices will appear here."
                  actionLabel="Create Invoice"
                  actionHref="/sales/new"
                />
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {metrics.recent_transactions.map((txn) => {
                  const isCancelled = txn.amount === 0;

                  return (
                    <div
                      key={txn.id}
                      className="flex items-center justify-between p-3.5 hover:bg-muted/30 rounded-xl transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <TrendingUp className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {txn.description}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatRelativeTime(txn.created_at)}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0 ml-3">
                        <span
                          className={`text-sm font-bold font-mono tabular-nums ${
                            isCancelled
                              ? 'text-muted-foreground line-through'
                              : 'text-foreground'
                          }`}
                        >
                          {formatPKR(txn.amount)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 8. Bank Details Modal */}
      {showBankDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in fade-in-0 zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    ShopFlow Subscription Payment
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Official Accounts for Rs. 8,000 / month
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBankDetails(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-accent cursor-pointer"
                aria-label="بند کریں"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="p-3.5 rounded-xl border border-border bg-muted/40 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Monthly Fee:</span>
                  <span className="font-bold text-sm text-foreground font-mono">
                    Rs. 8,000 / month
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Billing Month:</span>
                  <span className="font-semibold text-foreground">
                    {subscription?.month_name || 'Current Month'}
                  </span>
                </div>
              </div>

              {/* EasyPaisa & JazzCash (Primary) */}
              <div className="p-3.5 rounded-xl border border-border bg-card space-y-2.5">
                <div className="font-bold text-xs text-emerald-600 dark:text-emerald-400 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                  <span>📱</span>
                  <span>EasyPaisa / JazzCash Mobile Account</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-border/50">
                  <span className="text-muted-foreground text-[11px]">Account Name:</span>
                  <span className="font-bold text-foreground text-sm">
                    Syed Muhammad SAqlain
                  </span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-muted-foreground text-[11px]">EasyPaisa / Mobile:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-base tracking-wide select-all">
                      03143176526
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard('03143176526', 'easypaisa')}
                      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                      title="Copy number"
                    >
                      {copiedKey === 'easypaisa' ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Meezan Bank Online Transfer */}
              <div className="p-3.5 rounded-xl border border-border bg-card space-y-2">
                <div className="font-bold text-xs text-foreground uppercase tracking-wider text-[10px] text-muted-foreground">
                  Online Bank Transfer (Meezan Bank)
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-[11px]">Bank Name:</span>
                  <span className="font-bold text-foreground">Meezan Bank Ltd</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-[11px]">Account Title:</span>
                  <span className="font-bold text-foreground">Syed Muhammad SAqlain</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-[11px]">Account Number:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-foreground">03143176526</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard('03143176526', 'bankacc')}
                      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      {copiedKey === 'bankacc' ? (
                        <Check className="h-3 w-3 text-emerald-600" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-[11px]">IBAN:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs text-foreground select-all">
                      PK49MEZN0002890108392101
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard('PK49MEZN0002890108392101', 'iban')}
                      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      {copiedKey === 'iban' ? (
                        <Check className="h-3 w-3 text-emerald-600" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-primary text-[11px] leading-relaxed">
                After transfer, send your receipt screenshot to WhatsApp{' '}
                <strong className="font-mono font-bold">03143176526</strong>. Super Admin will verify and activate your shop immediately.
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setShowBankDetails(false)}
                className="min-h-[44px] rounded-xl bg-primary px-6 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Helpers ----

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
