'use client';

import { useRouter } from 'next/navigation';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Receipt,
  Printer,
  Wallet,
  ShoppingBag,
  PieChart,
  Package,
  Truck,
  Ban,
  Tag,
  AlertTriangle,
  Download,
} from 'lucide-react';
import type { UserRole } from '@/lib/types';
import { formatPKR } from '@/lib/types';
import { exportToCSV } from '@/lib/export-csv';

interface ProductInventoryItem {
  id: string;
  name: string;
  model: string | null;
  stock_quantity: number;
  low_stock_threshold: number;
  purchase_price: number;
  sale_price: number;
  is_imei_tracked: boolean;
}

interface ExpenseRow {
  id: string;
  amount: number;
  expense_date: string;
  payment_method: string | null;
  description: string | null;
  notes: string | null;
  expense_categories?: { name: string } | null;
}

interface ReportsClientProps {
  dateRange: string;
  activeTab: string;
  userRole: UserRole;
  totalRevenue: number;
  totalDiscounts: number;
  totalCollected: number;
  totalUdhaar: number;
  salesCount: number;
  cancelledCount: number;
  cancelledTotal: number;
  cogs: number;
  grossProfit: number;
  totalExpenses: number;
  netProfit: number;
  totalPurchases: number;
  purchasesCount: number;
  supplierStats: { name: string; total: number; count: number }[];
  totalInventoryCostValuation: number;
  totalPotentialRetailValuation: number;
  totalStockQuantity: number;
  lowStockCount: number;
  inStockImeiCount: number;
  products: ProductInventoryItem[];
  paymentMethodStats: { method: string; total: number; count: number }[];
  topProducts: { name: string; model: string | null; quantity: number; revenue: number }[];
  expenseCategories: { name: string; amount: number }[];
  recentExpenses: ExpenseRow[];
}

