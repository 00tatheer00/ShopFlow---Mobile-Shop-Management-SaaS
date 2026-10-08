'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Receipt,
  Calendar,
  Trash2,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  Tag,
  X,
  FileText,
  Pencil,
  CreditCard,
  Download,
} from 'lucide-react';
import type { Expense, ExpenseCategory, UserRole } from '@/lib/types';
import { formatPKR, toRupees } from '@/lib/types';
import { createExpense, updateExpense, deleteExpense, createExpenseCategory } from './actions';
import { hasPermission } from '@/lib/permissions';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { exportToCSV } from '@/lib/export-csv';
import { CardInfoTooltip } from '@/components/ui/card-info-tooltip';

interface ExpensesClientProps {
  expenses: (Expense & { category?: ExpenseCategory | null })[];
  categories: ExpenseCategory[];
  userRole: UserRole;
  todayTotal: number;
  monthTotal: number;
  totalCount: number;
  currentPage: number;
  totalPages: number;
  selectedCategory: string;
}

export function ExpensesClient({
  expenses,
  categories,
  userRole,
  todayTotal,
  monthTotal,
  totalCount,
  currentPage,
  totalPages,
  selectedCategory,
}: ExpensesClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddCatModalOpen, setIsAddCatModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [expenseToEdit, setExpenseToEdit] = useState<(Expense & { category?: ExpenseCategory | null }) | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<(Expense & { category?: ExpenseCategory | null }) | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const canCreate = hasPermission(userRole, 'expenses:create');
  const canManage = userRole === 'shop_owner' || userRole === 'manager';

  function handleFilterCategory(catId: string) {
    const params = new URLSearchParams();
    if (catId) params.set('category', catId);
    params.set('page', '1');
    router.push(`/expenses?${params.toString()}`);
  }

  function handlePageChange(newPage: number) {
    const params = new URLSearchParams();
    if (selectedCategory) params.set('category', selectedCategory);
    params.set('page', String(newPage));
    router.push(`/expenses?${params.toString()}`);
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await createExpense(formData);
      if (res.error) {
        setFormError(res.error);
      } else {
        setIsAddModalOpen(false);
        router.refresh();
      }
    });
  }

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await updateExpense(formData);
      if (res.error) {
        setFormError(res.error);
      } else {
        setExpenseToEdit(null);
        router.refresh();
      }
    });
  }

  async function handleQuickAddCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCatName.trim()) return;

    startTransition(async () => {
      const res = await createExpenseCategory(newCatName.trim());
      if (res.error) {
        alert(res.error);
      } else {
        setNewCatName('');
        setIsAddCatModalOpen(false);
        router.refresh();
      }
    });
  }

  async function executeDelete(expense: Expense & { category?: ExpenseCategory | null }) {
    startTransition(async () => {
      const res = await deleteExpense(expense.id);
      if (res.error) {
        alert(res.error);
      } else {
        setExpenseToDelete(null);
        router.refresh();
      }
    });
  }

  const handleExportCSV = () => {
    const headers = [
      'Expense ID',
      'Date',
      'Category',
      'Amount (PKR)',
      'Payment Method',
      'Description',
      'Notes',
    ];
    const rows = expenses.map((e) => [
      e.id.substring(0, 8),
      e.expense_date,
      e.category?.name || 'Uncategorized',
      Math.round(e.amount / 100),
      e.payment_method?.toUpperCase() || 'CASH',
      e.description || '',
      e.notes || '',
    ]);
    exportToCSV('expenses_report', headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Shop Expenses</h1>
          <p className="text-sm text-muted-foreground">
            Track day-to-day shop operating costs, rent, utilities, food, and staff allowances.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground shadow-xs hover:bg-muted hover:border-emerald-500/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Download className="h-4 w-4 text-emerald-500" />
            <span>Export CSV</span>
          </button>

          {canCreate && (
            <>
              <button
                onClick={() => setIsAddCatModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted transition"
              >
                <Tag className="h-4 w-4" />
                New Category
              </button>
              <button
                onClick={() => {
                  setFormError(null);
                  setIsAddModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-indigo-600 px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-md hover:shadow-indigo-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Plus className="h-4 w-4" />
                Record Expense
              </button>
            </>
          )}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Today's Expenses */}
        <div className="rounded-2xl p-5 border bg-amber-50/80 dark:bg-amber-950/30 border-amber-200/50 dark:border-amber-900/40 hover:border-amber-500 dark:hover:border-amber-400 transition-colors duration-300 ease-out relative">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 truncate">
                Today Shop Expenses
              </span>
              <CardInfoTooltip
                title="Today Shop Expenses"
                urduDetail="Aj ke din dukan se kitna kharcha hua hai (chai, roti, bijli, petrol waghera)."
              />
            </div>
            <div className="rounded-xl p-2 border shrink-0 bg-amber-100/90 dark:bg-amber-900/60 border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl sm:text-3xl font-black tabular-nums font-mono text-amber-950 dark:text-amber-50">{formatPKR(todayTotal)}</div>
          <p className="mt-1 text-xs font-medium text-amber-600/80 dark:text-amber-400/80">Outflow recorded today</p>
        </div>

        {/* This Month */}
        <div className="rounded-2xl p-5 border bg-rose-50/80 dark:bg-rose-950/30 border-rose-200/50 dark:border-rose-900/40 hover:border-rose-500 dark:hover:border-rose-400 transition-colors duration-300 ease-out relative">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300 truncate">
                This Month Total Expense
              </span>
              <CardInfoTooltip
                title="This Month Total Expense"
                urduDetail="Is poore maheenay mein dukan ke kul kitnay kharchay ho chukay hain."
              />
            </div>
            <div className="rounded-xl p-2 border shrink-0 bg-rose-100/90 dark:bg-rose-900/60 border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400">
              <TrendingDown className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl sm:text-3xl font-black tabular-nums font-mono text-rose-700 dark:text-rose-300">{formatPKR(monthTotal)}</div>
          <p className="mt-1 text-xs font-medium text-rose-600/80 dark:text-rose-400/80">Total overhead for current month</p>
        </div>

        {/* Total Records */}
        <div className="rounded-2xl p-5 border bg-blue-50/80 dark:bg-blue-950/30 border-blue-200/50 dark:border-blue-900/40 hover:border-blue-500 dark:hover:border-blue-400 transition-colors duration-300 ease-out relative">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 truncate">
                Total Expense Slips
              </span>
              <CardInfoTooltip
                title="Total Expense Slips"
                urduDetail="Ab tak kitni expense slips ya kharcha entries system mein darj hain."
              />
            </div>
            <div className="rounded-xl p-2 border shrink-0 bg-blue-100/90 dark:bg-blue-900/60 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400">
              <Receipt className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl sm:text-3xl font-black tabular-nums font-mono text-blue-950 dark:text-blue-50">{totalCount}</div>
          <p className="mt-1 text-xs font-medium text-blue-600/80 dark:text-blue-400/80">Logged expense slips</p>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => handleFilterCategory('')}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
            !selectedCategory
              ? 'bg-primary text-primary-foreground'
              : 'border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          All Categories
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => handleFilterCategory(cat.id)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              selectedCategory === cat.id
                ? 'bg-primary text-primary-foreground'
                : 'border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Expenses Table */}
      {expenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Receipt className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-foreground">No expenses recorded</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {selectedCategory ? 'No expenses match this category filter.' : 'Keep track of bills and petty cash easily.'}
          </p>
          {canCreate && !selectedCategory && (
            <button
              onClick={() => {
                setFormError(null);
                setIsAddModalOpen(true);
              }}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Record First Expense
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Category</th>
                  <th className="px-4 py-3 font-semibold">Description</th>
                  <th className="px-4 py-3 font-semibold">Method</th>
                  <th className="px-4 py-3 font-semibold text-right">Amount</th>
                  {canManage && <th className="px-4 py-3 font-semibold text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {expenses.map((expense) => (
                  <tr key={expense.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3.5 font-mono text-xs text-muted-foreground whitespace-nowrap">
                      {expense.expense_date}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
                        {expense.category?.name || 'General'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-foreground">
                      <div className="space-y-0.5">
                        {expense.description ? (
                          <div className="flex items-center gap-1.5 font-medium">
                            <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <span>{expense.description}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground/50">—</span>
                        )}
                        {expense.notes && (
                          <div className="text-[11px] text-muted-foreground pl-5">
                            Note: {expense.notes}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-xs">
                      <span className="inline-flex items-center gap-1 rounded bg-muted/60 px-2 py-0.5 font-mono text-[11px] text-muted-foreground uppercase">
                        <CreditCard className="h-3 w-3" />
                        {expense.payment_method?.replace('_', ' ') || 'cash'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-semibold text-rose-600 dark:text-rose-400 font-mono">
                      -{formatPKR(expense.amount)}
                    </td>
                    {canManage && (
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => {
                              setFormError(null);
                              setExpenseToEdit(expense);
                            }}
                            className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            title="Edit Expense"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setExpenseToDelete(expense)}
                            className="rounded p-1.5 text-muted-foreground hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 transition-colors"
                            title="Delete Expense"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
              <span>
                Page {currentPage} of {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => handlePageChange(currentPage - 1)}
                  className="inline-flex items-center gap-1 rounded border border-border px-2.5 py-1 font-medium hover:bg-muted disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Previous
                </button>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => handlePageChange(currentPage + 1)}
                  className="inline-flex items-center gap-1 rounded border border-border px-2.5 py-1 font-medium hover:bg-muted disabled:opacity-40"
                >
                  Next <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Record Expense Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">Record Expense</h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreate} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Amount (PKR) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  name="amount"
                  min="1"
                  step="any"
                  required
                  placeholder="e.g. 1500"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Category
                </label>
                <select
                  name="category_id"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">General / Uncategorized</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="expense_date"
                    required
                    defaultValue={new Date().toISOString().split('T')[0]}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Payment Method
                  </label>
                  <select
                    name="payment_method"
                    defaultValue="cash"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="cash">Cash</option>
                    <option value="easypaisa">EasyPaisa</option>
                    <option value="jazzcash">JazzCash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Description
                </label>
                <input
                  type="text"
                  name="description"
                  placeholder="e.g. Tea & snacks, Electricity bill, Cleaning..."
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Optional Notes
                </label>
                <textarea
                  name="notes"
                  rows={2}
                  placeholder="e.g. Bill reference # 491823, paid to landlord..."
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {isPending ? 'Saving...' : 'Record Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Expense Modal */}
      {expenseToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">Edit Expense</h2>
              <button
                onClick={() => setExpenseToEdit(null)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">
                {formError}
              </div>
            )}

            <form onSubmit={handleUpdate} className="mt-4 space-y-4">
              <input type="hidden" name="id" value={expenseToEdit.id} />

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Amount (PKR) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  name="amount"
                  min="1"
                  step="any"
                  required
                  defaultValue={toRupees(expenseToEdit.amount)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Category
                </label>
                <select
                  name="category_id"
                  defaultValue={expenseToEdit.category_id || ''}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">General / Uncategorized</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="expense_date"
                    required
                    defaultValue={expenseToEdit.expense_date}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Payment Method
                  </label>
                  <select
                    name="payment_method"
                    defaultValue={expenseToEdit.payment_method || 'cash'}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="cash">Cash</option>
                    <option value="easypaisa">EasyPaisa</option>
                    <option value="jazzcash">JazzCash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Description
                </label>
                <input
                  type="text"
                  name="description"
                  defaultValue={expenseToEdit.description || ''}
                  placeholder="e.g. Tea & snacks, Electricity bill..."
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Optional Notes
                </label>
                <textarea
                  name="notes"
                  rows={2}
                  defaultValue={expenseToEdit.notes || ''}
                  placeholder="e.g. Additional remarks or receipt voucher..."
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setExpenseToEdit(null)}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {isPending ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Add Category Modal */}
      {isAddCatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h2 className="text-base font-bold text-foreground">New Expense Category</h2>
              <button
                onClick={() => setIsAddCatModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleQuickAddCategory} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Category Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  required
                  placeholder="e.g. Utilities, Tea & Food, Rent"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddCatModalOpen(false)}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending || !newCatName.trim()}
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {isPending ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Expense Deletion */}
      <ConfirmationDialog
        open={!!expenseToDelete}
        onClose={() => setExpenseToDelete(null)}
        onConfirm={() => {
          if (expenseToDelete) executeDelete(expenseToDelete);
        }}
        title="Delete Expense Record?"
        description={`Are you sure you want to delete this expense record of ${expenseToDelete ? formatPKR(expenseToDelete.amount) : ''} (${expenseToDelete?.category?.name || 'General'})? This will be removed from financial outflow totals.`}
        confirmLabel="Delete Expense"
        variant="danger"
        loading={isPending}
      />
    </div>
  );
}
