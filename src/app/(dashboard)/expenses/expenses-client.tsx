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
} from 'lucide-react';
import type { Expense, ExpenseCategory, UserRole } from '@/lib/types';
import { formatPKR } from '@/lib/types';
import { createExpense, deleteExpense, createExpenseCategory } from './actions';
import { hasPermission } from '@/lib/permissions';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';

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
  const [expenseToDelete, setExpenseToDelete] = useState<(Expense & { category?: ExpenseCategory | null }) | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const canCreate = hasPermission(userRole, 'expenses:create');
  const canDelete = userRole === 'shop_owner' || userRole === 'manager';

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Expenses</h1>
          <p className="text-sm text-muted-foreground">
            Track daily operating costs, utility bills, rent, refreshments, and other overheads.
          </p>
        </div>

        {canCreate && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAddCatModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              <Tag className="h-4 w-4" />
              New Category
            </button>
            <button
              onClick={() => {
                setFormError(null);
                setIsAddModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Record Expense
            </button>
          </div>
        )}
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Today&apos;s Expenses</span>
            <div className="rounded-lg bg-amber-500/10 p-2 text-amber-500">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">{formatPKR(todayTotal)}</div>
          <p className="mt-1 text-xs text-muted-foreground">Outflow recorded today</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">This Month</span>
            <div className="rounded-lg bg-rose-500/10 p-2 text-rose-500">
              <TrendingDown className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">{formatPKR(monthTotal)}</div>
          <p className="mt-1 text-xs text-muted-foreground">Total overhead for current month</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Records</span>
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <Receipt className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">{totalCount}</div>
          <p className="mt-1 text-xs text-muted-foreground">Logged expense transactions</p>
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
              onClick={() => setIsAddModalOpen(true)}
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
                  <th className="px-4 py-3 font-semibold text-right">Amount</th>
                  {canDelete && <th className="px-4 py-3 font-semibold text-right">Action</th>}
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
                      {expense.description ? (
                        <div className="flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span>{expense.description}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right font-semibold text-rose-600 dark:text-rose-400">
                      -{formatPKR(expense.amount)}
                    </td>
                    {canDelete && (
                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() => setExpenseToDelete(expense)}
                          className="rounded p-1.5 text-muted-foreground hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 transition-colors"
                          title="Delete Expense"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
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
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl animate-in fade-in zoom-in-95">
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
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
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
                  Description / Note
                </label>
                <textarea
                  name="description"
                  rows={2}
                  placeholder="e.g. Tea for customers, electricity bill, shop cleaning..."
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

      {/* Quick Add Category Modal */}
      {isAddCatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl animate-in fade-in zoom-in-95">
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
        description={`Are you sure you want to delete this expense record of ${expenseToDelete ? formatPKR(expenseToDelete.amount) : ''} (${expenseToDelete?.category?.name || 'General'})?`}
        confirmLabel="Delete Expense"
        variant="danger"
        loading={isPending}
      />
    </div>
  );
}