export function ReportsClient({
  dateRange,
  activeTab,
  userRole,
  totalRevenue,
  totalDiscounts,
  totalCollected,
  totalUdhaar,
  salesCount,
  cancelledCount,
  cancelledTotal,
  cogs,
  grossProfit,
  totalExpenses,
  netProfit,
  totalPurchases,
  purchasesCount,
  supplierStats,
  totalInventoryCostValuation,
  totalPotentialRetailValuation,
  totalStockQuantity,
  lowStockCount,
  inStockImeiCount,
  products,
  paymentMethodStats,
  topProducts,
  expenseCategories,
  recentExpenses,
}: ReportsClientProps) {
  const router = useRouter();

  const isPrivileged = userRole === 'shop_owner' || userRole === 'manager';
  const isNetPositive = netProfit >= 0;

  function updateQuery(range: string, tab: string) {
    const params = new URLSearchParams();
    if (range) params.set('range', range);
    if (tab) params.set('tab', tab);
    router.push(`/reports?${params.toString()}`);
  }

  const grossMarginPct = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : '0';
  const netMarginPct = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : '0';

  const handleExportCSV = () => {
    if (activeTab === 'pnl') {
      const headers = ['Financial Metric', 'Amount (PKR)', 'Description'];
      const rows = [
        ['Gross Sales Revenue', Math.round(totalRevenue / 100), 'Total completed sales volume'],
        ['Total Customer Discounts', Math.round(totalDiscounts / 100), 'Discounts granted'],
        ['Cost of Goods Sold (COGS)', Math.round(cogs / 100), 'Wholesale product cost of sold items'],
        ['Gross Profit', Math.round(grossProfit / 100), 'Revenue minus COGS'],
        ['Operating Expenses', Math.round(totalExpenses / 100), 'Total business expenditures'],
        ['Net Profit (Loss)', Math.round(netProfit / 100), 'Gross Profit minus Operating Expenses'],
        ['Net Profit Margin', `${netMarginPct}%`, 'Net margin percentage'],
        ['Udhaar Unpaid (Receivables)', Math.round(totalUdhaar / 100), 'Outstanding credit receivables'],
        ['Cash Collected', Math.round(totalCollected / 100), 'Realized cash inflow'],
      ];
      exportToCSV(`pnl_report_${dateRange}`, headers, rows);
    } else if (activeTab === 'sales') {
      const headers = ['Product / Metric', 'Units / Count', 'Details'];
      const rows = [
        ['Total Completed Sales', salesCount, 'Transactions count'],
        ['Gross Sales Revenue', Math.round(totalRevenue / 100), 'Total sales PKR'],
        ['Cash Collected', Math.round(totalCollected / 100), 'Collected PKR'],
        ['Unpaid Udhaar', Math.round(totalUdhaar / 100), 'Credit balance PKR'],
        ['Cancelled Invoices', cancelledCount, 'Voided transactions'],
        ['Cancelled Total Value', Math.round(cancelledTotal / 100), 'Voided PKR'],
        ...topProducts.map((p) => [p.name, `${p.quantity} units`, `Revenue: Rs. ${Math.round(p.revenue / 100)}`]),
        ...paymentMethodStats.map((m) => [`Payment: ${m.method.toUpperCase()}`, `${m.count} txns`, `Total: Rs. ${Math.round(m.total / 100)}`]),
      ];
      exportToCSV(`sales_report_${dateRange}`, headers, rows);
    } else if (activeTab === 'purchases') {
      const headers = ['Supplier Name', 'Purchases Count', 'Total Spend (PKR)'];
      const rows = [
        ['Total Procurement Spend', purchasesCount, Math.round(totalPurchases / 100)],
        ...supplierStats.map((s) => [s.name, s.count, Math.round(s.total / 100)]),
      ];
      exportToCSV(`purchases_report_${dateRange}`, headers, rows);
    } else if (activeTab === 'expenses') {
      const headers = ['Date', 'Category', 'Amount (PKR)', 'Payment Method', 'Description', 'Notes'];
      const rows = recentExpenses.map((e) => [
        e.expense_date,
        e.expense_categories?.name || 'Uncategorized',
        Math.round(e.amount / 100),
        e.payment_method?.toUpperCase() || 'CASH',
        e.description || '',
        e.notes || '',
      ]);
      exportToCSV(`expenses_report_${dateRange}`, headers, rows);
    } else if (activeTab === 'inventory') {
      const headers = ['Product Name', 'Model', 'Stock Qty', 'Cost Price (PKR)', 'Sale Price (PKR)', 'Total Cost Value (PKR)', 'Potential Retail Value (PKR)', 'IMEI Tracked', 'Status'];
      const rows = products.map((p) => [
        p.name,
        p.model || '',
        p.stock_quantity,
        Math.round(p.purchase_price / 100),
        Math.round(p.sale_price / 100),
        Math.round((p.purchase_price * p.stock_quantity) / 100),
        Math.round((p.sale_price * p.stock_quantity) / 100),
        p.is_imei_tracked ? 'YES' : 'NO',
        p.stock_quantity === 0 ? 'OUT OF STOCK' : p.stock_quantity <= p.low_stock_threshold ? 'LOW STOCK' : 'IN STOCK',
      ]);
      exportToCSV(`inventory_valuation_${dateRange}`, headers, rows);
    }
  };

  return (
    <div className="space-y-6">
      {/* Interactive Controls & Header (Hidden during print) */}
      <div className="print:hidden space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Reports & Analytics</h1>
            <p className="text-sm text-muted-foreground">
              Authoritative business intelligence, Profit & Loss, sales, inventory valuation, and expenses.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Date Range Selector */}
            <div className="flex rounded-lg border border-border bg-card p-1">
              {[
                { id: 'today', label: 'Today' },
                { id: 'week', label: 'This Week' },
                { id: 'month', label: 'This Month' },
                { id: 'all', label: 'All Time' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => updateQuery(tab.id, activeTab)}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                    dateRange === tab.id
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold hover:bg-muted text-foreground transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Download className="h-4 w-4 text-emerald-500" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Printer className="h-4 w-4" />
              <span>Print Report</span>
            </button>
          </div>
        </div>

        {/* Report Module Navigation Tabs */}
        <div className="flex border-b border-border space-x-2 overflow-x-auto pb-1 text-sm font-medium">
          {[
            { id: 'pnl', label: 'Profit & Loss', privilegedOnly: true },
            { id: 'sales', label: 'Sales Report', privilegedOnly: false },
            { id: 'purchases', label: 'Purchases Report', privilegedOnly: true },
            { id: 'expenses', label: 'Expenses Report', privilegedOnly: false },
            { id: 'inventory', label: 'Inventory Valuation', privilegedOnly: false },
          ]
            .filter((t) => !t.privilegedOnly || isPrivileged)
            .map((tab) => (
              <button
                key={tab.id}
                onClick={() => updateQuery(dateRange, tab.id)}
                className={`px-3 py-2 border-b-2 font-semibold text-xs transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                }`}
              >
                {tab.label}
              </button>
            ))}
        </div>
      </div>

      {/* ============================================================ */}
      {/* PRINTABLE REPORT CONTAINER (100% VISIBLE ON PRINT) */}
      {/* ============================================================ */}
      <div id="printable-report" className="space-y-6">
        {/* Printable Official Header */}
        <div className="hidden print:block pb-3 mb-4 border-b-2 border-black">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-black border border-black px-1.5 py-0.5 rounded inline-block mb-1">
                ShopFlow Certified Report
              </div>
              <h1 className="text-xl font-black uppercase tracking-tight text-black">Financial & Operations Report</h1>
              <p className="text-xs text-gray-700 font-medium">Period: {dateRange.toUpperCase()} | Module: {activeTab.toUpperCase()}</p>
            </div>
            <div className="text-right text-xs text-gray-800 space-y-0.5">
              <p>Generated: {new Date().toLocaleString('en-PK')}</p>
              <p className="font-bold text-black">Official Business Intelligence</p>
            </div>
          </div>
        </div>

      {/* ============================================================ */}
      {/* TAB 1: PROFIT & LOSS STATEMENT */}
      {/* ============================================================ */}
      {activeTab === 'pnl' && isPrivileged && (
        <div className="space-y-6 animate-in fade-in-50">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Gross Revenue */}
            <div className="premium-card border border-indigo-500/20 bg-card p-5 relative overflow-hidden group">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-primary" />
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Gross Revenue</span>
                <div className="rounded-xl bg-indigo-500/10 p-2 text-indigo-600 dark:text-indigo-400">
                  <DollarSign className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-black text-foreground">{formatPKR(totalRevenue)}</div>
              <p className="mt-1 text-xs text-muted-foreground">{salesCount} completed customer sales</p>
            </div>

            {/* Cost of Goods Sold */}
            <div className="premium-card border border-slate-500/20 bg-card p-5 relative overflow-hidden group">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-slate-400 to-zinc-600" />
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Cost of Goods (COGS)</span>
                <div className="rounded-xl bg-muted p-2 text-muted-foreground">
                  <ShoppingBag className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-black text-foreground">{formatPKR(cogs)}</div>
              <p className="mt-1 text-xs text-muted-foreground">Wholesale cost of goods sold</p>
            </div>

            {/* Gross Profit */}
            <div className="premium-card border border-emerald-500/20 bg-card p-5 relative overflow-hidden group">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400" />
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Gross Profit</span>
                <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {formatPKR(grossProfit)}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Gross Margin: {grossMarginPct}%</p>
            </div>

            {/* Operating Expenses */}
            <div className="premium-card border border-rose-500/20 bg-card p-5 relative overflow-hidden group">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-red-600" />
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">Operating Expenses</span>
                <div className="rounded-xl bg-rose-500/10 p-2 text-rose-500">
                  <TrendingDown className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-black text-rose-600 dark:text-rose-400">
                {formatPKR(totalExpenses)}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Shop rent, utilities & overheads</p>
            </div>

            {/* Net Profit */}
            <div
              className={`premium-card p-5 relative overflow-hidden group border ${
                isNetPositive
                  ? 'border-emerald-500/30 bg-card'
                  : 'border-rose-500/30 bg-card'
              }`}
            >
              <div
                className={`absolute top-0 left-0 right-0 h-1 ${
                  isNetPositive
                    ? 'bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500'
                    : 'bg-gradient-to-r from-rose-500 to-red-600'
                }`}
              />
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-bold uppercase tracking-wider ${
                    isNetPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  Net Profit
                </span>
                <div
                  className={`rounded-xl p-2 ${
                    isNetPositive
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                  }`}
                >
                  <TrendingUp className="h-4 w-4" />
                </div>
              </div>
              <div
                className={`mt-2 text-2xl font-black ${
                  isNetPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {formatPKR(netProfit)}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Net Margin: {netMarginPct}%</p>
            </div>

            {/* Total Udhaar Outflow */}
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold uppercase tracking-wider">Period Credit Issued</span>
                <div className="rounded-lg bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400">
                  <Wallet className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
                {formatPKR(totalUdhaar)}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Amount added to customer Udhaar</p>
            </div>
          </div>

          {/* Top Selling Products & Payment Distribution */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4 text-primary" />
                  Top Selling Products
                </h2>
                <span className="text-xs text-muted-foreground">By Units Sold</span>
              </div>
              {topProducts.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No product sales in this period.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {topProducts.map((p, idx) => (
                    <div key={idx} className="flex items-center justify-between py-2.5 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted font-bold text-[10px]">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="font-semibold text-foreground">{p.name}</div>
                          {p.model && <div className="text-muted-foreground text-[10px]">{p.model}</div>}
                        </div>
                      </div>
                      <div className="text-right font-mono">
                        <div className="font-bold text-foreground">{p.quantity} sold</div>
                        <div className="text-muted-foreground text-[10px]">{formatPKR(p.revenue)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <PieChart className="h-4 w-4 text-primary" />
                  Sales by Payment Channel
                </h2>
                <span className="text-xs text-muted-foreground">Inflow</span>
              </div>
              {paymentMethodStats.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No payments recorded.
                </div>
              ) : (
                <div className="space-y-3">
                  {paymentMethodStats.map((item) => {
                    const pct = totalRevenue > 0 ? Math.round((item.total / totalRevenue) * 100) : 0;
                    return (
                      <div key={item.method} className="space-y-1 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-foreground uppercase">
                            {item.method.replace('_', ' ')}
                          </span>
                          <div className="flex items-center gap-2 font-mono">
                            <span className="text-muted-foreground">{formatPKR(item.total)}</span>
                            <span className="font-bold text-foreground">({pct}%)</span>
                          </div>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 2: SALES REPORT */}
      {/* ============================================================ */}
      {activeTab === 'sales' && (
        <div className="space-y-6 animate-in fade-in-50">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="premium-card border border-indigo-500/20 bg-card p-5 relative overflow-hidden group">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-primary" />
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Total Sales</span>
              <div className="mt-2 text-2xl font-black text-foreground font-mono">{formatPKR(totalRevenue)}</div>
              <p className="mt-1 text-xs text-muted-foreground">{salesCount} completed sales</p>
            </div>

            <div className="premium-card border border-amber-500/20 bg-card p-5 relative overflow-hidden group">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Discounts Given</span>
              <div className="mt-2 text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
                {formatPKR(totalDiscounts)}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Total discount concessions</p>
            </div>

            <div className="premium-card border border-emerald-500/20 bg-card p-5 relative overflow-hidden group">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Collected (Paid)</span>
              <div className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                {formatPKR(totalCollected)}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Cash & digital collections</p>
            </div>

            <div className="premium-card border border-rose-500/20 bg-card p-5 relative overflow-hidden group">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-red-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">Credit (Udhaar)</span>
              <div className="mt-2 text-2xl font-black text-rose-600 dark:text-rose-400 font-mono">
                {formatPKR(totalUdhaar)}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Unpaid balance on credit</p>
            </div>
          </div>

          {/* Cancelled Sales Report (Separately Isolated) */}
          <div className="rounded-xl border border-dashed border-border bg-muted/20 p-5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ban className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-bold text-foreground">Cancelled Transactions (Isolated)</h3>
              </div>
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-mono font-semibold text-muted-foreground">
                {cancelledCount} Cancelled
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Cancelled sales are safely excluded from revenue, profit, stock, and Udhaar calculations, preserving full audit history.
            </p>
            <div className="text-lg font-bold text-muted-foreground font-mono">
              Total Void Amount: {formatPKR(cancelledTotal)}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 3: PURCHASES REPORT */}
      {/* ============================================================ */}
      {activeTab === 'purchases' && isPrivileged && (
        <div className="space-y-6 animate-in fade-in-50">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-5">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Purchases Spend</span>
              <div className="mt-2 text-2xl font-bold text-foreground font-mono">{formatPKR(totalPurchases)}</div>
              <p className="mt-1 text-xs text-muted-foreground">{purchasesCount} wholesale purchase orders</p>
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Active Suppliers</span>
              <div className="mt-2 text-2xl font-bold text-foreground">{supplierStats.length}</div>
              <p className="mt-1 text-xs text-muted-foreground">Wholesale vendors with purchases</p>
            </div>
          </div>

          {/* Supplier Spend Table */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="p-4 border-b border-border font-bold text-sm flex items-center gap-2">
              <Truck className="h-4 w-4 text-primary" />
              Supplier Procurement Breakdown
            </div>
            {supplierStats.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No wholesale purchases recorded for this period.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/30 border-b border-border uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Supplier Name</th>
                    <th className="px-4 py-3 text-right">Orders</th>
                    <th className="px-4 py-3 text-right">Total Procurement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {supplierStats.map((s, idx) => (
                    <tr key={idx} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-semibold text-foreground">{s.name}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{s.count}</td>
                      <td className="px-4 py-3 text-right font-bold text-foreground font-mono">
                        {formatPKR(s.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 4: EXPENSES REPORT */}
      {/* ============================================================ */}
      {activeTab === 'expenses' && (
        <div className="space-y-6 animate-in fade-in-50">
          <div className="rounded-xl border border-border bg-card p-5">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Expenses</span>
            <div className="mt-2 text-2xl font-bold text-rose-600 dark:text-rose-400 font-mono">
              {formatPKR(totalExpenses)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Operational bills and overheads</p>
          </div>

          {/* Category Distribution Grid */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Expenses by Category
            </h3>
            {expenseCategories.length === 0 ? (
              <div className="rounded-xl border border-border p-8 text-center text-xs text-muted-foreground">
                No categorized expenses in this date range.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {expenseCategories.map((c, idx) => (
                  <div key={idx} className="rounded-xl border border-border bg-card p-4 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Tag className="h-3.5 w-3.5" />
                      <span>{c.name}</span>
                    </div>
                    <div className="text-lg font-bold text-foreground font-mono">{formatPKR(c.amount)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Expense Log */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="p-4 border-b border-border font-bold text-sm flex items-center gap-2">
              <Receipt className="h-4 w-4 text-primary" />
              Expense Details Log
            </div>
            {recentExpenses.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No expense records found.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/30 border-b border-border uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3">Method</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recentExpenses.map((e) => (
                    <tr key={e.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-mono text-muted-foreground">{e.expense_date}</td>
                      <td className="px-4 py-3 font-medium text-foreground">{e.expense_categories?.name || 'General'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{e.description || '—'}</td>
                      <td className="px-4 py-3 uppercase text-muted-foreground">{e.payment_method || 'cash'}</td>
                      <td className="px-4 py-3 text-right font-bold text-rose-600 dark:text-rose-400 font-mono">
                        -{formatPKR(e.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 5: INVENTORY VALUATION REPORT */}
      {/* ============================================================ */}
      {activeTab === 'inventory' && (
        <div className="space-y-6 animate-in fade-in-50">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="premium-card border border-indigo-500/20 bg-card p-5 relative overflow-hidden group">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-primary" />
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Valuation at Cost</span>
              <div className="mt-2 text-2xl font-black text-foreground font-mono">
                {formatPKR(totalInventoryCostValuation)}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Total investment at purchase cost</p>
            </div>

            <div className="premium-card border border-emerald-500/20 bg-card p-5 relative overflow-hidden group">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Potential Retail Value</span>
              <div className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                {formatPKR(totalPotentialRetailValuation)}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Expected revenue at selling price</p>
            </div>

            <div className="premium-card border border-blue-500/20 bg-card p-5 relative overflow-hidden group">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Total Units in Stock</span>
              <div className="mt-2 text-2xl font-black text-foreground font-mono">{totalStockQuantity}</div>
              <p className="mt-1 text-xs text-muted-foreground">
                Including {inStockImeiCount} IMEI devices
              </p>
            </div>

            <div className="premium-card border border-amber-500/20 bg-card p-5 relative overflow-hidden group">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Low Stock Warnings</span>
              <div className={`mt-2 text-2xl font-black font-mono ${lowStockCount > 0 ? 'text-amber-600' : 'text-foreground'}`}>
                {lowStockCount}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Products at or below threshold</p>
            </div>
          </div>

          {/* Products Inventory Status Table */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="p-4 border-b border-border font-bold text-sm flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              Live Inventory Snapshot
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/30 border-b border-border uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Product Name</th>
                    <th className="px-4 py-3">Model</th>
                    <th className="px-4 py-3 text-right">Stock</th>
                    <th className="px-4 py-3 text-right">Cost Price</th>
                    <th className="px-4 py-3 text-right">Selling Price</th>
                    <th className="px-4 py-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {products.map((p) => {
                    const isLow = p.stock_quantity <= p.low_stock_threshold;
                    return (
                      <tr key={p.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 font-semibold text-foreground">
                          {p.name}
                          {p.is_imei_tracked && (
                            <span className="ml-2 inline-flex items-center rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                              IMEI
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{p.model || '—'}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-foreground">
                          {p.stock_quantity}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                          {formatPKR(p.purchase_price)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold text-foreground">
                          {formatPKR(p.sale_price)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {p.stock_quantity === 0 ? (
                            <span className="inline-flex items-center rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-600">
                              Out of Stock
                            </span>
                          ) : isLow ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600">
                              <AlertTriangle className="h-3 w-3" /> Low Stock
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                              In Stock
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
